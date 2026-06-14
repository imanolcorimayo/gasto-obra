// MCP server — STDIO transport. Exposes the agent's tools to a local MCP client
// (Claude Code on Linux; Claude Desktop on Mac/Windows). This is a SECOND faucet
// on the same tools.js registry the WhatsApp Gemini loop uses — Claude is the
// model here, so we skip core.js/loop.js and call the dispatcher directly.
//
// Run it from an MCP client, e.g.:
//   claude mcp add gasto-obra --env MCP_USER_UID=<your-firebase-uid> -- \
//     node /home/imanol/projects/wiseutils/gasto-obra/server/src/mcp/server.js
//
// Protocol logic lives in handler.js (shared with the HTTP transport, httpRoute.js);
// this file only does stdio framing + identity. Local stdio = the client spawns this
// as a child process, so there is no untrusted peer: identity is MCP_USER_UID, and
// every tool still enforces ownership by it (same IDOR guards as WhatsApp).
//
// Transport: JSON-RPC 2.0, newline-delimited, over stdin/stdout (MCP stdio transport).

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
const { handleMcpMessage, EXPOSED } = await import('./handler.js');

const uid = process.env.MCP_USER_UID || null;
if (!uid) {
  process.stderr.write('[mcp] WARNING: MCP_USER_UID is not set — tool calls will fail.\n');
}

function send(msg) {
  rpcWrite(JSON.stringify(msg) + '\n');
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
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    handleMcpMessage(msg, { uid })
      .then((res) => { if (res) send(res); })
      .catch((err) => process.stderr.write(`[mcp] handler error: ${err.stack || err.message}\n`));
  }
});

process.stdin.on('close', () => process.exit(0));

process.stderr.write(`[mcp] gasto-obra MCP server ready (stdio, uid=${uid || 'NONE'}, tools=${[...EXPOSED].join(',')})\n`);
