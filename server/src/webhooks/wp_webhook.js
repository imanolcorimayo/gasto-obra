import '../../lib/instrument.js';
import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import * as Sentry from '@sentry/node';
import { admin, db, bucket, COLLECTIONS } from '../config/firebase.js';
import GeminiHandler from '../handlers/GeminiHandler.js';
import StorageHandler from '../handlers/StorageHandler.js';
import { sendWhatsAppMessage, sendWhatsAppButtons, downloadWhatsAppMedia } from '../helpers/whatsapp.js';
import { compressImage } from '../helpers/compression.js';
import { PDFParse } from 'pdf-parse';
import { formatAmount, capitalizeFirst, stripHtml } from '../helpers/responseFormatter.js';
import logger from '../../lib/logger.js';

// ============================================
// Configuration
// ============================================
const app = express();
const PORT = process.env.PORT || 4001;
const VERIFY_TOKEN = process.env.WP_VERIFY_TOKEN || 'gasto_obra_verify';
const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';

// ============================================
// Default expense categories
// ============================================
const DEFAULT_EXPENSE_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
const VALID_PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago'];

// Fetch provider's custom categories (project-specific override global)
async function getProviderCategories(providerId, projectId = null) {
  try {
    // 1. Fetch project-specific categories
    let projectCats = [];
    if (projectId) {
      const projSnap = await db.collection('categories')
        .where('userId', '==', providerId)
        .where('projectId', '==', projectId)
        .get();
      projectCats = projSnap.docs.map(d => d.data());
    }

    // 2. Fetch global categories
    const globalSnap = await db.collection('categories')
      .where('userId', '==', providerId)
      .where('projectId', '==', null)
      .get();
    const globalCats = globalSnap.docs.map(d => d.data());

    // 3. If no custom categories at all, return defaults
    if (globalCats.length === 0 && projectCats.length === 0) {
      return DEFAULT_EXPENSE_CATEGORIES;
    }

    // 4. Merge: project overrides global by value
    const merged = [...globalCats];
    for (const pc of projectCats) {
      const idx = merged.findIndex(c => c.value === pc.value);
      if (idx !== -1) {
        merged[idx] = pc;
      } else {
        merged.push(pc);
      }
    }

    return merged.length > 0 ? merged.map(c => c.value) : DEFAULT_EXPENSE_CATEGORIES;
  } catch (error) {
    logger.error('Error fetching provider categories', { error });
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

// Fetch provider's recipients
async function getProviderRecipients(userId) {
  try {
    const snap = await db.collection(COLLECTIONS.RECIPIENTS)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    logger.error('Error fetching provider recipients', { error });
    return [];
  }
}

function vendorSlug(name) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

// Fetch provider's vendors
async function getProviderVendors(userId) {
  try {
    const snap = await db.collection(COLLECTIONS.VENDORS)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    logger.error('Error fetching provider vendors', { error });
    return [];
  }
}

// ============================================
// Transaction Type Helpers
// ============================================

function isGeminiError(result) {
  return result && typeof result === 'object' && result.error;
}

function getGeminiErrorMessage() {
  return `El servicio de procesamiento no está disponible en este momento.\n\nPodés registrar el gasto desde la app web: ${APP_URL}\n\nIntentá nuevamente en unos minutos.`;
}

function resolveTransactionType(aiType) {
  if (aiType && ['expense', 'payment', 'provider_expense'].includes(aiType)) return aiType;
  return null;
}

function getTypeDefaults(type) {
  if (type === 'payment') return { installmentPercent: null, category: 'pago' };
  if (type === 'provider_expense') return { installmentPercent: null };
  return { installmentPercent: 0 };
}

function getTypeLabel(type) {
  if (type === 'payment') return 'Cobro';
  if (type === 'provider_expense') return 'Gasto propio';
  return 'Gasto';
}

// Apply management fee to expense data when applicable
function applyFeeToExpenseData(expenseData, aiResult, linkData) {
  const feePercent = linkData.managementFeePercent || 0;
  if (feePercent > 0 && aiResult.applyManagementFee && expenseData.type === 'expense') {
    expenseData.amountBase = expenseData.amount;
    expenseData.managementFeePercent = feePercent;
    expenseData.amount = Math.round(expenseData.amount * (1 + feePercent / 100));
  } else {
    expenseData.amountBase = null;
    expenseData.managementFeePercent = null;
  }
}

// Check if items sum matches totalAmount and return warning if mismatch
function checkItemsTotalMismatch(items, totalAmount) {
  if (!items || items.length <= 1 || !totalAmount) return null;
  const itemsSum = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  if (itemsSum === 0) return null;
  const diff = Math.abs(totalAmount - itemsSum);
  // Allow small rounding tolerance (1 unit)
  if (diff <= 1) return null;
  return { itemsSum, totalAmount, diff };
}

// ============================================
// Gemini Handler
// ============================================
const geminiHandler = process.env.GEMINI_API_KEY
  ? new GeminiHandler(process.env.GEMINI_API_KEY)
  : null;
const storageHandler = new StorageHandler(bucket);

// ============================================
// FAQ Cache (1 hour TTL)
// ============================================
const FAQ_CACHE_TTL = 60 * 60 * 1000;
let faqCache = null; // { data: [...], fetchedAt: timestamp }

async function getFaqData() {
  if (faqCache && (Date.now() - faqCache.fetchedAt < FAQ_CACHE_TTL)) {
    return faqCache.data;
  }
  try {
    const snapshot = await db.collection(COLLECTIONS.FAQ).get();
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        topic: d.topic,
        topicLabel: d.topicLabel,
        question: d.question,
        answer: stripHtml(d.answer)
      };
    });
    faqCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    logger.error('Error fetching FAQ data', { error });
    return faqCache?.data || [];
  }
}

// ============================================
// Pending Confirmations (2 min auto-confirm)
// ============================================
const CONFIRMATION_TTL = 2 * 60 * 1000; // 2 minutes
const pendingExpenses = new Map(); // phoneNumber -> { data, userId, timestamp, pendingConfirmation }

async function setPendingConfirmation(phoneNumber, userId, expenseData) {
  // Auto-confirm existing pending expense before setting a new one
  const existing = getPendingExpense(phoneNumber);
  if (existing && existing.pendingConfirmation) {
    try {
      await confirmPendingExpense(phoneNumber, existing);
    } catch (error) {
      Sentry.captureException(error);
      logger.error('Error auto-confirming previous expense', { error, phoneNumber });
    }
  }

  const timestamp = Date.now();
  pendingExpenses.set(phoneNumber, {
    data: expenseData,
    userId,
    timestamp,
    pendingConfirmation: true
  });
  // Auto-confirm after TTL
  setTimeout(async () => {
    const pending = pendingExpenses.get(phoneNumber);
    if (pending && pending.pendingConfirmation && pending.timestamp === timestamp) {
      try {
        await confirmPendingExpense(phoneNumber, pending);
      } catch (error) {
        Sentry.captureException(error);
        logger.error('Error auto-confirming expense', { error, phoneNumber });
      }
    }
  }, CONFIRMATION_TTL);
}

function getPendingExpense(phoneNumber) {
  const pending = pendingExpenses.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > CONFIRMATION_TTL) {
    pendingExpenses.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingExpense(phoneNumber) {
  pendingExpenses.delete(phoneNumber);
}

// ============================================
// Pending Project Selections (PROYECTO command)
// ============================================
const PROJECT_SELECTION_TTL = 2 * 60 * 1000; // 2 minutes
const pendingProjectSelections = new Map(); // phoneNumber -> { userId, projects, timestamp }

function setPendingProjectSelection(phoneNumber, userId, projects) {
  const timestamp = Date.now();
  pendingProjectSelections.set(phoneNumber, { userId, projects, timestamp });
  setTimeout(() => {
    const pending = pendingProjectSelections.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingProjectSelections.delete(phoneNumber);
    }
  }, PROJECT_SELECTION_TTL);
}

function getPendingProjectSelection(phoneNumber) {
  const pending = pendingProjectSelections.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > PROJECT_SELECTION_TTL) {
    pendingProjectSelections.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingProjectSelection(phoneNumber) {
  pendingProjectSelections.delete(phoneNumber);
}

// ============================================
// Pending Project Switch Expenses (2 min TTL, no auto-confirm)
// ============================================
const PROJECT_SWITCH_TTL = 2 * 60 * 1000; // 2 minutes
const pendingProjectSwitchExpenses = new Map(); // phoneNumber -> { userId, expenseData, detectedProject, timestamp }

function setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject) {
  const timestamp = Date.now();
  pendingProjectSwitchExpenses.set(phoneNumber, { userId, expenseData, detectedProject, timestamp });
  setTimeout(() => {
    const pending = pendingProjectSwitchExpenses.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingProjectSwitchExpenses.delete(phoneNumber);
    }
  }, PROJECT_SWITCH_TTL);
}

function getPendingProjectSwitchExpense(phoneNumber) {
  const pending = pendingProjectSwitchExpenses.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > PROJECT_SWITCH_TTL) {
    pendingProjectSwitchExpenses.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingProjectSwitchExpense(phoneNumber) {
  pendingProjectSwitchExpenses.delete(phoneNumber);
}

// ============================================
// Pending Resumen Selections (RESUMEN command)
// ============================================
const RESUMEN_SELECTION_TTL = 2 * 60 * 1000; // 2 minutes
const pendingResumenSelections = new Map(); // phoneNumber -> { project, expenses, timestamp }

function setPendingResumenSelection(phoneNumber, data) {
  const timestamp = Date.now();
  pendingResumenSelections.set(phoneNumber, { ...data, timestamp });
  setTimeout(() => {
    const pending = pendingResumenSelections.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingResumenSelections.delete(phoneNumber);
    }
  }, RESUMEN_SELECTION_TTL);
}

function getPendingResumenSelection(phoneNumber) {
  const pending = pendingResumenSelections.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > RESUMEN_SELECTION_TTL) {
    pendingResumenSelections.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingResumenSelection(phoneNumber) {
  pendingResumenSelections.delete(phoneNumber);
}

// ============================================
// Pending Support Detection (auto-detected support question)
// ============================================
const SUPPORT_TTL = 2 * 60 * 1000;
const pendingSupportRequests = new Map(); // phoneNumber -> { originalText, timestamp }

function setPendingSupportRequest(phoneNumber, originalText) {
  const timestamp = Date.now();
  pendingSupportRequests.set(phoneNumber, { originalText, timestamp });
  setTimeout(() => {
    const pending = pendingSupportRequests.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingSupportRequests.delete(phoneNumber);
    }
  }, SUPPORT_TTL);
}

function getPendingSupportRequest(phoneNumber) {
  const pending = pendingSupportRequests.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > SUPPORT_TTL) {
    pendingSupportRequests.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingSupportRequest(phoneNumber) {
  pendingSupportRequests.delete(phoneNumber);
}

// ============================================
// AI Support Sessions (persistent multi-turn support)
// ============================================
const AI_SUPPORT_SESSION_TTL = 5 * 60 * 1000;   // 5 min auto-end
const AI_SUPPORT_WARNING_TTL = 2 * 60 * 1000;    // 2 min warning
const pendingAISupportSessions = new Map();
// phoneNumber → {
//   timestamp,
//   previousQA: [{ question, answer }],
//   lastQueryId: string|null,
//   warningTimerId: number,
//   expiryTimerId: number
// }

function createAISupportSession(phoneNumber) {
  clearAISupportSession(phoneNumber);
  const session = {
    timestamp: Date.now(),
    previousQA: [],
    lastQueryId: null,
    warningTimerId: null,
    expiryTimerId: null
  };
  pendingAISupportSessions.set(phoneNumber, session);
  resetSessionTimers(phoneNumber);
  return session;
}

function getAISupportSession(phoneNumber) {
  return pendingAISupportSessions.get(phoneNumber) || null;
}

function clearAISupportSession(phoneNumber) {
  const session = pendingAISupportSessions.get(phoneNumber);
  if (session) {
    if (session.warningTimerId) clearTimeout(session.warningTimerId);
    if (session.expiryTimerId) clearTimeout(session.expiryTimerId);
    pendingAISupportSessions.delete(phoneNumber);
  }
}

function resetSessionTimers(phoneNumber) {
  const session = pendingAISupportSessions.get(phoneNumber);
  if (!session) return;

  if (session.warningTimerId) clearTimeout(session.warningTimerId);
  if (session.expiryTimerId) clearTimeout(session.expiryTimerId);

  session.warningTimerId = setTimeout(async () => {
    const current = pendingAISupportSessions.get(phoneNumber);
    if (current === session) {
      try {
        await sendWhatsAppMessage(phoneNumber, 'El soporte se cerrará en 3 minutos.');
      } catch (err) {
        logger.error('Error sending session warning', { error: err });
      }
    }
  }, AI_SUPPORT_WARNING_TTL);

  session.expiryTimerId = setTimeout(() => {
    const current = pendingAISupportSessions.get(phoneNumber);
    if (current === session) {
      pendingAISupportSessions.delete(phoneNumber);
    }
  }, AI_SUPPORT_SESSION_TTL);
}

// ============================================
// Support Rate Limiting
// ============================================
const supportRateLimits = new Map(); // phoneNumber → { count, resetAt }
const SUPPORT_RATE_LIMIT = 10;
const SUPPORT_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkSupportRateLimit(phoneNumber) {
  const now = Date.now();
  const entry = supportRateLimits.get(phoneNumber);

  if (!entry || now >= entry.resetAt) {
    supportRateLimits.set(phoneNumber, { count: 1, resetAt: now + SUPPORT_RATE_WINDOW });
    return true;
  }

  if (entry.count >= SUPPORT_RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ============================================
// Onboarding Flow (unlinked users)
// ============================================
const ONBOARDING_TTL = 10 * 60 * 1000; // 10 minutes
const INACTIVE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
const pendingOnboarding = new Map(); // phoneNumber → { step, startedAt, data }

// Cleanup expired onboarding states every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [phone, state] of pendingOnboarding.entries()) {
    if (now - state.startedAt > ONBOARDING_TTL) {
      pendingOnboarding.delete(phone);
    }
  }
}, 60 * 1000);

function getOnboardingState(phoneNumber) {
  const state = pendingOnboarding.get(phoneNumber);
  if (!state) return null;
  if (Date.now() - state.startedAt > ONBOARDING_TTL) {
    pendingOnboarding.delete(phoneNumber);
    return null;
  }
  return state;
}

function clearOnboarding(phoneNumber) {
  pendingOnboarding.delete(phoneNumber);
}

async function startOnboarding(phoneNumber) {
  const state = { step: 'role_selection', startedAt: Date.now(), data: {} };
  pendingOnboarding.set(phoneNumber, state);

  await sendWhatsAppButtons(
    phoneNumber,
    '¡Hola! 👋 Soy el bot de Gasto Obra. Veo que tu número no está vinculado todavía.\n\n¿Sos proveedor o cliente?',
    [
      { id: 'onboarding_provider', title: 'Soy proveedor' },
      { id: 'onboarding_client', title: 'Soy cliente' }
    ]
  );
}

async function handleOnboardingStep(phoneNumber, text) {
  const state = getOnboardingState(phoneNumber);
  if (!state) return false;

  const normalizedText = text.trim().toLowerCase();

  if (state.step === 'role_selection') {
    if (['soy proveedor', 'proveedor'].includes(normalizedText)) {
      state.step = 'provider_instructions';
      state.startedAt = Date.now();

      await sendWhatsAppMessage(
        phoneNumber,
        `Para vincular tu cuenta como proveedor:\n` +
        `1. Ingresá a ${APP_URL} y registrate con Google\n` +
        `2. Andá a Configuración → WhatsApp\n` +
        `3. Copiá el código de vinculación\n` +
        `4. Mandame el código acá con: VINCULAR [código]\n\n` +
        `¿Necesitás ayuda con algún paso?`
      );
      return true;
    }

    if (['soy cliente', 'cliente'].includes(normalizedText)) {
      clearOnboarding(phoneNumber);

      await sendWhatsAppMessage(
        phoneNumber,
        'Como cliente, no necesitás vincular tu cuenta. Tu proveedor te va a compartir un link para que puedas ver los gastos de tu obra.\n\n' +
        'Si tu proveedor ya te pasó un link, podés acceder directamente desde ahí. Si tenés alguna duda, decile a tu proveedor que te comparta el enlace desde la app.'
      );
      return true;
    }

    // Unrecognized input → reprompt
    await sendWhatsAppButtons(
      phoneNumber,
      'No entendí tu respuesta. ¿Sos proveedor o cliente?',
      [
        { id: 'onboarding_provider', title: 'Soy proveedor' },
        { id: 'onboarding_client', title: 'Soy cliente' }
      ]
    );
    return true;
  }

  if (state.step === 'provider_instructions') {
    // If they send VINCULAR, let it fall through to normal command handling
    if (normalizedText.startsWith('vincular ')) {
      clearOnboarding(phoneNumber);
      return false; // Let processMessage handle the VINCULAR command
    }

    // Any other message → helpful reminder
    await sendWhatsAppMessage(
      phoneNumber,
      `Todavía no vinculaste tu cuenta. Seguí estos pasos:\n` +
      `1. Ingresá a ${APP_URL} y registrate con Google\n` +
      `2. Andá a Configuración → WhatsApp\n` +
      `3. Copiá el código de vinculación\n` +
      `4. Mandame el código acá con: VINCULAR [código]\n\n` +
      `Si ya tenés el código, mandame: VINCULAR [código]`
    );
    return true;
  }

  return false;
}

/**
 * Check if a phone number is linked. If not, starts onboarding.
 * Returns the link data if linked, or null if unlinked (onboarding started).
 * Also sends a returning user welcome if inactive for 7+ days.
 */
async function checkLinkedOrOnboard(phoneNumber) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (linkDoc.exists && linkDoc.data()?.status === 'linked') {
    const linkData = linkDoc.data();

    // Check for returning user (inactive 7+ days)
    const lastActivity = linkData.lastActivity?.toDate();
    const now = new Date();
    if (!lastActivity || (now - lastActivity) > INACTIVE_THRESHOLD) {
      await sendReturningUserWelcome(phoneNumber, linkData);
    } else {
      // Update lastActivity silently
      db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => logger.error('Error updating lastActivity', { error: err }));
    }

    return linkData;
  }
  // Not linked — start onboarding if not already in progress
  if (!getOnboardingState(phoneNumber)) {
    await startOnboarding(phoneNumber);
  } else {
    await handleOnboardingStep(phoneNumber, '');
  }
  return null;
}

// ============================================
// Returning User Welcome
// ============================================

async function sendReturningUserWelcome(phoneNumber, linkData) {
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;
  const projects = await getActiveProjects(userId);

  if (projects.length === 0) {
    await sendWhatsAppMessage(phoneNumber, `¡Hola! Todavía no tenés proyectos. Creá uno desde la app en ${APP_URL}`);
  } else if (projects.length === 1) {
    await sendWhatsAppMessage(phoneNumber, `¡Hola! Estás trabajando en *${projects[0].name}*. Contame qué gastaste.`);
  } else {
    const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
    const projectName = activeProject ? activeProject.name : projects[0].name;
    await sendWhatsAppMessage(phoneNumber, `¡Hola! Tenés ${projects.length} proyectos activos. Tu proyecto actual es *${projectName}*. Podés cambiar con PROYECTO.`);
  }

  // Update lastActivity
  await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({
    lastActivity: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================
// Middleware
// ============================================
app.use(express.json());

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

// GET - Health check
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// GET - Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Verification request received', { mode, token, challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed');
  return res.sendStatus(403);
});

// POST - Receive incoming messages
app.post('/webhook', async (req, res) => {
  logger.debug('Incoming webhook', { body: req.body });

  // Always respond 200 quickly
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      return;
    }

    const message = value.messages[0];
    const from = message.from;
    const contactName = value.contacts?.[0]?.profile?.name || 'Usuario';

    // Handle different message types
    if (message.type === 'text') {
      const messageText = message.text?.body || '';
      logger.info('Text message received', { from, contactName, messageText });
      await processMessage(from, messageText, contactName);
    } else if (message.type === 'image') {
      const caption = message.image?.caption || '';
      const imageId = message.image?.id;
      logger.info('Image message received', { from, contactName, caption });
      await processImageMessage(from, imageId, caption, contactName);
    } else if (message.type === 'audio') {
      const caption = message.audio?.caption || '';
      const audioId = message.audio?.id;
      logger.info('Audio message received', { from, contactName });
      await processAudioMessage(from, audioId, caption, contactName);
    } else if (message.type === 'document') {
      const caption = message.document?.caption || '';
      const documentId = message.document?.id;
      const documentMimeType = message.document?.mime_type || '';
      const filename = message.document?.filename || 'document.pdf';
      logger.info('Document message received', { from, contactName, filename, documentMimeType });

      if (documentMimeType !== 'application/pdf') {
        await sendWhatsAppMessage(from, 'Solo se aceptan documentos PDF. Para otros formatos, enviá una foto del documento.');
      } else {
        await processDocumentMessage(from, documentId, caption, filename, contactName);
      }
    } else if (message.type === 'interactive') {
      const buttonId = message.interactive?.button_reply?.id;
      const buttonTitle = message.interactive?.button_reply?.title || '';
      logger.info('Button reply received', { from, contactName, buttonId, buttonTitle });
      await processMessage(from, buttonTitle, contactName);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error processing webhook', { error });
  }
});

// ============================================
// Message Processing
// ============================================

async function processMessage(phoneNumber, text, contactName) {
  const normalizedText = text.trim().toLowerCase();

  // 1. Pending confirmation → si/no
  const pending = getPendingExpense(phoneNumber);
  if (pending && pending.pendingConfirmation) {
    if (['si', 'sí', 'ok', 'dale', 'yes', 'confirmar'].includes(normalizedText)) {
      await confirmPendingExpense(phoneNumber, pending);
      return;
    }
    if (['no', 'cancelar', 'cancel'].includes(normalizedText)) {
      clearPendingExpense(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, 'Gasto cancelado.');
      return;
    }
  }

  // 2. Pending project switch → si/no
  const pendingSwitch = getPendingProjectSwitchExpense(phoneNumber);
  if (pendingSwitch) {
    if (['si', 'sí', 'ok', 'dale', 'yes', 'confirmar'].includes(normalizedText)) {
      clearPendingProjectSwitchExpense(phoneNumber);
      const syntheticPending = { data: pendingSwitch.expenseData, userId: pendingSwitch.userId };
      await confirmPendingExpense(phoneNumber, syntheticPending);
      return;
    }
    if (['no', 'cancelar', 'cancel'].includes(normalizedText)) {
      clearPendingProjectSwitchExpense(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, 'Gasto cancelado.');
      return;
    }
  }

  // 3. Pending project selection → number
  const pendingSelection = getPendingProjectSelection(phoneNumber);
  if (pendingSelection) {
    const num = parseInt(normalizedText, 10);
    if (!isNaN(num) && num >= 1 && num <= pendingSelection.projects.length) {
      const selected = pendingSelection.projects[num - 1];
      clearPendingProjectSelection(phoneNumber);
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({ activeProjectId: selected.id });
      await sendWhatsAppMessage(phoneNumber, `Proyecto activo: *${selected.name}* (${selected.tag})`);
      return;
    }
  }

  // 4. Pending resumen selection
  const pendingResumen = getPendingResumenSelection(phoneNumber);
  if (pendingResumen) {
    if (normalizedText === '1' || normalizedText === 'global') {
      clearPendingResumenSelection(phoneNumber);
      await sendGlobalResumen(phoneNumber, pendingResumen);
      return;
    }
    if (normalizedText === '2' || normalizedText === 'semanal') {
      clearPendingResumenSelection(phoneNumber);
      await sendWeeklyResumen(phoneNumber, pendingResumen);
      return;
    }
    // Unrecognized input: clear state, fall through to normal routing
    clearPendingResumenSelection(phoneNumber);
  }

  // 5. Pending support detection → button response
  const pendingSupport = getPendingSupportRequest(phoneNumber);
  if (pendingSupport) {
    if (normalizedText === 'soporte ai') {
      clearPendingSupportRequest(phoneNumber);
      const session = createAISupportSession(phoneNumber);
      await handleAISupport(phoneNumber, pendingSupport.originalText, session);
      return;
    }
    if (normalizedText === 'registrar' || normalizedText === 'registrar gasto') {
      clearPendingSupportRequest(phoneNumber);
      await handleTextExpense(phoneNumber, pendingSupport.originalText, true);
      return;
    }
    clearPendingSupportRequest(phoneNumber);
  }

  // 6. Active AI support session
  const activeSession = getAISupportSession(phoneNumber);
  if (activeSession) {
    if (['listo, gracias', 'listo gracias', 'listo'].includes(normalizedText)) {
      clearAISupportSession(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, '¡Listo! Si necesitás algo más, escribí *AYUDA* cuando quieras.');
      return;
    }
    if (normalizedText === 'otra consulta') {
      resetSessionTimers(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, 'Escribí tu consulta y te ayudo.');
      return;
    }
    // Any other text → treat as support question
    await handleAISupport(phoneNumber, text, activeSession);
    return;
  }

  // 7. Onboarding flow (unlinked users)
  const onboardingState = getOnboardingState(phoneNumber);
  if (onboardingState) {
    const handled = await handleOnboardingStep(phoneNumber, text);
    if (handled) return;
    // If not handled (e.g. VINCULAR during onboarding), fall through
  }

  // 8. VINCULAR
  if (normalizedText.startsWith('vincular ')) {
    const code = text.trim().split(' ')[1]?.toUpperCase();
    await handleLinkCommand(phoneNumber, code, contactName);
    return;
  }

  // 9. DESVINCULAR
  if (normalizedText === 'desvincular') {
    await handleUnlinkCommand(phoneNumber);
    return;
  }

  // 10. AYUDA (2-step flow with buttons)
  if (normalizedText === 'ayuda' || normalizedText === 'help') {
    await sendWhatsAppButtons(
      phoneNumber,
      '¿En qué te puedo ayudar?',
      [
        { id: 'ayuda_comandos', title: 'Comandos' },
        { id: 'ayuda_soporte', title: 'Soporte AI' }
      ]
    );
    return;
  }

  // 9b. AYUDA button responses
  if (normalizedText === 'comandos') {
    await sendHelpMessage(phoneNumber);
    return;
  }
  if (normalizedText === 'soporte ai') {
    const supportReq = getPendingSupportRequest(phoneNumber);
    if (supportReq) {
      clearPendingSupportRequest(phoneNumber);
      const session = createAISupportSession(phoneNumber);
      await handleAISupport(phoneNumber, supportReq.originalText, session);
    } else {
      createAISupportSession(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, 'Escribí tu consulta y te ayudo.');
    }
    return;
  }

  // 10. PROYECTO / PROYECTOS
  if (normalizedText === 'proyecto' || normalizedText === 'proyectos') {
    await handleProyectoCommand(phoneNumber);
    return;
  }

  // 9. RESUMEN
  if (normalizedText === 'resumen' || normalizedText.startsWith('resumen ')) {
    await handleResumenCommand(phoneNumber);
    return;
  }

  // 10. Fallback → text expense (support detection happens inside)
  await handleTextExpense(phoneNumber, text);
}

// ============================================
// Image Message Processing
// ============================================

async function processImageMessage(phoneNumber, imageId, caption, contactName) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  let activeProjectId = linkData.activeProjectId || null;
  let activeProjects;

  if (!activeProjectId) {
    const result = await autoSelectProject(userId, phoneNumber);
    activeProjectId = result.project.id;
    activeProjects = result.activeProjects;
  } else {
    activeProjects = await getActiveProjects(userId);
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de imágenes no está disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando imagen...');

  const imageData = await downloadWhatsAppMedia(imageId);
  if (!imageData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar la imagen. Intentá nuevamente.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    caption,
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: linkData.managementFeePercent || 0
  };

  const receiptData = await geminiHandler.parseReceiptImage(imageData.base64, imageData.mimeType, context);
  if (isGeminiError(receiptData)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!receiptData || !receiptData.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el ticket. Intentá con una foto más clara o registrá el gasto manualmente.');
    return;
  }

  // Compress + upload image to Firebase Storage (non-fatal)
  let imageUrl = null;
  try {
    const compressed = await compressImage(imageData.base64, imageData.mimeType);
    if (compressed) {
      const storagePath = storageHandler.generatePath('expenses', 'receipt.jpg');
      imageUrl = await storageHandler.uploadFile(compressed.buffer, storagePath, compressed.mimeType);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading receipt image', { error });
  }

  const transactionType = resolveTransactionType(receiptData.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  const installmentPercent = receiptData.installmentPercent === 100 ? 100 : (typeDefaults.installmentPercent ?? 0);

  const vendor = receiptData.vendor || null;
  const title = vendor || (receiptData.items?.[0]?.name) || 'Ticket';
  const description = receiptData.items
    ? receiptData.items.map(i => typeof i === 'string' ? i : i.name).join(', ')
    : '';

  // Validate AI fields
  const paymentMethod = VALID_PAYMENT_METHODS.includes(receiptData.paymentMethod) ? receiptData.paymentMethod : null;

  let recipientName = null;
  let recipientBankInfo = null;
  let recipientPlatform = null;
  let recipientCuit = null;
  if (receiptData.recipientId) {
    const matched = recipients.find(r => r.id === receiptData.recipientId);
    if (matched) {
      recipientName = matched.name || null;
      recipientBankInfo = matched.bankInfo || null;
      recipientPlatform = matched.platform || null;
      recipientCuit = matched.cuit || null;
    }
  }

  const detectedProjectId = receiptData.projectId && activeProjects.some(p => p.id === receiptData.projectId)
    ? receiptData.projectId
    : null;

  let category = transactionType === 'payment' ? 'pago' : null;
  if (!category) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  const items = receiptData.items && receiptData.items.length > 0
    ? receiptData.items.map(i => typeof i === 'string' ? { name: i, amount: 0 } : { name: i.name || '', amount: i.amount || 0 })
    : null;

  const mismatch = checkItemsTotalMismatch(items, receiptData.totalAmount);

  // Project switching detection
  const isProjectSwitch = detectedProjectId && detectedProjectId !== activeProjectId;

  if (isProjectSwitch) {
    const detectedProject = activeProjects.find(p => p.id === detectedProjectId);
    const expenseData = {
      projectId: detectedProject.id,
      providerId: userId,
      title,
      description,
      amount: receiptData.totalAmount,
      category,
      type: transactionType,
      installmentPercent,
      paymentMethod,
      recipientName,
      recipientBankInfo,
      recipientPlatform,
      recipientCuit,
      vendor,
      linkedExpenseId: null,
      linkedPaymentId: null,
      items,
      imageUrl,
      audioUrl: null,
      audioTranscription: null,
      originalMessage: `[Imagen] ${caption}`,
      source: 'whatsapp',
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
      timestamp: Date.now()
    };

    applyFeeToExpenseData(expenseData, receiptData, linkData);
    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
    const switchBody = `${confirmMsg}\nEste gasto se guardaría en *${detectedProject.name}* (no tu proyecto activo).\n\nSi querés guardar automáticamente a este proyecto, usá el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Sí' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto activo. Enviá *PROYECTO* para seleccionar uno.');
    return;
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount: receiptData.totalAmount,
    category,
    type: transactionType,
    installmentPercent,
    paymentMethod,
    recipientName,
    recipientBankInfo,
    recipientPlatform,
    recipientCuit,
    vendor,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items,
    imageUrl,
    audioUrl: null,
    audioTranscription: null,
    originalMessage: `[Imagen] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  applyFeeToExpenseData(expenseData, receiptData, linkData);
  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

// ============================================
// Document (PDF) Message Processing
// ============================================

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PDF_PAGES = 5;

async function processDocumentMessage(phoneNumber, documentId, caption, filename, contactName) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  let activeProjectId = linkData.activeProjectId || null;
  let activeProjects;

  if (!activeProjectId) {
    const result = await autoSelectProject(userId, phoneNumber);
    activeProjectId = result.project.id;
    activeProjects = result.activeProjects;
  } else {
    activeProjects = await getActiveProjects(userId);
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de documentos no está disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando documento...');

  const documentData = await downloadWhatsAppMedia(documentId);
  if (!documentData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el documento. Intentá nuevamente.');
    return;
  }

  // Size check
  const pdfBuffer = Buffer.from(documentData.base64, 'base64');
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    await sendWhatsAppMessage(phoneNumber, `El documento es muy grande (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB). El máximo es ${MAX_PDF_SIZE / 1024 / 1024} MB.`);
    return;
  }

  // Page count check
  let pdfParser;
  try {
    pdfParser = new PDFParse({ data: pdfBuffer });
    const doc = await pdfParser.load();
    if (doc.numPages > MAX_PDF_PAGES) {
      await pdfParser.destroy();
      await sendWhatsAppMessage(phoneNumber, `El documento tiene ${doc.numPages} páginas. Solo se aceptan PDFs de hasta ${MAX_PDF_PAGES} páginas.`);
      return;
    }
    await pdfParser.destroy();
  } catch (error) {
    if (pdfParser) await pdfParser.destroy().catch(() => {});
    Sentry.captureException(error);
    logger.error('Error parsing PDF for page count', { error });
    await sendWhatsAppMessage(phoneNumber, 'No se pudo leer el PDF. Asegurate de que sea un archivo válido.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    caption,
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: linkData.managementFeePercent || 0
  };

  const documentResult = await geminiHandler.parseDocument(documentData.base64, 'application/pdf', context);
  if (isGeminiError(documentResult)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!documentResult || !documentResult.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el documento. Intentá con una foto del mismo o registrá el gasto manualmente.');
    return;
  }

  // Upload PDF to Firebase Storage (non-fatal)
  let fileUrl = null;
  try {
    const storagePath = storageHandler.generatePath('expenses', filename || 'document.pdf');
    fileUrl = await storageHandler.uploadFile(pdfBuffer, storagePath, 'application/pdf');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading PDF document', { error });
  }

  const transactionType = resolveTransactionType(documentResult.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  const installmentPercent = documentResult.installmentPercent === 100 ? 100 : (typeDefaults.installmentPercent ?? 0);

  const vendor = documentResult.vendor || null;
  const title = vendor || (documentResult.items?.[0]?.name) || 'Documento';
  const description = documentResult.items
    ? documentResult.items.map(i => typeof i === 'string' ? i : i.name).join(', ')
    : '';

  const paymentMethod = VALID_PAYMENT_METHODS.includes(documentResult.paymentMethod) ? documentResult.paymentMethod : null;

  let recipientName = null;
  let recipientBankInfo = null;
  let recipientPlatform = null;
  let recipientCuit = null;
  if (documentResult.recipientId) {
    const matched = recipients.find(r => r.id === documentResult.recipientId);
    if (matched) {
      recipientName = matched.name || null;
      recipientBankInfo = matched.bankInfo || null;
      recipientPlatform = matched.platform || null;
      recipientCuit = matched.cuit || null;
    }
  }

  const detectedProjectId = documentResult.projectId && activeProjects.some(p => p.id === documentResult.projectId)
    ? documentResult.projectId
    : null;

  let category = transactionType === 'payment' ? 'pago' : null;
  if (!category) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  const items = documentResult.items && documentResult.items.length > 0
    ? documentResult.items.map(i => typeof i === 'string' ? { name: i, amount: 0 } : { name: i.name || '', amount: i.amount || 0 })
    : null;

  const mismatch = checkItemsTotalMismatch(items, documentResult.totalAmount);

  // Project switching detection
  const isProjectSwitch = detectedProjectId && detectedProjectId !== activeProjectId;

  if (isProjectSwitch) {
    const detectedProject = activeProjects.find(p => p.id === detectedProjectId);
    const expenseData = {
      projectId: detectedProject.id,
      providerId: userId,
      title,
      description,
      amount: documentResult.totalAmount,
      category,
      type: transactionType,
      installmentPercent,
      paymentMethod,
      recipientName,
      recipientBankInfo,
      recipientPlatform,
      recipientCuit,
      vendor,
      linkedExpenseId: null,
      linkedPaymentId: null,
      items,
      imageUrl: null,
      audioUrl: null,
      audioTranscription: null,
      fileUrl,
      originalMessage: `[Documento] ${caption || filename}`,
      source: 'whatsapp',
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
      timestamp: Date.now()
    };

    applyFeeToExpenseData(expenseData, documentResult, linkData);
    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
    const switchBody = `${confirmMsg}\nEste gasto se guardaría en *${detectedProject.name}* (no tu proyecto activo).\n\nSi querés guardar automáticamente a este proyecto, usá el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Sí' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto activo. Enviá *PROYECTO* para seleccionar uno.');
    return;
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount: documentResult.totalAmount,
    category,
    type: transactionType,
    installmentPercent,
    paymentMethod,
    recipientName,
    recipientBankInfo,
    recipientPlatform,
    recipientCuit,
    vendor,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items,
    imageUrl: null,
    audioUrl: null,
    audioTranscription: null,
    fileUrl,
    originalMessage: `[Documento] ${caption || filename}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  applyFeeToExpenseData(expenseData, documentResult, linkData);
  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

// ============================================
// Audio Message Processing
// ============================================

async function processAudioMessage(phoneNumber, audioId, caption, contactName) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  let activeProjectId = linkData.activeProjectId || null;
  let activeProjects;

  if (!activeProjectId) {
    const result = await autoSelectProject(userId, phoneNumber);
    activeProjectId = result.project.id;
    activeProjects = result.activeProjects;
  } else {
    activeProjects = await getActiveProjects(userId);
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de audio no está disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando audio...');

  const audioData = await downloadWhatsAppMedia(audioId);
  if (!audioData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el audio. Intentá nuevamente.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: linkData.managementFeePercent || 0
  };

  const transcription = await geminiHandler.transcribeAudio(audioData.base64, audioData.mimeType, context);

  if (isGeminiError(transcription)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!transcription || (!transcription.totalAmount && !transcription.items?.length && !transcription.title)) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el audio. Intentá nuevamente o enviá una foto del ticket.');
    return;
  }

  // Upload audio to Firebase Storage (non-fatal)
  let audioUrl = null;
  try {
    const audioBuffer = Buffer.from(audioData.base64, 'base64');
    const ext = audioData.mimeType === 'audio/ogg' ? 'ogg' : 'audio';
    const storagePath = storageHandler.generatePath('expenses', `audio.${ext}`);
    audioUrl = await storageHandler.uploadFile(audioBuffer, storagePath, audioData.mimeType);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading audio file', { error });
  }

  const title = transcription.title || 'Gasto por audio';
  const items = Array.isArray(transcription.items) && transcription.items.length > 0
    ? transcription.items.filter(i => i && i.name && i.amount > 0)
    : null;
  const amount = items && items.length > 0
    ? items.reduce((sum, i) => sum + i.amount, 0)
    : (transcription.totalAmount || 0);
  const description = transcription.description || '';

  const transactionType = resolveTransactionType(transcription.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  const installmentPercent = transcription.installmentPercent === 100 ? 100 : (typeDefaults.installmentPercent ?? 0);

  if (amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, `Transcripción: "${transcription.transcription}"\n\nNo pude determinar el monto. Enviá una foto del ticket.`);
    return;
  }

  // Validate AI fields
  const vendor = transcription.vendor || null;
  const paymentMethod = VALID_PAYMENT_METHODS.includes(transcription.paymentMethod) ? transcription.paymentMethod : null;

  let recipientName = null;
  let recipientBankInfo = null;
  let recipientPlatform = null;
  let recipientCuit = null;
  if (transcription.recipientId) {
    const matched = recipients.find(r => r.id === transcription.recipientId);
    if (matched) {
      recipientName = matched.name || null;
      recipientBankInfo = matched.bankInfo || null;
      recipientPlatform = matched.platform || null;
      recipientCuit = matched.cuit || null;
    }
  }

  const detectedProjectId = transcription.projectId && activeProjects.some(p => p.id === transcription.projectId)
    ? transcription.projectId
    : null;

  let category = transactionType === 'payment' ? 'pago' : (transcription.category || null);
  if (category && category !== 'pago' && !providerCats.includes(category)) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }
  if (!category) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  // Project switching detection
  const isProjectSwitch = detectedProjectId && detectedProjectId !== activeProjectId;

  if (isProjectSwitch) {
    const detectedProject = activeProjects.find(p => p.id === detectedProjectId);
    const expenseData = {
      projectId: detectedProject.id,
      providerId: userId,
      title,
      description,
      amount,
      category,
      type: transactionType,
      installmentPercent,
      paymentMethod,
      recipientName,
      recipientBankInfo,
      recipientPlatform,
      recipientCuit,
      vendor,
      linkedExpenseId: null,
      linkedPaymentId: null,
      items: items || null,
      imageUrl: null,
      audioUrl,
      audioTranscription: transcription.transcription || null,
      originalMessage: `[Audio] ${caption}`,
      source: 'whatsapp',
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
      timestamp: Date.now()
    };

    applyFeeToExpenseData(expenseData, transcription, linkData);
    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaría en *${detectedProject.name}* (no tu proyecto activo).\n\nSi querés guardar automáticamente a este proyecto, usá el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Sí' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto activo. Enviá *PROYECTO* para seleccionar uno.');
    return;
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount,
    category,
    type: transactionType,
    installmentPercent,
    paymentMethod,
    recipientName,
    recipientBankInfo,
    recipientPlatform,
    recipientCuit,
    vendor,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items: items || null,
    imageUrl: null,
    audioUrl,
    audioTranscription: transcription.transcription || null,
    originalMessage: `[Audio] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  applyFeeToExpenseData(expenseData, transcription, linkData);
  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

// ============================================
// Text Message Expense Processing
// ============================================

async function handleTextExpense(phoneNumber, text, skipSupportDetection = false) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  let activeProjectId = linkData.activeProjectId || null;
  let activeProjects;

  if (!activeProjectId) {
    const autoResult = await autoSelectProject(userId, phoneNumber);
    activeProjectId = autoResult.project.id;
    activeProjects = autoResult.activeProjects;
  } else {
    activeProjects = await getActiveProjects(userId);
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de texto no está disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando mensaje...');

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: linkData.managementFeePercent || 0
  };

  const result = await geminiHandler.parseTextExpense(text, context);

  // Support detection on the single Gemini call result
  if (!skipSupportDetection && !isGeminiError(result) && result?.isSupportQuestion && (!result.totalAmount || result.totalAmount === 0)) {
    setPendingSupportRequest(phoneNumber, text);
    await sendWhatsAppButtons(
      phoneNumber,
      'Parece que tenés una consulta. ¿Querés que te ayude?',
      [
        { id: 'support_ai', title: 'Soporte AI' },
        { id: 'support_expense', title: 'Registrar' }
      ]
    );
    return;
  }

  if (isGeminiError(result)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }

  if (!result || !result.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el mensaje.\n\nPodés registrar gastos con un texto como:\n- "500 clavos"\n- "1500 cemento y 800 arena"\n- "me pagaron 5000 por transferencia"\n\nTambién podés enviar una *foto*, *audio* o *PDF*.\n\nEscribí *AYUDA* para más info.');
    return;
  }

  const title = result.title || result.items?.[0]?.name || 'Gasto por texto';
  const items = Array.isArray(result.items) && result.items.length > 0
    ? result.items.filter(i => i && i.name && i.amount > 0)
    : null;
  const amount = items && items.length > 0
    ? items.reduce((sum, i) => sum + i.amount, 0)
    : result.totalAmount;
  const description = result.description || '';

  const transactionType = resolveTransactionType(result.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  const installmentPercent = result.installmentPercent === 100 ? 100 : (typeDefaults.installmentPercent ?? 0);

  // Validate AI fields
  const vendor = result.vendor || null;
  const paymentMethod = VALID_PAYMENT_METHODS.includes(result.paymentMethod) ? result.paymentMethod : null;

  let recipientId = null;
  let recipientName = null;
  let recipientBankInfo = null;
  let recipientPlatform = null;
  let recipientCuit = null;
  if (result.recipientId) {
    const matched = recipients.find(r => r.id === result.recipientId);
    if (matched) {
      recipientId = matched.id;
      recipientName = matched.name || null;
      recipientBankInfo = matched.bankInfo || null;
      recipientPlatform = matched.platform || null;
      recipientCuit = matched.cuit || null;
    }
  }

  const detectedProjectId = result.projectId && activeProjects.some(p => p.id === result.projectId)
    ? result.projectId
    : null;

  let category = transactionType === 'payment' ? 'pago' : (result.category || null);
  if (category && category !== 'pago' && !providerCats.includes(category)) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }
  if (!category) {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  // Determine target project
  const targetProjectId = detectedProjectId || activeProjectId;
  const isProjectSwitch = detectedProjectId && detectedProjectId !== activeProjectId;

  if (isProjectSwitch) {
    const detectedProject = activeProjects.find(p => p.id === detectedProjectId);
    const expenseData = {
      projectId: detectedProject.id,
      providerId: userId,
      title,
      description,
      amount,
      category,
      type: transactionType,
      installmentPercent,
      paymentMethod,
      recipientName,
      recipientBankInfo,
      recipientPlatform,
      recipientCuit,
      vendor,
      linkedExpenseId: null,
      linkedPaymentId: null,
      items: items || null,
      imageUrl: null,
      audioUrl: null,
      audioTranscription: null,
      originalMessage: text,
      source: 'whatsapp',
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
      timestamp: Date.now()
    };

    applyFeeToExpenseData(expenseData, result, linkData);
    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaría en *${detectedProject.name}* (no tu proyecto activo).\n\nSi querés guardar automáticamente a este proyecto, usá el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Sí' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto activo. Enviá *PROYECTO* para seleccionar uno.');
    return;
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount,
    category,
    type: transactionType,
    installmentPercent,
    paymentMethod,
    recipientName,
    recipientBankInfo,
    recipientPlatform,
    recipientCuit,
    vendor,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items: items || null,
    imageUrl: null,
    audioUrl: null,
    audioTranscription: null,
    originalMessage: text,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  applyFeeToExpenseData(expenseData, result, linkData);
  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

function buildExpenseConfirmationMessage(data, mismatch = null) {
  const typeLabel = getTypeLabel(data.type);
  const formattedAmount = formatAmount(data.amount);
  let msg = `${typeLabel}: ${formattedAmount} - ${data.title}\n`;

  if (data.amountBase && data.managementFeePercent) {
    const feeAmount = data.amount - data.amountBase;
    msg += `  Base: ${formatAmount(data.amountBase)} + ${data.managementFeePercent}% gestión (${formatAmount(feeAmount)})\n`;
  }

  if (data.items && data.items.length > 1) {
    msg += data.items.map(i => `  - ${i.name}: ${formatAmount(i.amount)}`).join('\n') + '\n';
  }

  msg += `${capitalizeFirst(data.category)} - ${data.projectName}`;

  if (data.paymentMethod) {
    msg += `\nMétodo: ${capitalizeFirst(data.paymentMethod)}`;
  }
  if (data.vendor) {
    msg += `\nComercio: ${data.vendor}`;
  }
  if (data.recipientName) {
    msg += `\nDestinatario: ${data.recipientName}`;
  }
  if (data.installmentPercent >= 100) {
    msg += `\nEstado: Pagado`;
  }

  if (mismatch) {
    msg += `\n\n⚠️ La suma de items (${formatAmount(mismatch.itemsSum)}) no coincide con el total del comprobante (${formatAmount(mismatch.totalAmount)}). Diferencia: ${formatAmount(mismatch.diff)}. Verifica que los montos sean correctos.`;
  }

  return msg;
}

// ============================================
// Confirmation Handler
// ============================================

async function confirmPendingExpense(phoneNumber, pending) {
  clearPendingExpense(phoneNumber);

  const { data, userId } = pending;

  const expenseDoc = {
    projectId: data.projectId,
    providerId: userId,
    title: data.title,
    description: data.description || '',
    amount: data.amount,
    amountBase: data.amountBase || null,
    managementFeePercent: data.managementFeePercent || null,
    category: data.category,
    type: data.type || 'expense',
    installmentPercent: data.installmentPercent ?? null,
    paymentMethod: data.paymentMethod || null,
    recipientName: data.recipientName || null,
    recipientBankInfo: data.recipientBankInfo || null,
    recipientPlatform: data.recipientPlatform || null,
    recipientCuit: data.recipientCuit || null,
    linkedExpenseId: data.linkedExpenseId || null,
    linkedPaymentId: data.linkedPaymentId || null,
    items: data.items || null,
    imageUrl: data.imageUrl || null,
    audioUrl: data.audioUrl || null,
    audioTranscription: data.audioTranscription || null,
    fileUrl: data.fileUrl || null,
    vendor: data.vendor || null,
    originalMessage: data.originalMessage || '',
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const expenseRef = await db.collection(COLLECTIONS.EXPENSES).add(expenseDoc);

  // Auto-add new vendor to provider's vendor list (slug-based dedup)
  if (data.vendor) {
    try {
      const existingVendors = await getProviderVendors(userId);
      const newSlug = vendorSlug(data.vendor);
      const match = existingVendors.find(v => vendorSlug(v.name) === newSlug);
      if (match) {
        // Use existing vendor name to avoid duplicates
        expenseRef.update({ vendor: match.name });
      } else {
        await db.collection(COLLECTIONS.VENDORS).add({ userId, name: data.vendor });
      }
    } catch (e) {
      logger.error('Error auto-adding vendor', { error: e });
    }
  }

  // Create linked payment if fully paid
  if (data.installmentPercent >= 100 && (data.type === 'expense' || !data.type)) {
    const paymentDoc = {
      projectId: data.projectId,
      providerId: userId,
      title: `Pago: ${data.title}`,
      description: '',
      amount: data.amount,
      category: 'pago',
      type: 'payment',
      installmentPercent: null,
      paymentMethod: data.paymentMethod || null,
      recipientName: data.recipientName || null,
      recipientBankInfo: data.recipientBankInfo || null,
      recipientPlatform: data.recipientPlatform || null,
      recipientCuit: data.recipientCuit || null,
      linkedExpenseId: expenseRef.id,
      linkedPaymentId: null,
      items: null,
      imageUrl: null,
      audioUrl: null,
      audioTranscription: null,
      fileUrl: null,
      vendor: data.vendor || null,
      originalMessage: '',
      source: 'whatsapp',
      date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const paymentRef = await db.collection(COLLECTIONS.EXPENSES).add(paymentDoc);
    await expenseRef.update({ linkedPaymentId: paymentRef.id });
  }

  const formattedAmount = formatAmount(data.amount);
  const typeLabel = data.type === 'payment' ? 'Pago registrado' : data.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto registrado';

  await sendWhatsAppMessage(
    phoneNumber,
    `${typeLabel}!\n\n*${data.title}*\n${formattedAmount}\n${data.projectName} - ${capitalizeFirst(data.category)}\n${data.description ? `_${data.description}_` : ''}`
  );

}

// ============================================
// Command Handlers
// ============================================

async function handleLinkCommand(phoneNumber, code, contactName) {
  if (!code) {
    await sendWhatsAppMessage(phoneNumber, 'Formato incorrecto. Usá: VINCULAR <código>\n\nEjemplo: VINCULAR ABC123');
    return;
  }

  try {
    const codeDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).get();

    if (!codeDoc.exists) {
      await sendWhatsAppMessage(phoneNumber, 'Código no encontrado o expirado. Generá un nuevo código desde la app.');
      return;
    }

    const codeData = codeDoc.data();

    if (codeData.status !== 'pending') {
      await sendWhatsAppMessage(phoneNumber, 'Código no válido. Generá un nuevo código desde la app.');
      return;
    }

    // Check if expired (10 minutes)
    const createdAt = codeData.createdAt?.toDate() || new Date(0);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 10) {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).delete();
      await sendWhatsAppMessage(phoneNumber, 'El código ha expirado. Generá un nuevo código desde la app.');
      return;
    }

    // Delete pending code
    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).delete();

    // Create linked account, auto-set project if only 1
    const linkData = {
      status: 'linked',
      userId: codeData.userId,
      phoneNumber: phoneNumber,
      contactName: contactName,
      linkedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const activeProjects = await getActiveProjects(codeData.userId);
    if (activeProjects.length === 1) {
      linkData.activeProjectId = activeProjects[0].id;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).set(linkData);

    let message = 'Cuenta vinculada!\n\n';
    if (activeProjects.length === 1) {
      message += `Proyecto activo: *${activeProjects[0].name}* (${activeProjects[0].tag})\n\n`;
    }
    message += 'Enviá una foto, audio o PDF para registrar gastos.\nEnviá *PROYECTO* para cambiar de proyecto.\nEscribí *AYUDA* para más info.';

    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error linking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al vincular la cuenta. Intentá nuevamente.');
  }
}

async function handleUnlinkCommand(phoneNumber) {
  try {
    const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

    if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
      await sendWhatsAppMessage(phoneNumber, 'Este número no está vinculado a ninguna cuenta.');
      return;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).delete();

    await sendWhatsAppMessage(phoneNumber, 'Cuenta desvinculada exitosamente. Ya no se registrarán gastos desde este número.');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error unlinking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al desvincular la cuenta. Intentá nuevamente.');
  }
}

async function sendHelpMessage(phoneNumber) {
  const helpText = `*Gasto Obra - Ayuda*

*Registrar gastos:*
Enviá un *texto*, *foto*, *audio* o *PDF* y se registra en tu proyecto activo.

*Ejemplos de texto:*
- "500 clavos"
- "1500 cemento y 800 arena"
- "me pagaron 5000 por transferencia"
- "2000 pintura pagado por el cliente"

Podés incluir método de pago (efectivo, transferencia, tarjeta, mercadopago), destinatario, o mencionar otro proyecto en el mensaje.

*Comandos:*
*PROYECTO* - Seleccionar proyecto activo
*RESUMEN* - Resumen del proyecto activo
*AYUDA* - Ver este mensaje`;

  await sendWhatsAppMessage(phoneNumber, helpText);
}

const SUPPORT_PHONE = '5493513467739';
const SUPPORT_WA_LINK = `https://wa.me/${SUPPORT_PHONE}`;

async function handleAISupport(phoneNumber, question, session = null) {
  // Rate limit check
  if (!checkSupportRateLimit(phoneNumber)) {
    clearAISupportSession(phoneNumber);
    await sendWhatsAppMessage(
      phoneNumber,
      `Alcanzaste el límite de consultas por hora.\n\nPodés hablar con soporte directamente: ${SUPPORT_WA_LINK}`
    );
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El soporte AI no está disponible en este momento.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Buscando respuesta...');

  const faqData = await getFaqData();
  if (faqData.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No pude acceder a la información de soporte. Intentá más tarde.');
    return;
  }

  const conversationHistory = session?.previousQA?.slice(-3) || [];
  const result = await geminiHandler.answerSupportQuestion(question, faqData, conversationHistory);

  // Store the query for analytics with parentQueryId chain
  let queryDocId = null;
  try {
    const queryDoc = await db.collection(COLLECTIONS.SUPPORT_QUERIES).add({
      phoneNumber,
      question,
      answer: result?.answer || null,
      noAnswer: result?.noAnswer || false,
      error: isGeminiError(result) ? result.error : null,
      parentQueryId: session?.lastQueryId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    queryDocId = queryDoc.id;
  } catch (err) {
    logger.error('Error storing support query', { error: err });
  }

  if (isGeminiError(result)) {
    clearAISupportSession(phoneNumber);
    await sendWhatsAppMessage(
      phoneNumber,
      `El servicio de soporte no está disponible.\n\nPodés hablar con soporte directamente: ${SUPPORT_WA_LINK}`
    );
    return;
  }

  if (!result || result.noAnswer) {
    // Keep session active on noAnswer so user can ask something else
    await sendWhatsAppMessage(
      phoneNumber,
      `${result?.answer || 'No encontré una respuesta para tu consulta.'}\n\nSi necesitás más ayuda, podés hablar con soporte: ${SUPPORT_WA_LINK}`
    );
    // Update session with this Q&A
    if (session) {
      session.previousQA.push({ question, answer: result?.answer || '' });
      session.lastQueryId = queryDocId;
      resetSessionTimers(phoneNumber);
    }
    await sendWhatsAppButtons(phoneNumber, '¿Necesitás algo más?', [
      { id: 'support_otra', title: 'Otra consulta' },
      { id: 'support_listo', title: 'Listo, gracias' }
    ]);
    return;
  }

  await sendWhatsAppMessage(phoneNumber, result.answer);

  // Update/create session
  if (!session) {
    session = createAISupportSession(phoneNumber);
  }
  session.previousQA.push({ question, answer: result.answer });
  session.lastQueryId = queryDocId;
  resetSessionTimers(phoneNumber);

  await sendWhatsAppButtons(phoneNumber, '¿Necesitás algo más?', [
    { id: 'support_otra', title: 'Otra consulta' },
    { id: 'support_listo', title: 'Listo, gracias' }
  ]);
}

async function handleProyectoCommand(phoneNumber) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  try {
    const projects = await getActiveProjects(userId);

    // 0 or 1 project → auto-select (creates default if none exist)
    if (projects.length <= 1) {
      const result = await autoSelectProject(userId, phoneNumber);
      await sendWhatsAppMessage(phoneNumber, `Proyecto activo: *${result.project.name}* (${result.project.tag})`);
      return;
    }

    let message = 'Estos son tus proyectos, mandá el número que querés seleccionar:\n\n';
    projects.forEach((p, i) => {
      const active = p.id === activeProjectId ? ' (Actualmente activo)' : '';
      message += `${i + 1}. ${p.name} - ${p.tag}${active}\n`;
    });

    setPendingProjectSelection(phoneNumber, userId, projects);
    await sendWhatsAppMessage(phoneNumber, message.trim());
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error in PROYECTO command', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al obtener los proyectos.');
  }
}

async function handleResumenCommand(phoneNumber) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;

  let project = await resolveProject(userId, linkData.activeProjectId);
  if (!project) {
    const result = await autoSelectProject(userId, phoneNumber);
    project = result.project;
  }

  try {
    const expensesSnapshot = await db
      .collection(COLLECTIONS.EXPENSES)
      .where('projectId', '==', project.id)
      .get();

    if (expensesSnapshot.empty) {
      await sendWhatsAppMessage(phoneNumber, `*${project.name}*\n\nNo hay gastos registrados en este proyecto.`);
      return;
    }

    const expenses = expensesSnapshot.docs.map(doc => doc.data());

    // Cache data and show menu
    setPendingResumenSelection(phoneNumber, { project, expenses });

    const body = `📊 *Resumen - ${project.name}*\n\nSeleccioná una opción:\n1️⃣ *Global* - Resumen completo del proyecto\n2️⃣ *Semanal* - Gastos de esta semana día por día`;
    const buttons = [
      { id: 'resumen_global', title: 'Global' },
      { id: 'resumen_semanal', title: 'Semanal' },
    ];
    await sendWhatsAppButtons(phoneNumber, body, buttons);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error in RESUMEN command', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al obtener el resumen.');
  }
}

// ============================================
// Resumen Views
// ============================================

async function sendGlobalResumen(phoneNumber, pendingData) {
  const { project, expenses } = pendingData;

  const clientExpenses = expenses.filter(e => !e.type || e.type === 'expense');
  const payments = expenses.filter(e => e.type === 'payment');
  const providerExpenses = expenses.filter(e => e.type === 'provider_expense');

  const totalExpenses = clientExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPayments = payments.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProviderExpenses = providerExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalPayments - totalExpenses;

  // Group expenses by category (only regular expenses)
  const byCategory = {};
  clientExpenses.forEach(e => {
    const cat = e.category || 'otros';
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
  });

  const categoryLines = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => `  ${capitalizeFirst(cat)}: ${formatAmount(amount)}`)
    .join('\n');

  let message = `📊 *Resumen global - ${project.name}*\nTag: #${project.tag}`;
  if (project.clientName) message += `\nCliente: ${project.clientName}`;

  message += `\n\n*${clientExpenses.length} gastos registrados*`;
  message += `\n\n*Por categoría:*\n${categoryLines}`;
  message += `\n\n*Total gastos:* ${formatAmount(totalExpenses)}`;
  message += `\n*Pagos recibidos:* ${formatAmount(totalPayments)}`;
  message += `\n*Saldo:* ${formatAmount(balance)}`;

  if (providerExpenses.length > 0) {
    message += `\n\n*Gastos propios (${providerExpenses.length}):* ${formatAmount(totalProviderExpenses)}`;
  }

  message += `\n\n🔗 Ver detalle: ${APP_URL}`;
  message += `\n\n_Podés compartir este mensaje con tu cliente_`;

  await sendWhatsAppMessage(phoneNumber, message);
}

function getARTDate(date) {
  const artOffset = -3 * 60; // ART is UTC-3
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + artOffset * 60000);
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function sendWeeklyResumen(phoneNumber, pendingData) {
  const { project, expenses } = pendingData;

  const artNow = getARTDate(new Date());
  // Get Monday of current week
  const dayOfWeek = artNow.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday=6, Mon=0, Tue=1...
  const monday = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate() - mondayOffset);

  // Filter expenses for this week (Monday 00:00 ART to now)
  const weekExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const expDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
    const artExpDate = getARTDate(expDate);
    return artExpDate >= monday && artExpDate <= artNow;
  });

  if (weekExpenses.length === 0) {
    await sendWhatsAppMessage(phoneNumber, `📊 *Resumen semanal - ${project.name}*\n\nNo hay gastos esta semana.`);
    return;
  }

  // Group by ART day
  const byDay = {}; // 'YYYY-MM-DD' -> [expenses]
  weekExpenses.forEach(e => {
    const expDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
    const artDate = getARTDate(expDate);
    const key = `${artDate.getFullYear()}-${String(artDate.getMonth() + 1).padStart(2, '0')}-${String(artDate.getDate()).padStart(2, '0')}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e);
  });

  // Build day entries from Monday to today
  const daysWithExpenses = [];
  const daysWithout = [];
  let weekTotal = 0;

  for (let d = new Date(monday); d <= artNow; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = DAY_NAMES[d.getDay()];
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (byDay[key]) {
      let daySection = `*${dayName} ${dateStr}:*\n`;
      let subtotal = 0;
      byDay[key].forEach(e => {
        const amount = e.amount || 0;
        subtotal += amount;
        let prefix = '';
        if (e.type === 'payment') prefix = '💰 ';
        else if (e.type === 'provider_expense') prefix = '👤 ';

        const title = e.title || 'Sin título';
        const category = e.type !== 'payment' && e.category ? ` (${capitalizeFirst(e.category)})` : '';
        const vendorTag = e.vendor ? ` [${e.vendor}]` : '';
        daySection += `  ${prefix}${formatAmount(amount)} - ${title}${category}${vendorTag}\n`;
      });
      daySection += `  Subtotal: ${formatAmount(subtotal)}`;
      daysWithExpenses.push(daySection);
      weekTotal += subtotal;
    } else {
      daysWithout.push(dayName);
    }
  }

  const mondayStr = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${String(artNow.getDate()).padStart(2, '0')}/${String(artNow.getMonth() + 1).padStart(2, '0')}`;

  let message = `📊 *Resumen semanal - ${project.name}*\nSemana del ${mondayStr} al ${todayStr}\n\n`;
  message += daysWithExpenses.join('\n\n');

  if (daysWithout.length > 0) {
    message += `\n\n_${daysWithout.join(', ')}: Sin gastos_`;
  }

  message += `\n\n*Total de la semana:* ${formatAmount(weekTotal)}`;
  message += `\n\n🔗 Ver detalle: ${APP_URL}`;
  message += `\n\n_Podés compartir este mensaje con tu cliente_`;

  // WhatsApp message length safety
  if (message.length > 3800) {
    message = message.substring(0, 3750) + '\n... (ver más en la app)';
  }

  await sendWhatsAppMessage(phoneNumber, message);
}

// ============================================
// Helper Functions
// ============================================

async function resolveProject(userId, activeProjectId) {
  if (!activeProjectId) return null;
  const doc = await db.collection(COLLECTIONS.PROJECTS).doc(activeProjectId).get();
  if (!doc.exists) return null;
  const project = doc.data();
  if (project.status !== 'active' || project.providerId !== userId) return null;
  return { id: doc.id, ...project };
}

async function getActiveProjects(userId) {
  const snapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('providerId', '==', userId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Auto-selects a project when none is active:
 * - 0 projects → creates a default one
 * - 1 project → selects it
 * - N projects → selects the most recent by createdAt
 * Returns { project, activeProjects } or null on error.
 */
async function autoSelectProject(userId, phoneNumber) {
  let projects = await getActiveProjects(userId);

  // No projects → create a default one
  if (projects.length === 0) {
    const projectData = {
      name: 'Mi Obra',
      tag: 'miobra',
      providerId: userId,
      status: 'active',
      shareToken: crypto.randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection(COLLECTIONS.PROJECTS).add(projectData);
    const created = { id: ref.id, ...projectData };
    projects = [created];
    logger.info('Auto-created default project', { userId, projectId: ref.id });
  }

  // Pick project: only one → that one; multiple → most recent
  let selected;
  if (projects.length === 1) {
    selected = projects[0];
  } else {
    selected = [...projects].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0;
      return bTime - aTime;
    })[0];
  }

  // Persist selection
  await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({ activeProjectId: selected.id });

  return { project: selected, activeProjects: projects };
}

// ============================================
// Sentry Error Handler (must be after all routes)
// ============================================
Sentry.setupExpressErrorHandler(app);

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, verifyToken: VERIFY_TOKEN });
});
