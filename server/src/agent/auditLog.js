// Standalone tool-call audit log for channels that bypass the Gemini loop (MCP and
// any future non-session channel). The WhatsApp / in-app agent already records each
// tool call against its assistant message via repo.appendAssistantMessage, so it does
// NOT use this — only callers that set `ctx.auditToolCalls` (see makeDispatcher) do.
// Writes are best-effort: a logging failure must never break the actual tool call.
import { query } from '../config/mysql.js';
import logger from '../../lib/logger.js';

// TEXT holds 64KB, but keep rows lean and human-readable. Args/results past this are
// truncated — the audit log is for "who called what, did it work", not full payloads.
const MAX_FIELD = 8000;

/** Stringify a value for storage, dropping bulky binary and capping length. */
function capJson(value) {
  if (value == null) return null;
  let json;
  try {
    json = JSON.stringify(value, (key, val) => {
      // Strip base64 image payloads (e.g. get_receipt_image's `image.data`) — the
      // bytes are huge and useless in an audit row; keep everything else.
      if (key === 'data' && typeof val === 'string' && val.length > 256) return '[bytes omitted]';
      return val;
    });
  } catch {
    json = String(value);
  }
  if (json.length > MAX_FIELD) json = `${json.slice(0, MAX_FIELD)}…[truncated]`;
  return json;
}

/**
 * Persist one tool invocation from a non-session channel. Best-effort: catches its
 * own errors and never throws.
 */
export async function logToolCall(
  { userId, channel, tool, args, result, status, errorText, durationMs },
  now = Date.now()
) {
  try {
    await query(
      `INSERT INTO tool_call_log
         (user_id, channel, tool_name, arguments, result, status, error_text, duration_ms, created_ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? 'unknown',
        channel ?? 'unknown',
        tool,
        capJson(args),
        capJson(result),
        status === 'error' ? 'error' : 'ok',
        errorText ? String(errorText).slice(0, MAX_FIELD) : null,
        durationMs ?? null,
        now,
      ]
    );
  } catch (err) {
    logger.warn('tool_call_log write failed', { tool, error: err.message });
  }
}
