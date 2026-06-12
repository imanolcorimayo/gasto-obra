import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';

// The hand-rolled Gemini function-calling loop — the heart of the agent.
// One turn: send contents + tools → if the model returns functionCalls, execute
// them via dispatchTool, feed the results back, repeat until the model returns
// plain text (or MAX_ITERATIONS). Model rotation is abandoned once ANY tool has
// fired, so a transient retry can never double-execute a write.
//
// Implicit caching is automatic on Gemini for a stable prefix: keep the static
// persona in `systemInstruction` and the live/dynamic context at the TAIL of the
// last user turn (the caller's job) so the cached prefix stays byte-stable.

const AGENT_MODELS = [
  process.env.GEMINI_AGENT_MODEL || 'gemini-2.5-flash', // paid tier, primary
  'gemini-3.1-flash-lite',                              // fallback
];
const MAX_ITERATIONS = 12;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_DELAYS = [2000, 5000];

/**
 * Run one agent turn.
 *
 * @param {object}   opts
 * @param {string}   opts.systemInstruction  Static persona + rules (cacheable).
 * @param {Array}    opts.contents           Gemini `contents` (history + current turn, dynamic context at tail).
 * @param {Array}    opts.tools              [{ functionDeclarations: [...] }].
 * @param {Function} opts.dispatchTool       async (name, args) => result object (convention: { ok, ... }).
 * @param {string}   [opts.apiKey]
 * @param {number}   [opts.temperature]
 * @param {number}   [opts.maxOutputTokens]
 * @returns {Promise<{ replyText, timeline, modelUsed, usage, error }>}
 *   timeline: [{ tool, status:'ok'|'error', durationMs, args, result }]
 */
export async function runToolLoop({
  systemInstruction,
  contents,
  tools = [],
  dispatchTool,
  apiKey = process.env.GEMINI_API_KEY,
  temperature = 0.4,
  maxOutputTokens = 2000,
}) {
  const timeline = [];
  const workingContents = [...contents];
  let lockedModel = null; // set once a tool fires → no more rotation
  let usage = null;

  const sysParam = systemInstruction
    ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
    : {};

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const models = lockedModel ? [lockedModel] : AGENT_MODELS;
    const res = await callGemini({
      apiKey, models, contents: workingContents, tools, sysParam, temperature, maxOutputTokens,
    });

    if (res.error) {
      return { replyText: null, timeline, modelUsed: lockedModel, usage, error: res.error };
    }
    usage = res.usage || usage;

    const parts = res.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

    // No tool requested → the model produced its final text answer.
    if (functionCalls.length === 0) {
      const replyText = parts.filter((p) => p.text).map((p) => p.text).join('').trim();
      return { replyText, timeline, modelUsed: res.modelUsed, usage, error: null };
    }

    // A tool is about to fire — lock onto this model for the rest of the turn.
    lockedModel = res.modelUsed;

    // Echo the model's function-call turn back verbatim (keeps thoughtSignature).
    workingContents.push({ role: 'model', parts });

    const responseParts = [];
    for (const fc of functionCalls) {
      const started = Date.now();
      let result;
      try {
        result = await dispatchTool(fc.name, fc.args || {});
      } catch (err) {
        result = { ok: false, error: err.message };
        logger.warn('Agent tool threw', { tool: fc.name, error: err.message });
      }
      timeline.push({
        tool: fc.name,
        status: result && result.ok === false ? 'error' : 'ok',
        durationMs: Date.now() - started,
        args: fc.args || {},
        result,
      });
      responseParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }

    workingContents.push({ role: 'user', parts: responseParts });
  }

  logger.warn('Agent tool loop hit max iterations', { iterations: MAX_ITERATIONS });
  Sentry.captureMessage('Agent tool loop hit max iterations', { level: 'warning' });
  return { replyText: null, timeline, modelUsed: lockedModel, usage, error: 'max_iterations' };
}

/** Try the given models in order; return the first successful candidate or an error. */
async function callGemini({ apiKey, models, contents, tools, sysParam, temperature, maxOutputTokens }) {
  for (const model of models) {
    const result = await tryModel({ apiKey, model, contents, tools, sysParam, temperature, maxOutputTokens });
    if (result.error === 'rate_limit' || result.error === 'unavailable_503') {
      logger.info('Agent model rotating', { model, reason: result.error });
      continue;
    }
    if (result.error) return { error: result.error };
    return { content: result.content, usage: result.usage, modelUsed: model };
  }
  Sentry.captureMessage('All agent models exhausted', { level: 'warning' });
  return { error: 'rate_limit' };
}

/** Single request to one model, with 503 retry. Returns { content, usage } or { error }. */
async function tryModel({ apiKey, model, contents, tools, sysParam, temperature, maxOutputTokens }) {
  const body = {
    contents,
    ...(tools.length ? { tools } : {}),
    ...sysParam,
    generationConfig: { temperature, maxOutputTokens },
  };

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 429) {
          logger.warn('Agent Gemini 429 rate limited', { model });
          return { error: 'rate_limit' };
        }
        if (response.status === 503 && attempt < RETRY_DELAYS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        if (response.status === 503) return { error: 'unavailable_503' };
        const err = new Error(`Agent Gemini error: ${response.status}`);
        Sentry.captureException(err, { extra: { response: text, status: response.status, model } });
        logger.error('Agent Gemini error', { status: response.status, model, response: text });
        return { error: 'unavailable' };
      }

      const data = await response.json();
      return { content: data.candidates?.[0]?.content || null, usage: data.usageMetadata || null };
    } catch (error) {
      if (attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      Sentry.captureException(error, { extra: { model } });
      logger.error('Agent Gemini request failed', { model, error: error.message });
      return { error: 'unavailable' };
    }
  }
  return { error: 'unavailable' };
}
