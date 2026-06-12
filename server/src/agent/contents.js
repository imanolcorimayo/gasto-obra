// Rebuild a session's transcript into Gemini `contents`.
//
// Tool calls are folded into the assistant turn as a TEXT ledger rather than
// replayed as native functionCall/functionResponse parts. Thinking models reject
// replayed function parts that are missing their thoughtSignature, and a text
// ledger is cross-model-safe — the agent reads what it already did and reuses ids
// without re-executing. (Native parts are only used live, within a single turn.)
//
// The dynamic context block is appended to the TAIL of the last user turn so the
// cacheable prefix (system prompt + tools + prior history) stays byte-stable.

export function buildContents(messages, contextBlock) {
  const contents = [];
  let lastUserIdx = -1;

  for (const m of messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
      lastUserIdx = contents.length - 1;
    } else {
      let text = m.content || '';
      if (m.toolCalls && m.toolCalls.length) {
        const ledger = m.toolCalls
          .map((c) => `- ${c.tool_name} ${c.arguments || '{}'} → ${c.result || 'null'}`)
          .join('\n');
        text = (text ? `${text}\n\n` : '') + `[Acciones que ya ejecutaste en este mensaje:\n${ledger}]`;
      }
      contents.push({ role: 'model', parts: [{ text: text || '(sin texto)' }] });
    }
  }

  if (contextBlock && lastUserIdx >= 0) {
    contents[lastUserIdx].parts.push({ text: `\n\n${contextBlock}` });
  }
  return contents;
}
