-- OAuth 2.1 server state for the remote MCP endpoint (ChatGPT / Claude connectors).
-- Access tokens are self-issued HS256 JWTs (stateless, verified by signature — NOT
-- stored here). Only the stateful bits live in MySQL: dynamically-registered clients,
-- one-time authorization codes, and revocable refresh tokens. Epoch millis throughout.

-- Dynamically-registered clients (RFC 7591). Connectors self-register; we never
-- pre-provision them. Public clients (PKCE), so no client_secret column.
CREATE TABLE oauth_client (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     VARCHAR(64)  NOT NULL,
  client_name   VARCHAR(255) NULL,
  redirect_uris TEXT NOT NULL,             -- JSON array of allowed redirect URIs
  created_ts    BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Authorization codes: short-lived, single-use. Consumed (deleted) at /token.
-- Holds the PKCE challenge to verify the code_verifier presented at exchange.
CREATE TABLE oauth_auth_code (
  code           VARCHAR(64)  NOT NULL,
  client_id      VARCHAR(64)  NOT NULL,
  user_id        VARCHAR(128) NOT NULL,    -- Firebase UID resolved at login
  redirect_uri   VARCHAR(512) NOT NULL,
  code_challenge VARCHAR(128) NULL,        -- PKCE S256 challenge
  scope          VARCHAR(255) NULL,
  resource       VARCHAR(512) NULL,        -- RFC 8707 resource indicator (token aud)
  expires_ts     BIGINT UNSIGNED NOT NULL,
  created_ts     BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refresh tokens: long-lived, revocable. Access tokens are short-lived JWTs that
-- carry no server state, so revocation happens here (kill the refresh token).
CREATE TABLE oauth_refresh_token (
  token      VARCHAR(64)  NOT NULL,
  client_id  VARCHAR(64)  NOT NULL,
  user_id    VARCHAR(128) NOT NULL,
  scope      VARCHAR(255) NULL,
  resource   VARCHAR(512) NULL,
  revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  expires_ts BIGINT UNSIGNED NOT NULL,
  created_ts BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (token),
  KEY idx_refresh_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
