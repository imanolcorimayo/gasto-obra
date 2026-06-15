// Self-issued HS256 JWT access tokens for the MCP OAuth server. No jsonwebtoken
// dependency — plain node:crypto HMAC, per the project's deps policy. The token IS
// the state: { sub: firebaseUid, ... } signed with OAUTH_JWT_SECRET. resolveUid()
// in httpRoute.js verifies the signature + expiry and reads `sub` — no DB lookup.
import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const b64urlJson = (obj) => b64url(JSON.stringify(obj));

function secret() {
  const s = process.env.OAUTH_JWT_SECRET;
  if (!s) throw new Error('OAUTH_JWT_SECRET no configurado');
  return s;
}

/** Sign an HS256 access token for a Firebase uid. Returns { token, expiresIn }. */
export function signAccessToken(uid, { issuer, clientId, resource, ttlSeconds = 3600 }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: issuer,
    sub: uid,
    aud: resource || issuer,
    client_id: clientId,
    iat: now,
    exp: now + ttlSeconds,
  };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig = b64url(crypto.createHmac('sha256', secret()).update(signingInput).digest());
  return { token: `${signingInput}.${sig}`, expiresIn: ttlSeconds };
}

/** Verify an HS256 token. Returns the payload, or null if invalid/expired. */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const expected = b64url(crypto.createHmac('sha256', secret()).update(`${h}.${p}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/** PKCE S256 check: base64url(sha256(verifier)) must equal the stored challenge. */
export function verifyPkce(codeVerifier, codeChallenge) {
  if (!codeVerifier || !codeChallenge) return false;
  const computed = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
