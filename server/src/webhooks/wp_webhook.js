import '../../lib/instrument.js';
import 'dotenv/config';
import { execFileSync } from 'child_process';
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
import {
  CONFIRMATION_TTL, getPendingExpense, getRawPendingExpense, clearPendingExpense, setRawPendingExpense,
  setPendingProjectSelection, getPendingProjectSelection, clearPendingProjectSelection,
  setPendingProjectSwitchExpense, getPendingProjectSwitchExpense, clearPendingProjectSwitchExpense,
  setPendingResumenSelection, getPendingResumenSelection, clearPendingResumenSelection,
  createAISupportSession, getAISupportSession, clearAISupportSession, resetSessionTimers,
  getOnboardingState, clearOnboarding, setOnboardingState,
  checkMessageRateLimit
} from '../helpers/pendingState.js';
import { normalizePhoneNumber } from '../helpers/phone.js';
import { getActiveProjects, resolveProject, autoSelectProject } from '../helpers/projects.js';
import { sendGlobalResumen, sendWeeklyResumen } from '../handlers/resumen.js';
import { handleLinkCommand, handleUnlinkCommand, sendHelpMessage, handleAISupport } from '../handlers/commands.js';

// ============================================
// Configuration
// ============================================
const app = express();
const PORT = process.env.PORT || 4001;
const VERIFY_TOKEN = process.env.WP_VERIFY_TOKEN || 'gasto_obra_verify';
const APP_URL = process.env.APP_URL || 'https://gastoobra.com';
const META_APP_SECRET = process.env.META_APP_SECRET;

// ============================================
// Default expense categories
// ============================================
const DEFAULT_EXPENSE_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
const VALID_PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago'];

async function getProviderCategories(providerId, projectId = null) {
  try {
    let projectCats = [];
    if (projectId) {
      const projSnap = await db.collection('categories')
        .where('userId', '==', providerId)
        .where('projectId', '==', projectId)
        .get();
      projectCats = projSnap.docs.map(d => d.data());
    }

    const globalSnap = await db.collection('categories')
      .where('userId', '==', providerId)
      .where('projectId', '==', null)
      .get();
    const globalCats = globalSnap.docs.map(d => d.data());

    if (globalCats.length === 0 && projectCats.length === 0) {
      return DEFAULT_EXPENSE_CATEGORIES;
    }

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

function applyFeeToExpenseData(expenseData, aiResult, providerData) {
  const feePercent = providerData.managementFeePercent || 0;
  if (feePercent > 0 && aiResult.applyManagementFee && expenseData.type === 'expense') {
    expenseData.amountBase = expenseData.amount;
    expenseData.managementFeePercent = feePercent;
    expenseData.amount = Math.round(expenseData.amount * (1 + feePercent / 100));
  } else {
    expenseData.amountBase = null;
    expenseData.managementFeePercent = null;
  }
}

function checkItemsTotalMismatch(items, totalAmount) {
  if (!items || items.length <= 1 || !totalAmount) return null;
  const itemsSum = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  if (itemsSum === 0) return null;
  const diff = Math.abs(totalAmount - itemsSum);
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
let faqCache = null;

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
// Pending Confirmation Wrapper
// ============================================
async function setPendingConfirmation(phoneNumber, userId, expenseData) {
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
  setRawPendingExpense(phoneNumber, {
    data: expenseData,
    userId,
    timestamp,
    pendingConfirmation: true
  });
  setTimeout(async () => {
    const pending = getRawPendingExpense(phoneNumber);
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

// ============================================
// Onboarding Flow
// ============================================
const INACTIVE_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

async function startOnboarding(phoneNumber) {
  const state = { step: 'role_selection', startedAt: Date.now(), data: {} };
  setOnboardingState(phoneNumber, state);

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
    if (normalizedText.startsWith('vincular ')) {
      clearOnboarding(phoneNumber);
      return false;
    }

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

async function findLinkDoc(phoneNumber) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (linkDoc.exists && linkDoc.data()?.status === 'linked') {
    return { doc: linkDoc, needsMigration: false };
  }
  // Fallback: try legacy 549 format for numbers normalized from 549→54
  if (phoneNumber.startsWith('54') && phoneNumber.length === 12) {
    const legacyPhone = '549' + phoneNumber.slice(2);
    const legacyDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(legacyPhone).get();
    if (legacyDoc.exists && legacyDoc.data()?.status === 'linked') {
      return { doc: legacyDoc, needsMigration: true, legacyPhone };
    }
  }
  return null;
}

async function checkLinkedOrOnboard(phoneNumber) {
  const result = await findLinkDoc(phoneNumber);
  if (result) {
    const linkData = result.doc.data();

    // Migrate legacy phone key to normalized format
    if (result.needsMigration) {
      logger.info('Migrating whatsappLink to normalized phone', { from: result.legacyPhone, to: phoneNumber });
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).set({ ...linkData, phoneNumber });
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(result.legacyPhone).delete();
    }

    const lastActivity = linkData.lastActivity?.toDate();
    const now = new Date();
    if (!lastActivity || (now - lastActivity) > INACTIVE_THRESHOLD) {
      await sendReturningUserWelcome(phoneNumber, linkData);
    } else {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return linkData;
  }
  if (!getOnboardingState(phoneNumber)) {
    await startOnboarding(phoneNumber);
  } else {
    await handleOnboardingStep(phoneNumber, '');
  }
  return null;
}

async function sendReturningUserWelcome(phoneNumber, linkData) {
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;
  const projects = await getActiveProjects(userId);

  if (projects.length === 0) {
    // Don't send "no projects" message — prepareExpenseContext will auto-create and notify
  } else if (projects.length === 1) {
    await sendWhatsAppMessage(phoneNumber, `¡Hola! Estás trabajando en *${projects[0].name}*. Contame qué gastaste.`);
  } else {
    const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
    const projectName = activeProject ? activeProject.name : projects[0].name;
    await sendWhatsAppMessage(phoneNumber, `¡Hola! Tenés ${projects.length} proyectos activos. Tu proyecto actual es *${projectName}*. Podés cambiar con PROYECTO.`);
  }

  await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({
    lastActivity: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================
// Middleware
// ============================================
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

function verifyWebhookSignature(req, res, next) {
  if (!META_APP_SECRET) {
    logger.warn('META_APP_SECRET not configured — skipping signature verification');
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.warn('Webhook request without signature', { ip: req.ip });
    return res.sendStatus(401);
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    logger.warn('Webhook signature mismatch', { ip: req.ip });
    return res.sendStatus(401);
  }

  next();
}

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

app.post('/webhook', verifyWebhookSignature, async (req, res) => {
  logger.debug('Incoming webhook', { body: req.body });

  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) return;

    const message = value.messages[0];
    const rawFrom = message.from;

    if (!rawFrom || typeof rawFrom !== 'string' || !/^\d{10,15}$/.test(rawFrom)) {
      logger.warn('Invalid phone number in webhook', { from: rawFrom });
      return;
    }

    const from = normalizePhoneNumber(rawFrom);
    const contactName = value.contacts?.[0]?.profile?.name || 'Usuario';

    if (!checkMessageRateLimit(from)) {
      logger.warn('Rate limit exceeded', { from });
      Sentry.captureMessage('Rate limit exceeded', { level: 'warning', extra: { from } });
      return;
    }

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
    clearPendingResumenSelection(phoneNumber);
  }

  // 5. Active AI support session
  const activeSession = getAISupportSession(phoneNumber);
  if (activeSession) {
    if (['listo, gracias', 'listo gracias', 'listo'].includes(normalizedText)) {
      clearAISupportSession(phoneNumber);
      await sendWhatsAppMessage(phoneNumber, '¡Listo! Si necesitás algo más, escribí *AYUDA* cuando quieras ✅');
      return;
    }
    await handleAISupport(phoneNumber, text, activeSession, { geminiHandler, getFaqData });
    return;
  }

  // 7. Onboarding flow (unlinked users)
  const onboardingState = getOnboardingState(phoneNumber);
  if (onboardingState) {
    const handled = await handleOnboardingStep(phoneNumber, text);
    if (handled) return;
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

  // 10. AYUDA
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

  // 10b. AYUDA button responses
  if (normalizedText === 'comandos') {
    await sendHelpMessage(phoneNumber);
    return;
  }
  if (normalizedText === 'soporte ai') {
    createAISupportSession(phoneNumber);
    await sendWhatsAppMessage(phoneNumber, 'Escribí tu consulta y te ayudo 💡');
    return;
  }

  // 11. PROYECTO / PROYECTOS
  if (normalizedText === 'proyecto' || normalizedText === 'proyectos') {
    await handleProyectoCommand(phoneNumber);
    return;
  }

  // 12. RESUMEN
  if (normalizedText === 'resumen' || normalizedText.startsWith('resumen ')) {
    await handleResumenCommand(phoneNumber);
    return;
  }

  // 13. Fallback → text expense (support detection happens inside)
  await handleTextExpense(phoneNumber, text);
}

// ============================================
// Shared Expense Processing
// ============================================

async function prepareExpenseContext(phoneNumber) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return null;

  const userId = linkData.userId;
  let activeProjectId = linkData.activeProjectId || null;
  let activeProjects;
  let projectAutoCreated = false;
  let resolvedProject = null;

  // Read provider profile for management fee
  const providerDoc = await db.collection(COLLECTIONS.PROVIDERS).doc(userId).get();
  const providerData = providerDoc.exists ? providerDoc.data() : {};

  // Validate activeProjectId is still an active project
  if (activeProjectId) {
    resolvedProject = await resolveProject(userId, activeProjectId);
    if (!resolvedProject) activeProjectId = null;
  }

  if (!activeProjectId) {
    const result = await autoSelectProject(userId, phoneNumber);
    activeProjectId = result.project.id;
    activeProjects = result.activeProjects;
    projectAutoCreated = result.autoCreated;
    resolvedProject = result.project;

    if (projectAutoCreated) {
      await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto creado. Creando uno automáticamente...');
    }
  } else {
    activeProjects = await getActiveProjects(userId);
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const aiContext = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: providerData.managementFeePercent || 0
  };

  return { linkData, providerData, userId, activeProjectId, activeProjects, resolvedProject, providerCats, recipients, vendors, aiContext, projectAutoCreated };
}

async function processExpenseResult({
  phoneNumber, userId, activeProjectId, activeProjects,
  resolvedProject: preResolvedProject,
  aiResult, linkData, providerData, providerCats, recipients,
  mediaUrls, originalMessage, defaultTitle,
  useAITitle = false, useAIDescription = false,
  filterItems = false, sumItemAmounts = false,
  trustAICategory = false, checkMismatch = false,
  projectAutoCreated = false
}) {
  const transactionType = resolveTransactionType(aiResult.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  const installmentPercent = aiResult.installmentPercent === 100 ? 100 : (typeDefaults.installmentPercent ?? 0);

  const vendor = aiResult.vendor || null;

  // Normalize items
  let items;
  if (filterItems) {
    items = Array.isArray(aiResult.items) && aiResult.items.length > 0
      ? aiResult.items.filter(i => i && i.name && i.amount > 0)
      : null;
    if (items && items.length === 0) items = null;
  } else {
    items = aiResult.items && aiResult.items.length > 0
      ? aiResult.items.map(i => typeof i === 'string' ? { name: i, amount: 0 } : { name: i.name || '', amount: i.amount || 0 })
      : null;
  }

  // Resolve title
  let title;
  if (useAITitle) {
    title = aiResult.title || items?.[0]?.name || defaultTitle;
  } else {
    title = vendor || (items?.[0]?.name) || (aiResult.items?.[0]?.name) || defaultTitle;
  }

  // Resolve description
  const description = useAIDescription
    ? (aiResult.description || '')
    : (aiResult.items ? aiResult.items.map(i => typeof i === 'string' ? i : i.name).join(', ') : '');

  // Resolve amount
  let amount;
  if (sumItemAmounts && items && items.length > 0) {
    amount = items.reduce((sum, i) => sum + i.amount, 0);
  } else {
    amount = aiResult.totalAmount || 0;
  }

  // Validate payment method
  const paymentMethod = VALID_PAYMENT_METHODS.includes(aiResult.paymentMethod) ? aiResult.paymentMethod : null;

  // Resolve recipient
  let recipientName = null, recipientBankInfo = null, recipientPlatform = null, recipientCuit = null;
  if (aiResult.recipientId) {
    const matched = recipients.find(r => r.id === aiResult.recipientId);
    if (matched) {
      recipientName = matched.name || null;
      recipientBankInfo = matched.bankInfo || null;
      recipientPlatform = matched.platform || null;
      recipientCuit = matched.cuit || null;
    }
  }

  // Detect project
  const detectedProjectId = aiResult.projectId && activeProjects.some(p => p.id === aiResult.projectId)
    ? aiResult.projectId : null;

  // Resolve category
  let category;
  if (transactionType === 'payment') {
    category = 'pago';
  } else if (trustAICategory && aiResult.category) {
    category = providerCats.includes(aiResult.category)
      ? aiResult.category
      : await geminiHandler.categorizeExpense(title, description, providerCats);
  } else {
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  const mismatch = checkMismatch ? checkItemsTotalMismatch(items, aiResult.totalAmount) : null;

  // Build base expense fields
  const baseFields = {
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
    ...mediaUrls,
    originalMessage,
    source: 'whatsapp',
    timestamp: Date.now(),
    projectAutoCreated
  };

  // Project switching
  const isProjectSwitch = detectedProjectId && detectedProjectId !== activeProjectId;

  if (isProjectSwitch) {
    const detectedProject = activeProjects.find(p => p.id === detectedProjectId);
    const expenseData = {
      ...baseFields,
      projectId: detectedProject.id,
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
    };

    applyFeeToExpenseData(expenseData, aiResult, providerData);
    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
    const switchBody = `${confirmMsg}\nEste gasto se guardaría en *${detectedProject.name}* (no tu proyecto activo).\n\nSi querés guardar automáticamente a este proyecto, usá el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Sí' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = preResolvedProject || await resolveProject(userId, activeProjectId);
  if (!project) {
    logger.warn('Project resolution failed after prepareExpenseContext', { userId, activeProjectId });
    await sendWhatsAppMessage(phoneNumber, 'No tenés un proyecto activo. Enviá *PROYECTO* para seleccionar uno.');
    return;
  }

  const expenseData = {
    ...baseFields,
    projectId: project.id,
    projectTag: project.tag,
    projectName: project.name,
  };

  applyFeeToExpenseData(expenseData, aiResult, providerData);
  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData, mismatch);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Sí' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

// ============================================
// Image Message Processing
// ============================================

async function processImageMessage(phoneNumber, imageId, caption, contactName) {
  const ctx = await prepareExpenseContext(phoneNumber);
  if (!ctx) return;

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

  const receiptData = await geminiHandler.parseReceiptImage(
    imageData.base64, imageData.mimeType, { ...ctx.aiContext, caption }
  );
  if (isGeminiError(receiptData)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!receiptData || !receiptData.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el ticket. Intentá con una foto más clara o registrá el gasto manualmente.');
    return;
  }

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

  await processExpenseResult({
    phoneNumber, ...ctx, aiResult: receiptData,
    mediaUrls: { imageUrl, audioUrl: null, audioTranscription: null, fileUrl: null },
    originalMessage: `[Imagen] ${caption}`,
    defaultTitle: 'Ticket',
    checkMismatch: true,
  });
}

// ============================================
// Document (PDF) Message Processing
// ============================================

const MAX_PDF_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 5;

async function processDocumentMessage(phoneNumber, documentId, caption, filename, contactName) {
  const ctx = await prepareExpenseContext(phoneNumber);
  if (!ctx) return;

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

  const pdfBuffer = Buffer.from(documentData.base64, 'base64');
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    await sendWhatsAppMessage(phoneNumber, `El documento es muy grande (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB). El máximo es ${MAX_PDF_SIZE / 1024 / 1024} MB.`);
    return;
  }

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

  const documentResult = await geminiHandler.parseDocument(
    documentData.base64, 'application/pdf', { ...ctx.aiContext, caption }
  );
  if (isGeminiError(documentResult)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!documentResult || !documentResult.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el documento. Intentá con una foto del mismo o registrá el gasto manualmente.');
    return;
  }

  let fileUrl = null;
  try {
    const storagePath = storageHandler.generatePath('expenses', filename || 'document.pdf');
    fileUrl = await storageHandler.uploadFile(pdfBuffer, storagePath, 'application/pdf');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading PDF document', { error });
  }

  await processExpenseResult({
    phoneNumber, ...ctx, aiResult: documentResult,
    mediaUrls: { imageUrl: null, audioUrl: null, audioTranscription: null, fileUrl },
    originalMessage: `[Documento] ${caption || filename}`,
    defaultTitle: 'Documento',
    checkMismatch: true,
  });
}

// ============================================
// Audio Message Processing
// ============================================

async function processAudioMessage(phoneNumber, audioId, caption, contactName) {
  const ctx = await prepareExpenseContext(phoneNumber);
  if (!ctx) return;

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

  const transcription = await geminiHandler.transcribeAudio(audioData.base64, audioData.mimeType, ctx.aiContext);

  if (isGeminiError(transcription)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!transcription || (!transcription.totalAmount && !transcription.items?.length && !transcription.title)) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el audio. Intentá nuevamente o enviá una foto del ticket.');
    return;
  }

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

  // Early amount check (audio may transcribe but not parse a valid amount)
  const preItems = Array.isArray(transcription.items) && transcription.items.length > 0
    ? transcription.items.filter(i => i && i.name && i.amount > 0) : null;
  const preAmount = preItems && preItems.length > 0
    ? preItems.reduce((sum, i) => sum + i.amount, 0)
    : (transcription.totalAmount || 0);

  if (preAmount <= 0) {
    await sendWhatsAppMessage(phoneNumber, `Transcripción: "${transcription.transcription}"\n\nNo pude determinar el monto. Enviá una foto del ticket.`);
    return;
  }

  await processExpenseResult({
    phoneNumber, ...ctx, aiResult: transcription,
    mediaUrls: { imageUrl: null, audioUrl, audioTranscription: transcription.transcription || null, fileUrl: null },
    originalMessage: `[Audio] ${caption}`,
    defaultTitle: 'Gasto por audio',
    useAITitle: true, useAIDescription: true,
    filterItems: true, sumItemAmounts: true,
    trustAICategory: true,
  });
}

// ============================================
// Text Message Expense Processing
// ============================================

async function handleTextExpense(phoneNumber, text) {
  const ctx = await prepareExpenseContext(phoneNumber);
  if (!ctx) return;

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de texto no está disponible.');
    return;
  }

  const result = await geminiHandler.parseTextExpense(text, ctx.aiContext);

  if (!isGeminiError(result) && result?.isSupportQuestion && (!result.totalAmount || result.totalAmount === 0)) {
    const session = createAISupportSession(phoneNumber);
    await handleAISupport(phoneNumber, text, session, { geminiHandler, getFaqData });
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

  await processExpenseResult({
    phoneNumber, ...ctx, aiResult: result,
    mediaUrls: { imageUrl: null, audioUrl: null, audioTranscription: null, fileUrl: null },
    originalMessage: text,
    defaultTitle: 'Gasto por texto',
    useAITitle: true, useAIDescription: true,
    filterItems: true, sumItemAmounts: true,
    trustAICategory: true,
  });
}

// ============================================
// Confirmation Message Builder
// ============================================

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
    msg += `\n\n⚠️ La suma de items (${formatAmount(mismatch.itemsSum)}) no coincide con el total del comprobante (${formatAmount(mismatch.totalAmount)}). Diferencia: ${formatAmount(mismatch.diff)}. Verificá que los montos sean correctos.`;
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
        await expenseRef.update({ vendor: match.name });
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

  if (data.projectAutoCreated) {
    await sendWhatsAppMessage(
      phoneNumber,
      `Se creó un proyecto automáticamente. Entrá a ${APP_URL} y completá los datos para una mejor experiencia.`
    );
  }
}

// ============================================
// Command Handlers (depend on checkLinkedOrOnboard)
// ============================================

async function handleProyectoCommand(phoneNumber) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return;

  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  try {
    const projects = await getActiveProjects(userId);

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
// Sentry Error Handler (must be after all routes)
// ============================================
Sentry.setupExpressErrorHandler(app);

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  let version = 'unknown';
  try { version = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim(); } catch {}
  logger.info('Server started', { port: PORT, verifyToken: VERIFY_TOKEN, version });
});
