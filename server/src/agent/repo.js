import { query } from '../config/mysql.js';

// Persistence for agentic-chat conversation state (MySQL). Sessions are bounded
// by a 2h inactivity gap; within a session we keep the whole transcript.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Return the live session for (user, channel) if its last activity is within the
 * 2h window; otherwise open a fresh one. `now` is epoch ms (passed in for testability).
 * `forceNew` always opens a fresh session (explicit "new conversation").
 */
export async function resolveOrCreateSession(userId, channel, now = Date.now(), forceNew = false) {
  if (!forceNew) {
    const rows = await query(
      'SELECT * FROM agent_session WHERE user_id = ? AND channel = ? ORDER BY updated_ts DESC LIMIT 1',
      [userId, channel]
    );
    const last = rows[0];
    if (last && now - Number(last.updated_ts) <= SESSION_TTL_MS) {
      return { session: last, isNew: false };
    }
  }
  const res = await query(
    'INSERT INTO agent_session (user_id, channel, created_ts, updated_ts) VALUES (?, ?, ?, ?)',
    [userId, channel, now, now]
  );
  return {
    session: { id: res.insertId, user_id: userId, channel, title: null, created_ts: now, updated_ts: now },
    isNew: true,
  };
}

/** All messages of a session (oldest first), each with its tool_call rows attached. */
export async function getSessionMessages(sessionId) {
  const messages = await query(
    'SELECT id, role, content, created_ts FROM agent_message WHERE session_id = ? ORDER BY created_ts ASC, id ASC',
    [sessionId]
  );
  if (messages.length === 0) return [];

  const ids = messages.map((m) => m.id);
  const placeholders = ids.map(() => '?').join(',');
  const calls = await query(
    `SELECT message_id, tool_name, arguments, result, status FROM tool_call
       WHERE message_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  const byMessage = new Map();
  for (const c of calls) {
    if (!byMessage.has(c.message_id)) byMessage.set(c.message_id, []);
    byMessage.get(c.message_id).push(c);
  }
  return messages.map((m) => ({ ...m, toolCalls: byMessage.get(m.id) || [] }));
}

/** Append a user message; sets the session title from the first one and touches updated_ts. */
export async function appendUserMessage(sessionId, content, now = Date.now()) {
  const res = await query(
    'INSERT INTO agent_message (session_id, role, content, created_ts) VALUES (?, ?, ?, ?)',
    [sessionId, 'user', content, now]
  );
  await query(
    'UPDATE agent_session SET updated_ts = ?, title = COALESCE(title, ?) WHERE id = ?',
    [now, content ? content.slice(0, 255) : null, sessionId]
  );
  return res.insertId;
}

/** Append the assistant reply plus a tool_call row per executed tool. */
export async function appendAssistantMessage(
  sessionId,
  { content, modelUsed, inputTokens, outputTokens, latencyMs, timeline = [] },
  now = Date.now()
) {
  const res = await query(
    `INSERT INTO agent_message
       (session_id, role, content, model_used, input_tokens, output_tokens, latency_ms, created_ts)
     VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?)`,
    [sessionId, content ?? null, modelUsed ?? null, inputTokens ?? null, outputTokens ?? null, latencyMs ?? null, now]
  );
  const messageId = res.insertId;

  for (const t of timeline) {
    await query(
      `INSERT INTO tool_call
         (message_id, tool_name, arguments, result, status, error_text, duration_ms, created_ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        t.tool,
        JSON.stringify(t.args ?? {}),
        JSON.stringify(t.result ?? null),
        t.status === 'error' ? 'error' : 'ok',
        t.result?.error ?? null,
        t.durationMs ?? null,
        now,
      ]
    );
  }

  await query('UPDATE agent_session SET updated_ts = ? WHERE id = ?', [now, sessionId]);
  return messageId;
}
