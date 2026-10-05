import crypto from 'node:crypto';
import { admin } from '../config/firebase.js';
import logger from '../../lib/logger.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (error) {
    logger.warn('Invalid auth token', { error: error.message });
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Internal admin routes (the PHP admin dashboard). Static shared secret from
// ADMIN_API_TOKEN; routes are closed entirely while it is unset.
export function requireAdminToken(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const ok = expected && token.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'No autorizado' });
  next();
}
