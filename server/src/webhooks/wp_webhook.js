import '../../lib/instrument.js';
import 'dotenv/config';
import express from 'express';
import * as Sentry from '@sentry/node';
import { admin, db, bucket, COLLECTIONS } from '../config/firebase.js';
import GeminiHandler from '../handlers/GeminiHandler.js';
import StorageHandler from '../handlers/StorageHandler.js';
import { sendWhatsAppMessage, sendWhatsAppButtons, downloadWhatsAppMedia } from '../helpers/whatsapp.js';
import { compressImage } from '../helpers/compression.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { formatAmount, capitalizeFirst } from '../helpers/responseFormatter.js';
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
  return `El servicio de procesamiento no esta disponible en este momento.\n\nPodes registrar el gasto desde la app web: ${APP_URL}\n\nIntenta nuevamente en unos minutos.`;
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

// ============================================
// Gemini Handler
// ============================================
const geminiHandler = process.env.GEMINI_API_KEY
  ? new GeminiHandler(process.env.GEMINI_API_KEY)
  : null;
const storageHandler = new StorageHandler(bucket);

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
        await sendWhatsAppMessage(from, 'Solo se aceptan documentos PDF. Para otros formatos, envia una foto del documento.');
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

  // 5. VINCULAR
  if (normalizedText.startsWith('vincular ')) {
    const code = text.trim().split(' ')[1]?.toUpperCase();
    await handleLinkCommand(phoneNumber, code, contactName);
    return;
  }

  // 6. DESVINCULAR
  if (normalizedText === 'desvincular') {
    await handleUnlinkCommand(phoneNumber);
    return;
  }

  // 7. AYUDA
  if (normalizedText === 'ayuda' || normalizedText === 'help') {
    await sendHelpMessage(phoneNumber);
    return;
  }

  // 8. PROYECTO / PROYECTOS
  if (normalizedText === 'proyecto' || normalizedText === 'proyectos') {
    await handleProyectoCommand(phoneNumber);
    return;
  }

  // 9. RESUMEN
  if (normalizedText === 'resumen' || normalizedText.startsWith('resumen ')) {
    await handleResumenCommand(phoneNumber);
    return;
  }

  // 10. Fallback → text expense
  await handleTextExpense(phoneNumber, text);
}

// ============================================
// Image Message Processing
// ============================================

async function processImageMessage(phoneNumber, imageId, caption, contactName) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado. Envia VINCULAR <codigo> para vincular tu cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  const activeProjects = await getActiveProjects(userId);
  if (activeProjects.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
    return;
  }

  if (!activeProjectId) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de imagenes no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando imagen...');

  const imageData = await downloadWhatsAppMedia(imageId);
  if (!imageData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar la imagen. Intenta nuevamente.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    caption,
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors
  };

  const receiptData = await geminiHandler.parseReceiptImage(imageData.base64, imageData.mimeType, context);
  if (isGeminiError(receiptData)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!receiptData || !receiptData.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el ticket. Intenta con una foto mas clara o registra el gasto manualmente.');
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

    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaria en *${detectedProject.name}* (no tu proyecto activo).\n\nSi queres guardar automaticamente a este proyecto, usa el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Si' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
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

  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
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
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado. Envia VINCULAR <codigo> para vincular tu cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  const activeProjects = await getActiveProjects(userId);
  if (activeProjects.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
    return;
  }

  if (!activeProjectId) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de documentos no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando documento...');

  const documentData = await downloadWhatsAppMedia(documentId);
  if (!documentData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el documento. Intenta nuevamente.');
    return;
  }

  // Size check
  const pdfBuffer = Buffer.from(documentData.base64, 'base64');
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    await sendWhatsAppMessage(phoneNumber, `El documento es muy grande (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB). El maximo es ${MAX_PDF_SIZE / 1024 / 1024} MB.`);
    return;
  }

  // Page count check
  try {
    const pdfInfo = await pdfParse(pdfBuffer);
    if (pdfInfo.numpages > MAX_PDF_PAGES) {
      await sendWhatsAppMessage(phoneNumber, `El documento tiene ${pdfInfo.numpages} paginas. Solo se aceptan PDFs de hasta ${MAX_PDF_PAGES} paginas.`);
      return;
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error parsing PDF for page count', { error });
    await sendWhatsAppMessage(phoneNumber, 'No se pudo leer el PDF. Asegurate de que sea un archivo valido.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    caption,
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors
  };

  const documentResult = await geminiHandler.parseDocument(documentData.base64, 'application/pdf', context);
  if (isGeminiError(documentResult)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!documentResult || !documentResult.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el documento. Intenta con una foto del mismo o registra el gasto manualmente.');
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

    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaria en *${detectedProject.name}* (no tu proyecto activo).\n\nSi queres guardar automaticamente a este proyecto, usa el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Si' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
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

  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

// ============================================
// Audio Message Processing
// ============================================

async function processAudioMessage(phoneNumber, audioId, caption, contactName) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado. Envia VINCULAR <codigo> para vincular tu cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  const activeProjects = await getActiveProjects(userId);
  if (activeProjects.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
    return;
  }

  if (!activeProjectId) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de audio no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando audio...');

  const audioData = await downloadWhatsAppMedia(audioId);
  if (!audioData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el audio. Intenta nuevamente.');
    return;
  }

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors
  };

  const transcription = await geminiHandler.transcribeAudio(audioData.base64, audioData.mimeType, context);

  if (isGeminiError(transcription)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!transcription || (!transcription.totalAmount && !transcription.items?.length && !transcription.title)) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el audio. Intenta nuevamente o envia una foto del ticket.');
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
    await sendWhatsAppMessage(phoneNumber, `Transcripcion: "${transcription.transcription}"\n\nNo pude determinar el monto. Envia una foto del ticket.`);
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

    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaria en *${detectedProject.name}* (no tu proyecto activo).\n\nSi queres guardar automaticamente a este proyecto, usa el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Si' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
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

async function handleTextExpense(phoneNumber, text) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado. Envia VINCULAR <codigo> para vincular tu cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  const activeProjects = await getActiveProjects(userId);
  if (activeProjects.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
    return;
  }

  if (!activeProjectId) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de texto no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando mensaje...');

  const providerCats = await getProviderCategories(userId, activeProjectId);
  const recipients = await getProviderRecipients(userId);
  const vendors = await getProviderVendors(userId);

  const context = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors
  };

  const result = await geminiHandler.parseTextExpense(text, context);

  if (isGeminiError(result)) {
    await sendWhatsAppMessage(phoneNumber, getGeminiErrorMessage());
    return;
  }
  if (!result || !result.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el mensaje.\n\nPodes registrar gastos con un texto como:\n- "500 clavos"\n- "1500 cemento y 800 arena"\n- "me pagaron 5000 por transferencia"\n\nTambien podes enviar una *foto*, *audio* o *PDF*.\n\nEscribi *AYUDA* para mas info.');
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

    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    const switchBody = `${confirmMsg}\nEste gasto se guardaria en *${detectedProject.name}* (no tu proyecto activo).\n\nSi queres guardar automaticamente a este proyecto, usa el comando *PROYECTO*.`;
    await sendWhatsAppButtons(phoneNumber, switchBody, [
      { id: 'confirm_yes', title: 'Si' },
      { id: 'confirm_no', title: 'No' }
    ]);
    return;
  }

  const project = await resolveProject(userId, activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
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

  await setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
  await sendWhatsAppButtons(phoneNumber, confirmMsg, [
    { id: 'confirm_yes', title: 'Si' },
    { id: 'confirm_no', title: 'No' }
  ]);
}

function buildExpenseConfirmationMessage(data) {
  const typeLabel = getTypeLabel(data.type);
  const formattedAmount = formatAmount(data.amount);
  let msg = `${typeLabel}: ${formattedAmount} - ${data.title}\n`;

  if (data.items && data.items.length > 1) {
    msg += data.items.map(i => `  - ${i.name}: ${formatAmount(i.amount)}`).join('\n') + '\n';
  }

  msg += `${capitalizeFirst(data.category)} - ${data.projectName}`;

  if (data.paymentMethod) {
    msg += `\nMetodo: ${capitalizeFirst(data.paymentMethod)}`;
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
    await sendWhatsAppMessage(phoneNumber, 'Formato incorrecto. Usa: VINCULAR <codigo>\n\nEjemplo: VINCULAR ABC123');
    return;
  }

  try {
    const codeDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).get();

    if (!codeDoc.exists) {
      await sendWhatsAppMessage(phoneNumber, 'Codigo no encontrado o expirado. Genera un nuevo codigo desde la app.');
      return;
    }

    const codeData = codeDoc.data();

    if (codeData.status !== 'pending') {
      await sendWhatsAppMessage(phoneNumber, 'Codigo no valido. Genera un nuevo codigo desde la app.');
      return;
    }

    // Check if expired (10 minutes)
    const createdAt = codeData.createdAt?.toDate() || new Date(0);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 10) {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).delete();
      await sendWhatsAppMessage(phoneNumber, 'El codigo ha expirado. Genera un nuevo codigo desde la app.');
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
    message += 'Envia una foto, audio o PDF para registrar gastos.\nEnvia *PROYECTO* para cambiar de proyecto.\nEscribi *AYUDA* para mas info.';

    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error linking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al vincular la cuenta. Intenta nuevamente.');
  }
}

async function handleUnlinkCommand(phoneNumber) {
  try {
    const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

    if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
      await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
      return;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).delete();

    await sendWhatsAppMessage(phoneNumber, 'Cuenta desvinculada exitosamente. Ya no se registraran gastos desde este numero.');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error unlinking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al desvincular la cuenta. Intenta nuevamente.');
  }
}

async function sendHelpMessage(phoneNumber) {
  const helpText = `*Gasto Obra - Ayuda*

*Registrar gastos:*
Envia un *texto*, *foto*, *audio* o *PDF* y se registra en tu proyecto activo.

*Ejemplos de texto:*
- "500 clavos"
- "1500 cemento y 800 arena"
- "me pagaron 5000 por transferencia"
- "2000 pintura pagado por el cliente"

Podes incluir metodo de pago (efectivo, transferencia, tarjeta, mercadopago), destinatario, o mencionar otro proyecto en el mensaje.

*Comandos:*
*PROYECTO* - Seleccionar proyecto activo
*RESUMEN* - Resumen del proyecto activo
*AYUDA* - Ver este mensaje`;

  await sendWhatsAppMessage(phoneNumber, helpText);
}

async function handleProyectoCommand(phoneNumber) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;
  const activeProjectId = linkData.activeProjectId || null;

  try {
    const projects = await getActiveProjects(userId);

    if (projects.length === 0) {
      await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
      return;
    }

    // Auto-select if only 1 project
    if (projects.length === 1) {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({ activeProjectId: projects[0].id });
      await sendWhatsAppMessage(phoneNumber, `Proyecto activo: *${projects[0].name}* (${projects[0].tag})`);
      return;
    }

    let message = 'Estos son tus proyectos, manda el numero que queres seleccionar:\n\n';
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
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const linkData = linkDoc.data();
  const userId = linkData.userId;

  const project = await resolveProject(userId, linkData.activeProjectId);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, 'No tenes un proyecto activo. Envia *PROYECTO* para seleccionar uno.');
    return;
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

    const body = `📊 *Resumen - ${project.name}*\n\nSelecciona una opcion:\n1️⃣ *Global* - Resumen completo del proyecto\n2️⃣ *Semanal* - Gastos de esta semana dia por dia`;
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
  message += `\n\n*Por categoria:*\n${categoryLines}`;
  message += `\n\n*Total gastos:* ${formatAmount(totalExpenses)}`;
  message += `\n*Pagos recibidos:* ${formatAmount(totalPayments)}`;
  message += `\n*Saldo:* ${formatAmount(balance)}`;

  if (providerExpenses.length > 0) {
    message += `\n\n*Gastos propios (${providerExpenses.length}):* ${formatAmount(totalProviderExpenses)}`;
  }

  message += `\n\n🔗 Ver detalle: ${APP_URL}`;
  message += `\n\n_Podes compartir este mensaje con tu cliente_`;

  await sendWhatsAppMessage(phoneNumber, message);
}

function getARTDate(date) {
  const artOffset = -3 * 60; // ART is UTC-3
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + artOffset * 60000);
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

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

        const title = e.title || 'Sin titulo';
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
  message += `\n\n_Podes compartir este mensaje con tu cliente_`;

  // WhatsApp message length safety
  if (message.length > 3800) {
    message = message.substring(0, 3750) + '\n... (ver mas en la app)';
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
