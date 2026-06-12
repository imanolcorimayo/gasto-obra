-- Agentic chat: conversation state (the MySQL side of the hybrid store).
-- Domain data (expenses, projects, whatsappLinks) stays in Firestore behind tools.
-- Timestamps are epoch milliseconds (BIGINT) for unambiguous ordering.

CREATE TABLE agent_session (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    VARCHAR(128) NOT NULL,          -- Firebase UID (provider)
  channel    VARCHAR(16)  NOT NULL,          -- 'whatsapp' | 'app'
  title      VARCHAR(255) NULL,              -- derived from the first user message
  created_ts BIGINT UNSIGNED NOT NULL,
  updated_ts BIGINT UNSIGNED NOT NULL,       -- drives the 2h inactivity boundary
  PRIMARY KEY (id),
  KEY idx_session_lookup (user_id, channel, updated_ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_message (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id    BIGINT UNSIGNED NOT NULL,
  role          ENUM('user','assistant') NOT NULL,
  content       TEXT NULL,                   -- nullable for media-only turns
  model_used    VARCHAR(64) NULL,            -- assistant rows only
  input_tokens  INT UNSIGNED NULL,
  output_tokens INT UNSIGNED NULL,
  latency_ms    INT UNSIGNED NULL,
  created_ts    BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_message_session (session_id, created_ts),
  CONSTRAINT fk_message_session FOREIGN KEY (session_id)
    REFERENCES agent_session (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tool_call (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id  BIGINT UNSIGNED NOT NULL,      -- the assistant message that fired it
  tool_name   VARCHAR(64) NOT NULL,
  arguments   TEXT NULL,                     -- JSON
  result      TEXT NULL,                     -- JSON / free-form
  status      ENUM('ok','error') NOT NULL,
  error_text  TEXT NULL,
  duration_ms INT UNSIGNED NULL,
  created_ts  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_toolcall_message (message_id),
  CONSTRAINT fk_toolcall_message FOREIGN KEY (message_id)
    REFERENCES agent_message (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_message_media (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id   BIGINT UNSIGNED NOT NULL,
  kind         VARCHAR(16) NOT NULL,         -- 'image' | 'audio' | 'pdf'
  storage_path VARCHAR(512) NOT NULL,        -- Firebase Storage / Spaces / local path
  mime         VARCHAR(128) NULL,
  bytes        INT UNSIGNED NULL,
  duration_ms  INT UNSIGNED NULL,            -- audio
  created_ts   BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_media_message (message_id),
  CONSTRAINT fk_media_message FOREIGN KEY (message_id)
    REFERENCES agent_message (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
