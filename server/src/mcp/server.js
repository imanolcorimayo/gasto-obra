// MCP server (stdio) — exposes the agent's READ-ONLY tools to an MCP client
// (Claude Code on Linux; Claude Desktop on Mac/Windows). This is a SECOND faucet
// on the same `tools.js` registry the WhatsApp Gemini loop uses — Claude is the
// model here, so we skip core.js/loop.js and call the dispatcher directly.
//
// Run it from an MCP client, e.g.:
//   claude mcp add gasto-obra --env MCP_USER_UID=<your-firebase-uid> -- \
//     node /home/imanol/projects/wiseutils/gasto-obra/server/src/mcp/server.js
//
// Tool exposure: read-only by default. Set MCP_ENABLE_WRITES=true to also expose
// create_project/update_project/record_expense/edit_expense/delete_expense.
//
// Auth model: stdio = the client spawns this as a LOCAL child process, so there
// is no untrusted network peer. Identity comes from MCP_USER_UID; every tool then
// enforces ownership by that uid (same IDOR guards as WhatsApp). A bearer/OAuth
// layer is only needed if this is ever exposed over remote HTTP.
//
// Protocol: JSON-RPC 2.0, newline-delimited, over stdin/stdout (MCP stdio transport).

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── stdout is SACRED ──────────────────────────────────────────────────────────
// Only JSON-RPC frames may go to stdout. winston's Console transport and Firebase's
// init log both write to stdout and would corrupt the stream — so reserve the real
// stdout for protocol writes and redirect everything else to stderr. This MUST run
// before importing anything that logs, hence the dynamic imports below.
const rpcWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (...args) => process.stderr.write(...args);

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load server/.env explicitly (cwd may not be the server dir when spawned by a client).
const { config } = await import('dotenv');
config({ path: join(__dirname, '../../.env') });

// Now safe to import the logging-on-init modules.
const { makeDispatcher, toMcpTools } = await import('../agent/tools.js');
const { getActiveProjects } = await import('../helpers/projects.js');

const SERVER_INFO = { name: 'gasto-obra', version: '0.1.0' };
const DEFAULT_PROTOCOL = '2025-06-18';

// Tool exposure is a deliberate whitelist (defense-in-depth — even if a client
// names a tool outside the set, we refuse it here, never reaching the dispatcher).
//   READ_ONLY  always exposed: discovery + reporting, never mutates.
//   WRITE      exposed only when MCP_ENABLE_WRITES=true. switch_project is
//              intentionally excluded — MCP is stateless, there is no active obra.
const READ_ONLY = new Set(['list_projects', 'get_summary', 'look_up_expenses']);
const WRITE = new Set(['create_project', 'update_project', 'record_expense', 'edit_expense', 'delete_expense']);

const WRITES_ENABLED = process.env.MCP_ENABLE_WRITES === 'true';
const EXPOSED = new Set([...READ_ONLY, ...(WRITES_ENABLED ? WRITE : [])]);

const uid = process.env.MCP_USER_UID || null;
if (!uid) {
  process.stderr.write('[mcp] WARNING: MCP_USER_UID is not set — tool calls will fail.\n');
}

function send(msg) {
  rpcWrite(JSON.stringify(msg) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

/** Build a fresh stateless ctx per call so newly created obras are always visible. */
async function buildContext() {
  const projects = (await getActiveProjects(uid)).map((p) => ({ id: p.id, name: p.name, tag: p.tag }));
  // No active project and no setActiveProject capability: MCP is stateless, so the
  // model passes an explicit projectId (it discovers ids via list_projects first).
  return { userId: uid, source: 'mcp', activeProjects: projects, activeProject: null };
}

async function handleToolCall(id, params) {
  const name = params?.name;
  const args = params?.arguments || {};

  if (!EXPOSED.has(name)) {
    // Surface as a tool error (not a protocol error) so the model can react.
    const why = WRITE.has(name) ? 'escritura deshabilitada (MCP_ENABLE_WRITES)' : 'no disponible por MCP';
    reply(id, { content: [{ type: 'text', text: `Tool ${why}: ${name}` }], isError: true });
    return;
  }
  if (!uid) {
    reply(id, { content: [{ type: 'text', text: 'Servidor sin MCP_USER_UID configurado.' }], isError: true });
    return;
  }

  try {
    const ctx = await buildContext();
    const dispatch = makeDispatcher(ctx);
    const result = await dispatch(name, args);
    reply(id, {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: result?.ok === false,
    });
  } catch (err) {
    process.stderr.write(`[mcp] tool ${name} threw: ${err.stack || err.message}\n`);
    reply(id, { content: [{ type: 'text', text: `Error interno: ${err.message}` }], isError: true });
  }
}

async function handle(msg) {
  // Notifications have no id and expect no response.
  const isNotification = msg.id === undefined || msg.id === null;

  switch (msg.method) {
    case 'initialize':
      reply(msg.id, {
        protocolVersion: msg.params?.protocolVersion || DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
      return;

    case 'notifications/initialized':
      return; // handshake done, nothing to send

    case 'ping':
      reply(msg.id, {});
      return;

    case 'tools/list':
      reply(msg.id, { tools: toMcpTools().filter((t) => EXPOSED.has(t.name)) });
      return;

    case 'tools/call':
      await handleToolCall(msg.id, msg.params);
      return;

    default:
      if (!isNotification) replyError(msg.id, -32601, `Método no soportado: ${msg.method}`);
      return;
  }
}

// ── stdin: newline-delimited JSON-RPC frames ──────────────────────────────────
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      replyError(null, -32700, 'Parse error');
      continue;
    }
    handle(msg).catch((err) => process.stderr.write(`[mcp] handler error: ${err.stack || err.message}\n`));
  }
});

process.stdin.on('close', () => process.exit(0));

process.stderr.write(
  `[mcp] gasto-obra MCP server ready (uid=${uid || 'NONE'}, writes=${WRITES_ENABLED ? 'ON' : 'off'}, tools=${[...EXPOSED].join(',')})\n`
);
