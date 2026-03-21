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
