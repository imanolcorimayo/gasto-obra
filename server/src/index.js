import 'dotenv/config';
import express from 'express';
import { db, COLLECTIONS } from './config/firebase.js';
import logger from '../lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { GetProjectCategories } from './actions/categories/GetProjectCategories.js';
import { SendContactEmail } from './actions/contact/SendContactEmail.js';
import { ParseExpense } from './actions/expenses/ParseExpense.js';
import { DemoParseExpense, DemoParseStatus } from './actions/expenses/DemoParseExpense.js';
import redis from './handlers/RedisHandler.js';

redis.connect();

const app = express();
const PORT = process.env.API_PORT || 4002;
const APP_URL = process.env.APP_URL || 'https://gastoobra.com';

// ============================================
// Rate limiting (per IP, in-memory)
// ============================================
const rateLimits = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return next();
  }

  if (entry.count >= RATE_LIMIT) {
    logger.warn('Rate limit exceeded', { ip });
    return res.status(429).json({ error: 'Demasiadas solicitudes, intentá de nuevo en un momento' });
  }

  entry.count++;
  next();
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits.entries()) {
    if (now >= entry.resetAt) rateLimits.delete(ip);
  }
}, 5 * 60 * 1000);

// ============================================
// Middleware
// ============================================

app.use(express.json({ limit: '15mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Rate limiting
app.use(rateLimit);

// CORS — allow requests from the web frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [
    APP_URL,
    'https://gastoobra.com',
    'https://gastoobra.wiseutils.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    logger.warn('CORS rejected origin', { origin });
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    // Fetch provider display name
    let providerName = null;
    if (data.providerId) {
      const providerDoc = await db.collection(COLLECTIONS.PROVIDERS).doc(data.providerId).get();
      if (providerDoc.exists) {
        providerName = providerDoc.data().displayName?.split(' ')[0] || null;
      }
    }

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
      providerName,
    });
  } catch (error) {
    logger.error('Error in /api/project-preview', { error: error.message });
    res.status(500).json({ error: 'Error interno' });
  }
});

// Public POST endpoints
app.post('/api/contact', SendContactEmail);
app.get('/api/demo-parse/status', DemoParseStatus);
app.post('/api/demo-parse', DemoParseExpense);

// ============================================
// Authenticated routes
// ============================================

app.get('/api/projects/:projectId/categories', requireAuth, GetProjectCategories);
app.post('/api/parse-expense', requireAuth, ParseExpense);

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  logger.info('API server started', { port: PORT });
});
