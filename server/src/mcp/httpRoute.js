// MCP server — HTTP transport (MCP Streamable HTTP, JSON-response subset).
// A mountable Express router that shares all protocol logic with the stdio
// transport via handler.js. The ONLY transport-specific concern here is identity:
// instead of an env uid, each request carries `Authorization: Bearer <token>`,
// which we resolve to a Firebase uid. This is the seam that becomes real auth —
// today a static token→uid map; later a Firestore lookup or OAuth, same shape.
//
// Mount it behind your tunnel, e.g. on the webhook app:  app.use('/mcp', mcpRouter)
// Register from the client:
//   claude mcp add --transport http gasto-obra https://<tunnel>/mcp \
//     --header "Authorization: Bearer <MCP_HTTP_TOKEN>"
//
// Env:
//   MCP_HTTP_TOKEN  shared secret the client must present as a bearer token.
//   MCP_USER_UID    the Firebase uid that token maps to (single-user experiment).

import express from 'express';
import { handleMcpMessage } from './handler.js';
import { verifyAccessToken } from './oauth/jwt.js';
import logger from '../../lib/logger.js';

/**
 * Resolve a bearer token to a Firebase uid. The real path is an OAuth-issued JWT
 * (see oauth/) — verify its signature + expiry and read `sub`. The static
 * MCP_HTTP_TOKEN/MCP_USER_UID pair is kept ONLY as a local dev backdoor for curl
 * testing; it is a no-op unless both env vars are set.
 */
function resolveUid(token) {
  if (!token) return null;
  if (process.env.MCP_HTTP_TOKEN && token === process.env.MCP_HTTP_TOKEN) {
    return process.env.MCP_USER_UID || null;
  }
  return verifyAccessToken(token)?.sub || null;
}

/** Public origin, for the WWW-Authenticate resource-metadata pointer. */
function baseUrl(req) {
  if (process.env.OAUTH_ISSUER) return process.env.OAUTH_ISSUER.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${req.headers.host}`;
}

function bearerFrom(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

export const mcpRouter = express.Router();

// Streamable HTTP: a client POSTs a JSON-RPC message (or a batch array). We reply
// with application/json — a single response, an array for a batch, or 202 (no body)
// when the body is only notifications/responses. Stateless: no Mcp-Session-Id.
mcpRouter.post('/', async (req, res) => {
  const uid = resolveUid(bearerFrom(req));
  if (!uid) {
    // Point the client at the protected-resource metadata so it can discover the
    // authorization server and run the OAuth flow (RFC 9728 / MCP auth spec).
    res.set('WWW-Authenticate', `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'No autorizado' } });
  }

  const body = req.body;
  const isBatch = Array.isArray(body);
  const messages = isBatch ? body : [body];

  try {
    const responses = [];
    for (const msg of messages) {
      const r = await handleMcpMessage(msg, { uid });
      if (r) responses.push(r);
    }
    // All notifications → nothing to return.
    if (responses.length === 0) return res.status(202).end();
    return res.json(isBatch ? responses : responses[0]);
  } catch (err) {
    logger.error('MCP HTTP handler error', { error: err.message });
    return res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Error interno' } });
  }
});

// Some clients probe GET (for a server→client SSE stream). We don't push server
// notifications, so advertise that explicitly instead of failing ambiguously.
mcpRouter.get('/', (_req, res) => res.status(405).set('Allow', 'POST').end());
