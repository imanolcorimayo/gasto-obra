import 'dotenv/config';
import express from 'express';
import { db, COLLECTIONS } from './config/firebase.js';
import logger from '../lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { GetProjectCategories } from './actions/categories/GetProjectCategories.js';

const app = express();
const PORT = process.env.API_PORT || 4002;
const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';

// ============================================
// Middleware
// ============================================

app.use(express.json());

// CORS — allow requests from the web frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [APP_URL, 'http://localhost:3000', 'http://localhost:3001'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    logger.warn('CORS rejected origin', { origin });
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

// ============================================
// Routes
// ============================================

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Public endpoint: returns project preview by shareToken.
// Only exposes non-sensitive metadata (name, tag, address, status, dates, budget).
app.get('/api/project-preview/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const snapshot = await db
      .collection(COLLECTIONS.PROJECTS)
      .where('shareToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    res.json({
      id: doc.id,
      name: data.name,
      tag: data.tag || null,
      address: data.address || null,
      clientName: data.clientName || null,
      status: data.status || 'active',
      budget: data.budget || null,
      startDate: data.startDate?.toDate?.()?.toISOString() || null,
      estimatedEndDate: data.estimatedEndDate?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    logger.error('Error in /api/project-preview', { error: error.message });
    res.status(500).json({ error: 'Error interno' });
  }
});

// ============================================
// Authenticated routes
// ============================================

app.get('/api/projects/:projectId/categories', requireAuth, GetProjectCategories);

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  logger.info('API server started', { port: PORT });
});
