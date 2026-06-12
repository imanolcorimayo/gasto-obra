import { runToolLoop } from './loop.js';
import { TOOL_DECLARATIONS, makeDispatcher } from './tools.js';
import { buildSystemPrompt, buildContextBlock } from './prompt.js';
import { buildContents } from './contents.js';
import * as repo from './repo.js';
import logger from '../../lib/logger.js';

// The transport-agnostic agent core. Channel adapters (WhatsApp, in-app) resolve
// the user + active project, then call this with the user's text and a `context`
// object (live data + capability callbacks). The core owns sessions, history,
// the Gemini loop, and persistence — it knows nothing about WhatsApp or Firestore.

/**
 * Run one agent turn.
 * @param {object}   opts
 * @param {string}   opts.userId      Firebase UID.
 * @param {string}   opts.channel     'whatsapp' | 'app'.
 * @param {string}   opts.userText    The incoming message text.
 * @param {object}   opts.context     { today, activeProject, activeProjects, setActiveProject, ... }
 * @param {Array}    [opts.attachments]  Inline media for THIS turn: [{ mimeType, data }] (base64).
 * @param {boolean}  [opts.forceNewSession]  Open a fresh session instead of continuing the live one.
 * @returns {Promise<{ reply, sessionId, isNewSession, timeline, error }>}
 */
export async function runAgentTurn({ userId, channel, userText, context = {}, attachments = [], forceNewSession = false }) {
  const now = Date.now();
  const { session, isNew } = await repo.resolveOrCreateSession(userId, channel, now, forceNewSession);

  await repo.appendUserMessage(session.id, userText, now);

  const messages = await repo.getSessionMessages(session.id);
  const contents = buildContents(messages, buildContextBlock(context));

  // Media rides only on the LIVE turn — append the inline parts to the tail user
  // turn so the model sees the image/PDF/audio now, while stored history keeps just
  // the caption text. The base64 never reaches MySQL or replays on future turns.
  if (attachments.length) {
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        for (const a of attachments) {
          contents[i].parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
        }
        break;
      }
    }
  }

  const started = Date.now();
  const result = await runToolLoop({
    systemInstruction: buildSystemPrompt(),
    contents,
    tools: TOOL_DECLARATIONS,
    dispatchTool: makeDispatcher(context),
  });
  const latencyMs = Date.now() - started;

  const reply = result.replyText || 'Disculpá, no pude procesar eso. ¿Lo intentás de nuevo?';
  if (result.error) {
    logger.warn('Agent turn finished with error', { error: result.error, userId, channel, sessionId: session.id });
  }

  await repo.appendAssistantMessage(
    session.id,
    {
      content: reply,
      modelUsed: result.modelUsed,
      inputTokens: result.usage?.promptTokenCount,
      outputTokens: result.usage?.candidatesTokenCount,
      latencyMs,
      timeline: result.timeline,
    },
    Date.now()
  );

  return { reply, sessionId: session.id, isNewSession: isNew, timeline: result.timeline, error: result.error };
}

/**
 * Open a fresh empty session for (user, channel). The next turn within the TTL
 * resolves to it (most-recent wins), so the conversation effectively starts clean.
 * Used by channel "new conversation" commands (REPL /nuevo, WhatsApp NUEVO).
 */
export async function startFreshSession({ userId, channel }) {
  const { session } = await repo.resolveOrCreateSession(userId, channel, Date.now(), true);
  return session.id;
}
