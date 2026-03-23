import GeminiHandler from '../../handlers/GeminiHandler.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import redis from '../../handlers/RedisHandler.js';
import { admin, db, bucket, COLLECTIONS } from '../../config/firebase.js';
import * as Sentry from '@sentry/node';
import * as respond from '../../responders/JsonResponder.js';
import logger from '../../../lib/logger.js';

const storageHandler = new StorageHandler(bucket);

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

function rateLimitKey(ip) {
  return `demo_limit:${ip}`;
}

async function consumeDemoUse(ip) {
  const result = await redis.incrementRateLimit(rateLimitKey(ip), DEMO_LIMIT, DEMO_WINDOW_SECONDS);
  if (!result) {
    Sentry.captureMessage('Redis unavailable for demo rate limit (increment)', { level: 'error' });
    return null;
  }
  return result;
}

async function getDemoLimitStatus(ip) {
  const result = await redis.getRateLimitStatus(rateLimitKey(ip), DEMO_LIMIT);
  if (!result) {
    Sentry.captureMessage('Redis unavailable for demo rate limit (status)', { level: 'error' });
    return null;
  }
  return result;
}

export async function DemoParseStatus(req, res) {
  const status = await getDemoLimitStatus(req.ip);
  if (!status) return res.json({ remaining: DEMO_LIMIT, limit: DEMO_LIMIT });
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

// ── Store demo submission (fire-and-forget) ──
const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/pdf': 'pdf',
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/aac': 'aac',
  'audio/flac': 'flac', 'audio/mp4': 'm4a',
};

function storeDemoSubmission({ type, text, base64, mimeType, success, reason, result }) {
  (async () => {
    try {
      let fileUrl = null;

      // Upload file to Storage if present
      if (base64 && mimeType) {
        const ext = MIME_TO_EXT[mimeType] || 'bin';
        const storagePath = storageHandler.generatePath('demo-submissions', `input.${ext}`);
        const buffer = Buffer.from(base64, 'base64');
        fileUrl = await storageHandler.uploadFile(buffer, storagePath, mimeType);
      }

      await db.collection(COLLECTIONS.DEMO_SUBMISSIONS).add({
        type,
        text: type === 'text' ? text : null,
        fileUrl,
        success,
        reason: reason || null,
        result: success ? {
          transactionType: result?.transactionType || null,
          title: result?.title || null,
          totalAmount: result?.totalAmount || null,
          category: result?.category || null,
        } : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.warn('Failed to store demo submission', { error: err.message });
    }
  })();
}

export async function DemoParseExpense(req, res) {
  const ip = req.ip;
  const status = await getDemoLimitStatus(ip);

  if (status && status.remaining <= 0) {
    return respond.error(res, 'Alcanzaste el límite de pruebas. Registrate para usar sin límites.', 429);
  }

  const { type, base64, mimeType, text } = req.body;

  if (!type || !['text', 'image', 'pdf', 'audio'].includes(type)) {
    return respond.error(res, 'Tipo inválido. Usar: text, image, pdf, audio');
  }

  if (type === 'text' && (!text || typeof text !== 'string' || !text.trim())) {
    return respond.error(res, 'Texto requerido');
  }

  if (type === 'text' && text.length > 500) {
    return respond.error(res, 'El texto supera el límite de 500 caracteres');
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
    // Count against limit BEFORE calling Gemini (prevents abuse with bad inputs)
    const updated = await consumeDemoUse(ip);

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
      storeDemoSubmission({ type, text, base64, mimeType, success: false, reason: 'question' });
      return res.status(422).json({ error: 'not_expense', reason: 'question' });
    }

    if (!aiResult || (!aiResult.totalAmount && (!aiResult.items || aiResult.items.length === 0))) {
      const reason = type === 'text' ? 'unrecognized_text' : type === 'audio' ? 'unrecognized_audio' : 'unrecognized_file';
      storeDemoSubmission({ type, text, base64, mimeType, success: false, reason });
      return res.status(422).json({ error: 'not_expense', reason });
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

    // Store submission (fire-and-forget)
    storeDemoSubmission({ type, text, base64, mimeType, success: true, result: aiResult });

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
      remaining: updated?.remaining ?? DEMO_LIMIT
    });
  } catch (error) {
    logger.error('Error in DemoParseExpense', { error: error.message, type });
    return respond.error(res, 'Error procesando el mensaje. Intentá de nuevo.', 500);
  }
}
