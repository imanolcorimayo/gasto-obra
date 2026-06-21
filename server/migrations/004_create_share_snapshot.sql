-- First USER-FACING MySQL table (001–003 are agent/logging/oauth state only).
-- A `share_snapshot` is a FROZEN, shareable artifact a provider hands to their client:
-- the whole-obra summary, a single movement, or a custom pick. Its content
-- is captured at share time in `payload` and rendered from that JSON alone — never
-- recomputed from Firestore, so editing a movement later does not change what the
-- client already received. Public read via /v/<slug>. Epoch millis throughout.
--
-- Conventions (match 001–003): `_ts` epoch-millis BIGINT, `{entity}_id`, singular name.
-- Introduces soft-delete (`archived_ts`): a provider can revoke a link and it vanishes
-- from their UI without losing the row. `user_id`/`project_id` are external ids
-- (Firebase UID / Firestore doc id), so no FOREIGN KEY constraint — naming only.
CREATE TABLE share_snapshot (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(16)  NOT NULL,          -- short base62, the public /v/<slug>
  user_id      VARCHAR(128) NOT NULL,          -- Firebase UID of the provider who shared
  project_id   VARCHAR(128) NOT NULL,          -- Firestore project doc id
  type         ENUM('summary','movement','custom') NOT NULL,
  payload      TEXT NOT NULL,                  -- JSON, the frozen render data (parsed in code)
  view_count   INT UNSIGNED NOT NULL DEFAULT 0,
  last_view_ts BIGINT UNSIGNED NULL,           -- last time the client opened it
  created_ts   BIGINT UNSIGNED NOT NULL,
  expires_ts   BIGINT UNSIGNED NULL,           -- housekeeping purge; NULL = no expiry
  archived_ts  BIGINT UNSIGNED NULL,           -- soft delete: provider revoked the link
  PRIMARY KEY (id),
  UNIQUE KEY uq_snapshot_slug (slug),
  KEY idx_snapshot_owner (user_id, created_ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
