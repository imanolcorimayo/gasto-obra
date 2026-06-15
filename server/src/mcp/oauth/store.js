// MySQL persistence for the OAuth server's stateful pieces: dynamically-registered
// clients, one-time auth codes, and revocable refresh tokens. Access tokens are
// stateless JWTs (see jwt.js) and are NOT stored here.
import crypto from 'node:crypto';
import { query } from '../../config/mysql.js';

const randToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

// ---- clients (Dynamic Client Registration, RFC 7591) ----

export async function createClient({ clientName, redirectUris }) {
  const clientId = randToken(16);
  await query(
    'INSERT INTO oauth_client (client_id, client_name, redirect_uris, created_ts) VALUES (?, ?, ?, ?)',
    [clientId, clientName ?? null, JSON.stringify(redirectUris || []), Date.now()]
  );
  return { clientId, redirectUris: redirectUris || [] };
}

export async function getClient(clientId) {
  const rows = await query(
    'SELECT client_id, client_name, redirect_uris FROM oauth_client WHERE client_id = ?',
    [clientId]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return { clientId: r.client_id, clientName: r.client_name, redirectUris: JSON.parse(r.redirect_uris || '[]') };
}

// ---- authorization codes (short-lived, single-use) ----

export async function createAuthCode({ clientId, userId, redirectUri, codeChallenge, scope, resource, ttlSeconds = 300 }) {
  const code = randToken(32);
  const now = Date.now();
  await query(
    `INSERT INTO oauth_auth_code
       (code, client_id, user_id, redirect_uri, code_challenge, scope, resource, expires_ts, created_ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, clientId, userId, redirectUri, codeChallenge ?? null, scope ?? null, resource ?? null, now + ttlSeconds * 1000, now]
  );
  return code;
}

/** Consume an auth code: delete it (single-use) and return its row, or null if absent/expired. */
export async function consumeAuthCode(code) {
  const rows = await query('SELECT * FROM oauth_auth_code WHERE code = ?', [code]);
  if (!rows.length) return null;
  // Atomic single-use gate: the conditional DELETE is the winner-takes-all. Two
  // concurrent /token requests can both SELECT the row, but only the one whose DELETE
  // actually removes it (affectedRows === 1) proceeds — the loser gets null. The
  // expiry check rides in the same statement so an expired code can never be redeemed.
  const del = await query('DELETE FROM oauth_auth_code WHERE code = ? AND expires_ts > ?', [code, Date.now()]);
  if (!del.affectedRows) return null;
  const r = rows[0];
  return {
    clientId: r.client_id,
    userId: r.user_id,
    redirectUri: r.redirect_uri,
    codeChallenge: r.code_challenge,
    scope: r.scope,
    resource: r.resource,
  };
}

// ---- refresh tokens (long-lived, revocable) ----

export async function createRefreshToken({ clientId, userId, scope, resource, ttlSeconds = 60 * 60 * 24 * 30 }) {
  const token = randToken(32);
  const now = Date.now();
  await query(
    `INSERT INTO oauth_refresh_token
       (token, client_id, user_id, scope, resource, expires_ts, created_ts)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [token, clientId, userId, scope ?? null, resource ?? null, now + ttlSeconds * 1000, now]
  );
  return token;
}

export async function getRefreshToken(token) {
  const rows = await query(
    'SELECT client_id, user_id, scope, resource, revoked, expires_ts FROM oauth_refresh_token WHERE token = ?',
    [token]
  );
  if (!rows.length) return null;
  const r = rows[0];
  if (r.revoked || Number(r.expires_ts) < Date.now()) return null;
  return { clientId: r.client_id, userId: r.user_id, scope: r.scope, resource: r.resource };
}

export async function revokeRefreshToken(token) {
  await query('UPDATE oauth_refresh_token SET revoked = 1 WHERE token = ?', [token]);
}
