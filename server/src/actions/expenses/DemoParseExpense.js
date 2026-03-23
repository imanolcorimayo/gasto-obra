import GeminiHandler from '../../handlers/GeminiHandler.js';
import redis from '../../handlers/RedisHandler.js';
import * as respond from '../../responders/JsonResponder.js';
import logger from '../../../lib/logger.js';

const geminiHandler = new GeminiHandler(process.env.GEMINI_API_KEY);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 5 * 1024 * 1024;    // 5MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;  // 10MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VALID_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/mp4'];
const DEFAULT_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
const VALID_PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago'];

// ── Rate limiting ──
const DEMO_LIMIT = 5;
const DEMO_WINDOW_SECONDS = 60 * 60; // 1 hour

// In-memory fallback (used only when Redis is unavailable)
const fallbackLimits = new Map();

function rateLimitKey(ip) {
  return `demo_limit:${ip}`;
}

async function consumeDemoUse(ip) {
  // Try Redis first
  const redisResult = await redis.incrementRateLimit(rateLimitKey(ip), DEMO_LIMIT, DEMO_WINDOW_SECONDS);
  if (redisResult) return redisResult;

  // Fallback to in-memory
  const now = Date.now();
  const entry = fallbackLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    fallbackLimits.set(ip, { count: 1, resetAt: now + DEMO_WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: DEMO_LIMIT - 1, total: DEMO_LIMIT };
  }
  entry.count++;
  return { allowed: entry.count <= DEMO_LIMIT, remaining: Math.max(0, DEMO_LIMIT - entry.count), total: DEMO_LIMIT };
}

async function getDemoLimitStatus(ip) {
  // Try Redis first
  const redisResult = await redis.getRateLimitStatus(rateLimitKey(ip), DEMO_LIMIT);
  if (redisResult) return redisResult;

  // Fallback to in-memory
  const now = Date.now();
  const entry = fallbackLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    return { remaining: DEMO_LIMIT, total: DEMO_LIMIT };
  }
  return { remaining: Math.max(0, DEMO_LIMIT - entry.count), total: DEMO_LIMIT };
}

export async function DemoParseStatus(req, res) {
  const status = await getDemoLimitStatus(req.ip);
  return res.json({ remaining: status.remaining, limit: status.total });
}

// Minimal AI context — no user data, just defaults
const DEMO_CONTEXT = {
  activeProjects: [],
  categories: DEFAULT_CATEGORIES,
  recipients: [],
  paymentMethods: VALID_PAYMENT_METHODS,
  vendors: [],
  managementFeePercent: 0
};

export async function DemoParseExpense(req, res) {
  const ip = req.ip;
  const status = await getDemoLimitStatus(ip);

  if (status.remaining <= 0) {
    return respond.error(res, 'Alcanzaste el límite de pruebas. Registrate para usar sin límites.', 429);
  }

  const { type, base64, mimeType, text } = req.body;

  if (!type || !['text', 'image', 'pdf', 'audio'].includes(type)) {
    return respond.error(res, 'Tipo inválido. Usar: text, image, pdf, audio');
  }

  if (type === 'text' && (!text || typeof text !== 'string' || !text.trim())) {
    return respond.error(res, 'Texto requerido');
  }

  if (type !== 'text' && (!base64 || !mimeType)) {
    return respond.error(res, 'Archivo requerido (base64 y mimeType)');
  }

  // Validate file type and size
  if (type === 'image') {
    if (!VALID_IMAGE_TYPES.includes(mimeType)) {
      return respond.error(res, 'Formato de imagen no soportado. Usar: JPEG, PNG o WebP');
    }
    const sizeBytes = Buffer.byteLength(base64, 'base64');
    if (sizeBytes > MAX_IMAGE_SIZE) {
      return respond.error(res, 'La imagen supera el límite de 10MB');
    }
  }

  if (type === 'pdf') {
    if (mimeType !== 'application/pdf') {
      return respond.error(res, 'El archivo debe ser un PDF');
    }
    const sizeBytes = Buffer.byteLength(base64, 'base64');
    if (sizeBytes > MAX_PDF_SIZE) {
      return respond.error(res, 'El PDF supera el límite de 5MB');
    }
  }

  // Audio mimeType may include codec params (e.g., "audio/webm;codecs=opus")
  const audioBaseType = type === 'audio' && mimeType ? mimeType.split(';')[0].trim() : null;

  if (type === 'audio') {
    if (!audioBaseType || !VALID_AUDIO_TYPES.includes(audioBaseType)) {
      return respond.error(res, 'Formato de audio no soportado');
    }
    const sizeBytes = Buffer.byteLength(base64, 'base64');
    if (sizeBytes > MAX_AUDIO_SIZE) {
      return respond.error(res, 'El audio supera el límite de 10MB');
    }
  }

  try {
    let aiResult = null;

    if (type === 'text') {
      aiResult = await geminiHandler.parseTextExpense(text, DEMO_CONTEXT);
    }

    if (type === 'image') {
      aiResult = await geminiHandler.parseReceiptImage(base64, mimeType, DEMO_CONTEXT);
    }

    if (type === 'pdf') {
      aiResult = await geminiHandler.parseDocument(base64, 'application/pdf', DEMO_CONTEXT);
    }

    if (type === 'audio') {
      aiResult = await geminiHandler.transcribeAudio(base64, audioBaseType, DEMO_CONTEXT);
    }

    // Filter out support questions
    if (aiResult?.isSupportQuestion) {
      return respond.error(res, 'Eso parece una pregunta, no un gasto. Probá con algo como "500 clavos".', 422);
    }

    if (!aiResult || (!aiResult.totalAmount && (!aiResult.items || aiResult.items.length === 0))) {
      return respond.error(res, 'No se pudo extraer información. Probá con otra imagen o un texto más descriptivo.', 422);
    }

    // Build warnings
    const warnings = [];
    if (aiResult.items && aiResult.items.length > 1 && aiResult.totalAmount) {
      const itemsSum = aiResult.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const diff = Math.abs(itemsSum - aiResult.totalAmount);
      if (diff > 1) {
        warnings.push({
          type: 'items_mismatch',
          message: `La suma de items ($${itemsSum.toLocaleString('es-AR')}) no coincide con el total ($${aiResult.totalAmount.toLocaleString('es-AR')})`,
          itemsSum,
          total: aiResult.totalAmount,
          diff
        });
      }
    }

    // Only count against limit on successful parse
    const updated = await consumeDemoUse(ip);

    return respond.success(res, {
      parsed: {
        transactionType: aiResult.transactionType || 'expense',
        title: aiResult.title || null,
        items: aiResult.items || [],
        totalAmount: aiResult.totalAmount || 0,
        category: aiResult.category || null,
        paymentMethod: aiResult.paymentMethod || null,
        vendor: aiResult.vendor || aiResult.vendorName || null,
        transcription: aiResult.transcription || null,
      },
      warnings,
      remaining: updated.remaining
    });
  } catch (error) {
    logger.error('Error in DemoParseExpense', { error: error.message, type });
    return respond.error(res, 'Error procesando el mensaje. Intentá de nuevo.', 500);
  }
}
