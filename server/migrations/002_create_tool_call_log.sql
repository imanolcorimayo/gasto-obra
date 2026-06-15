-- Tool-call audit log for non-session channels (MCP, and any future channel that
-- bypasses the Gemini loop in core.js). Those channels have no agent_session /
-- agent_message to hang a `tool_call` row off, so they were invisible until now.
-- WhatsApp / in-app keep logging against their assistant message (see tool_call)
-- and do NOT write here — this table is standalone, keyed directly on the user.
CREATE TABLE tool_call_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     VARCHAR(128) NOT NULL,          -- Firebase UID the call ran as
  channel     VARCHAR(16)  NOT NULL,          -- 'mcp' | 'cli' | ...  (ctx.source)
  tool_name   VARCHAR(64)  NOT NULL,
  arguments   TEXT NULL,                      -- JSON, size-capped
  result      TEXT NULL,                      -- JSON, size-capped, image bytes stripped
  status      ENUM('ok','error') NOT NULL,
  error_text  TEXT NULL,
  duration_ms INT UNSIGNED NULL,
  created_ts  BIGINT UNSIGNED NOT NULL,       -- epoch millis, matches the rest of the schema
  PRIMARY KEY (id),
  KEY idx_toolcalllog_user (user_id, created_ts),
  KEY idx_toolcalllog_tool (tool_name, created_ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
