// Transport-agnostic MCP protocol handler. Both transports — stdio (server.js)
// and HTTP (httpRoute.js) — share this; they differ ONLY in how they obtain the
// uid (env for local stdio, bearer token for remote HTTP) and how they move bytes.
// Mirrors the tools.js philosophy: the logic is channel/transport-agnostic, the
// edges build identity. Nothing here writes to any stream — it returns responses.

import { makeDispatcher, toMcpTools } from '../agent/tools.js';
import { getActiveProjects } from '../helpers/projects.js';
import logger from '../../lib/logger.js';

export const SERVER_INFO = { name: 'gasto-obra', version: '0.1.0' };
const DEFAULT_PROTOCOL = '2025-06-18';

// Deliberate whitelist (defense-in-depth — a client naming a tool outside this set
// is refused here, never reaching the dispatcher). switch_project is excluded
// because MCP is stateless: the model passes an explicit projectId instead.
export const EXPOSED = new Set([
  'list_projects', 'get_summary', 'look_up_expenses', 'get_receipt_image', 'list_items', // read
  'create_project', 'update_project', 'record_expense', 'edit_expense', 'delete_expense', // write
  'close_project', 'get_share_link', 'manage_item', 'manage_material', // write (obra config + sub-budgets)
]);

/** Build a fresh stateless ctx per call so newly created obras are always visible. */
async function buildContext(uid) {
  const projects = (await getActiveProjects(uid)).map((p) => ({ id: p.id, name: p.name, tag: p.tag }));
  // No active project and no setActiveProject capability: MCP is stateless, so the
  // model passes an explicit projectId (it discovers ids via list_projects first).
  // auditToolCalls: MCP has no agent_session to log against, so the dispatcher writes
  // each call to tool_call_log instead (see makeDispatcher / auditLog.js).
  return { userId: uid, source: 'mcp', activeProjects: projects, activeProject: null, auditToolCalls: true };
}

/** Execute a tools/call; returns the JSON-RPC `result` payload (content + isError). */
async function runTool(uid, params) {
  const name = params?.name;
  const args = params?.arguments || {};

  if (!EXPOSED.has(name)) {
    return { content: [{ type: 'text', text: `Tool no disponible por MCP: ${name}` }], isError: true };
  }
  if (!uid) {
    return { content: [{ type: 'text', text: 'Sin identidad: falta uid/credencial.' }], isError: true };
  }

  try {
    const ctx = await buildContext(uid);
    const dispatch = makeDispatcher(ctx);
    const result = await dispatch(name, args);

    // A tool may return an `image` ({ data, mimeType }) → render it as MCP image
    // content so the (multimodal) client model can see it; otherwise return JSON text.
    const content = result?.image
      ? [
          ...(result.title ? [{ type: 'text', text: `Comprobante: ${result.title}` }] : []),
          { type: 'image', data: result.image.data, mimeType: result.image.mimeType },
        ]
      : [{ type: 'text', text: JSON.stringify(result) }];

    return { content, isError: result?.ok === false };
  } catch (err) {
    logger.warn('MCP tool threw', { tool: name, error: err.message });
    return { content: [{ type: 'text', text: `Error interno: ${err.message}` }], isError: true };
  }
}

/**
 * Handle one JSON-RPC message. Returns the response object to send back, or null
 * for notifications (which expect no response). `uid` is resolved by the transport.
 */
export async function handleMcpMessage(msg, { uid } = {}) {
  const isNotification = msg?.id === undefined || msg?.id === null;
  const ok = (result) => ({ jsonrpc: '2.0', id: msg.id, result });

  switch (msg?.method) {
    case 'initialize':
      return ok({
        protocolVersion: msg.params?.protocolVersion || DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
      return null;

    case 'ping':
      return ok({});

    case 'tools/list':
      return ok({ tools: toMcpTools().filter((t) => EXPOSED.has(t.name)) });

    case 'tools/call':
      return ok(await runTool(uid, msg.params));

    default:
      if (isNotification) return null;
      return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Método no soportado: ${msg?.method}` } };
  }
}
