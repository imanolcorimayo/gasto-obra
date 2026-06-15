// OAuth 2.1 authorization server for the remote MCP endpoint (ChatGPT / Claude
// connectors). Mounted at the app root (so the /.well-known/* paths resolve), it
// exposes: discovery metadata, Dynamic Client Registration, the authorize/consent
// screen, the approve step (verifies a Firebase ID token), and the token endpoint.
//
// Flow: connector discovers metadata -> registers (DCR) -> opens /oauth/authorize
// -> user signs in with Google -> /oauth/authorize/approve mints an auth code ->
// connector exchanges it at /oauth/token (PKCE) for a JWT access token + refresh
// token. The MCP resource (httpRoute.js) then verifies the JWT to get the uid.
import express from 'express';
import { admin } from '../../config/firebase.js';
import logger from '../../../lib/logger.js';
import { signAccessToken, verifyPkce } from './jwt.js';
import {
  createClient, getClient,
  createAuthCode, consumeAuthCode,
  createRefreshToken, getRefreshToken, revokeRefreshToken,
} from './store.js';
import { renderLoginPage } from './loginPage.js';

export const oauthRouter = express.Router();

// The public origin this server is reached at. Prefer the explicit env (stable behind
// the tunnel / in prod); fall back to the forwarded request headers.
function baseUrl(req) {
  if (process.env.OAUTH_ISSUER) return process.env.OAUTH_ISSUER.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${req.headers.host}`;
}

// Permissive CORS for the machine-to-machine endpoints (metadata/register/token):
// some clients fetch these from a browser context. The interactive pages don't need it.
function cors(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// ---- discovery metadata ----

oauthRouter.get('/.well-known/oauth-authorization-server', cors, (req, res) => {
  const iss = baseUrl(req);
  res.json({
    issuer: iss,
    authorization_endpoint: `${iss}/oauth/authorize`,
    token_endpoint: `${iss}/oauth/token`,
    registration_endpoint: `${iss}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
  });
});

// Protected-resource metadata (RFC 9728): points the connector from the /mcp resource
// at this authorization server. The /mcp 401 references this document.
oauthRouter.get('/.well-known/oauth-protected-resource', cors, (req, res) => {
  const iss = baseUrl(req);
  res.json({
    resource: `${iss}/mcp`,
    authorization_servers: [iss],
  });
});

// ---- Dynamic Client Registration (RFC 7591) ----

oauthRouter.post('/oauth/register', cors, async (req, res) => {
  const body = req.body || {};
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (!redirectUris.length) {
    return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris es obligatorio' });
  }
  try {
    const { clientId } = await createClient({ clientName: body.client_name, redirectUris });
    return res.status(201).json({
      client_id: clientId,
      client_name: body.client_name,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
  } catch (err) {
    logger.error('DCR failed', { error: err.message });
    return res.status(500).json({ error: 'server_error' });
  }
});

// ---- authorization endpoint (consent screen) ----

oauthRouter.get('/oauth/authorize', async (req, res) => {
  const q = req.query;
  const client = q.client_id ? await getClient(String(q.client_id)) : null;

  // redirect_uri must be registered before we trust it enough to bounce errors back to it.
  if (!client || !client.redirectUris.includes(String(q.redirect_uri || ''))) {
    return res.status(400).send('client_id o redirect_uri inválido.');
  }
  // From here, parameter errors are returned to the client per OAuth (redirect with error).
  const back = (error, desc) => {
    const u = new URL(String(q.redirect_uri));
    u.searchParams.set('error', error);
    if (desc) u.searchParams.set('error_description', desc);
    if (q.state) u.searchParams.set('state', String(q.state));
    return res.redirect(u.toString());
  };
  if (q.response_type !== 'code') return back('unsupported_response_type');
  if (q.code_challenge_method !== 'S256' || !q.code_challenge) return back('invalid_request', 'PKCE S256 requerido');

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    logger.error('FIREBASE_WEB_API_KEY no configurado — no se puede mostrar el login');
    return res.status(500).send('Auth no configurado.');
  }
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderLoginPage({
    clientName: client.clientName,
    firebaseApiKey: apiKey,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    params: {
      client_id: q.client_id,
      redirect_uri: q.redirect_uri,
      state: q.state ?? null,
      code_challenge: q.code_challenge,
      scope: q.scope ?? 'mcp',
      resource: q.resource ?? null,
    },
  }));
});

// Approve step: the consent page POSTs a Firebase ID token + the OAuth params here.
// We verify the token server-side (-> uid), mint a one-time auth code, and return the
// redirect URL for the page to navigate to.
oauthRouter.post('/oauth/authorize/approve', async (req, res) => {
  const b = req.body || {};
  const client = b.client_id ? await getClient(String(b.client_id)) : null;
  if (!client || !client.redirectUris.includes(String(b.redirect_uri || ''))) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'client/redirect inválido' });
  }
  if (!b.idToken) return res.status(400).json({ error: 'invalid_request', error_description: 'falta idToken' });
  if (!b.code_challenge) return res.status(400).json({ error: 'invalid_request', error_description: 'falta code_challenge' });

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(String(b.idToken));
    uid = decoded.uid;
  } catch (err) {
    logger.warn('OAuth approve: ID token inválido', { error: err.message });
    return res.status(401).json({ error: 'access_denied', error_description: 'Sesión inválida' });
  }

  const code = await createAuthCode({
    clientId: client.clientId,
    userId: uid,
    redirectUri: String(b.redirect_uri),
    codeChallenge: String(b.code_challenge),
    scope: b.scope ? String(b.scope) : 'mcp',
    resource: b.resource ? String(b.resource) : null,
  });

  const u = new URL(String(b.redirect_uri));
  u.searchParams.set('code', code);
  if (b.state) u.searchParams.set('state', String(b.state));
  return res.json({ redirect: u.toString() });
});

// ---- token endpoint ----

const formBody = express.urlencoded({ extended: false }); // OAuth token requests are form-encoded

oauthRouter.post('/oauth/token', cors, formBody, async (req, res) => {
  // Token requests may arrive form-encoded (spec) or, from some clients, as JSON.
  const b = { ...(req.body || {}) };
  const iss = baseUrl(req);
  const fail = (status, error, desc) => res.status(status).json({ error, error_description: desc });

  try {
    if (b.grant_type === 'authorization_code') {
      const row = await consumeAuthCode(String(b.code || ''));
      if (!row) return fail(400, 'invalid_grant', 'Código inválido o expirado');
      if (row.clientId !== String(b.client_id)) return fail(400, 'invalid_grant', 'client_id no coincide');
      if (row.redirectUri !== String(b.redirect_uri)) return fail(400, 'invalid_grant', 'redirect_uri no coincide');
      if (!verifyPkce(String(b.code_verifier || ''), row.codeChallenge)) {
        return fail(400, 'invalid_grant', 'PKCE inválido');
      }
      return res.json(await issueTokens({ iss, clientId: row.clientId, userId: row.userId, scope: row.scope, resource: row.resource }));
    }

    if (b.grant_type === 'refresh_token') {
      const rt = await getRefreshToken(String(b.refresh_token || ''));
      if (!rt) return fail(400, 'invalid_grant', 'refresh_token inválido o revocado');
      if (rt.clientId !== String(b.client_id)) return fail(400, 'invalid_grant', 'client_id no coincide');
      // Rotate: revoke the used refresh token, issue a fresh pair.
      await revokeRefreshToken(String(b.refresh_token));
      return res.json(await issueTokens({ iss, clientId: rt.clientId, userId: rt.userId, scope: rt.scope, resource: rt.resource }));
    }

    return fail(400, 'unsupported_grant_type');
  } catch (err) {
    logger.error('Token endpoint error', { error: err.message });
    return fail(500, 'server_error');
  }
});

async function issueTokens({ iss, clientId, userId, scope, resource }) {
  const { token, expiresIn } = signAccessToken(userId, { issuer: iss, clientId, resource });
  const refreshToken = await createRefreshToken({ clientId, userId, scope, resource });
  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: scope || 'mcp',
  };
}
