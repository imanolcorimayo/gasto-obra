import crypto from 'crypto';
import { query } from '../config/mysql.js';

// Persistence for share_snapshot — frozen, slug-addressable artifacts a provider
// shares with their client (see migrations/004). Payload is stored as JSON-in-TEXT
// (matches the tool_call/oauth precedent) and parsed back on read.

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** A short, URL-friendly, unguessable slug. 7 base62 chars ≈ 3.5e12 keyspace. */
export function generateSlug(len = 7) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += BASE62[bytes[i] % 62];
  return out;
}

/**
 * Insert a snapshot, minting a fresh slug and retrying on the (rare) slug collision.
 * `payload` is any JSON-serializable object. Returns { id, slug }.
 */
export async function insertSnapshot(
  { userId, projectId, type, payload, expiresTs = null },
  now = Date.now()
) {
  const json = JSON.stringify(payload);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      const res = await query(
        `INSERT INTO share_snapshot (slug, user_id, project_id, type, payload, created_ts, expires_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [slug, userId, projectId, type, json, now, expiresTs]
      );
      return { id: res.insertId, slug };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') continue; // slug clash — try another
      throw err;
    }
  }
  throw new Error('No se pudo generar un slug único para el snapshot.');
}

/**
 * A live snapshot by slug: not archived, not expired. Returns null otherwise.
 * `payload` is parsed back into an object (null if it somehow fails to parse).
 */
export async function getSnapshotBySlug(slug, now = Date.now()) {
  const rows = await query(
    `SELECT id, slug, project_id, type, payload, view_count, created_ts, expires_ts
       FROM share_snapshot
      WHERE slug = ? AND archived_ts IS NULL AND (expires_ts IS NULL OR expires_ts > ?)
      LIMIT 1`,
    [slug, now]
  );
  const row = rows[0];
  if (!row) return null;
  let payload = null;
  try { payload = JSON.parse(row.payload); } catch { payload = null; }
  return { ...row, payload };
}

/** Best-effort view counter bump (call without awaiting on the read path). */
export async function bumpView(id, now = Date.now()) {
  await query(
    'UPDATE share_snapshot SET view_count = view_count + 1, last_view_ts = ? WHERE id = ?',
    [now, id]
  );
}

/**
 * Hard-delete snapshots past their expiry (and any soft-deleted long ago). Cheap
 * housekeeping so an auto-share-per-expense table stays bounded; run from the daily
 * cron. Returns the number of rows removed.
 */
export async function purgeExpiredSnapshots(now = Date.now()) {
  const res = await query(
    'DELETE FROM share_snapshot WHERE (expires_ts IS NOT NULL AND expires_ts <= ?) OR (archived_ts IS NOT NULL AND archived_ts <= ?)',
    [now, now]
  );
  return res.affectedRows || 0;
}

/** Soft-delete (revoke) a snapshot the user owns. Returns true if a row was archived. */
export async function archiveSnapshot(slug, userId, now = Date.now()) {
  const res = await query(
    'UPDATE share_snapshot SET archived_ts = ? WHERE slug = ? AND user_id = ? AND archived_ts IS NULL',
    [now, slug, userId]
  );
  return res.affectedRows > 0;
}
