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
 * @returns {Promise<{ reply, sessionId, isNewSession, timeline, error }>}
 */
export async function runAgentTurn({ userId, channel, userText, context = {} }) {
  const now = Date.now();
  const { session, isNew } = await repo.resolveOrCreateSession(userId, channel, now);

  await repo.appendUserMessage(session.id, userText, now);

  const messages = await repo.getSessionMessages(session.id);
  const contents = buildContents(messages, buildContextBlock(context));

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
