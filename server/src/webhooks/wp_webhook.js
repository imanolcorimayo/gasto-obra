import '../../lib/instrument.js';
import 'dotenv/config';
import express from 'express';
import * as Sentry from '@sentry/node';
import { admin, db, COLLECTIONS } from '../config/firebase.js';
import GeminiHandler from '../handlers/GeminiHandler.js';
import { sendWhatsAppMessage, downloadWhatsAppMedia } from '../helpers/whatsapp.js';
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

// ============================================
// Transaction Type Helpers
// ============================================

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

// ============================================
// Pending Confirmations (2 min auto-confirm)
// ============================================
const CONFIRMATION_TTL = 2 * 60 * 1000; // 2 minutes
const pendingExpenses = new Map(); // phoneNumber -> { data, userId, timestamp, pendingConfirmation }

function setPendingConfirmation(phoneNumber, userId, expenseData) {
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

  // 3. VINCULAR
  if (normalizedText.startsWith('vincular ')) {
    const code = text.trim().split(' ')[1]?.toUpperCase();
    await handleLinkCommand(phoneNumber, code, contactName);
    return;
  }

  // 4. DESVINCULAR
  if (normalizedText === 'desvincular') {
    await handleUnlinkCommand(phoneNumber);
    return;
  }

  // 5. AYUDA
  if (normalizedText === 'ayuda' || normalizedText === 'help') {
    await sendHelpMessage(phoneNumber);
    return;
  }

  // 6. PROYECTO / PROYECTOS
  if (normalizedText === 'proyecto' || normalizedText === 'proyectos') {
    await handleProyectoCommand(phoneNumber);
    return;
  }

  // 7. RESUMEN
  if (normalizedText === 'resumen' || normalizedText.startsWith('resumen ')) {
    await handleResumenCommand(phoneNumber);
    return;
  }

  // 8. Fallback → text expense
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

  const project = await resolveProject(userId, linkData.activeProjectId);
  if (!project) {
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

  const receiptData = await geminiHandler.parseReceiptImage(imageData.base64, imageData.mimeType);
  if (!receiptData || !receiptData.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el ticket. Intenta con una foto mas clara o registra el gasto manualmente.');
    return;
  }

  const transactionType = resolveTransactionType(receiptData.transactionType) || 'expense';
  const typeDefaults = getTypeDefaults(transactionType);

  const title = receiptData.storeName || (receiptData.items?.[0]?.name) || 'Ticket';
  const description = receiptData.items
    ? receiptData.items.map(i => typeof i === 'string' ? i : i.name).join(', ')
    : '';

  let category = transactionType === 'payment' ? 'pago' : null;
  if (!category) {
    const providerCats = await getProviderCategories(userId, project.id);
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  const items = receiptData.items && receiptData.items.length > 0
    ? receiptData.items.map(i => typeof i === 'string' ? { name: i, amount: 0 } : { name: i.name || '', amount: i.amount || 0 })
    : null;

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount: receiptData.totalAmount,
    category,
    type: transactionType,
    installmentPercent: typeDefaults.installmentPercent,
    paymentMethod: null,
    recipientName: null,
    recipientBankInfo: null,
    recipientPlatform: null,
    recipientCuit: null,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items,
    imageUrl: null,
    audioTranscription: null,
    originalMessage: `[Imagen] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  setPendingConfirmation(phoneNumber, userId, expenseData);

  const typeLabel = getTypeLabel(transactionType);
  const formattedAmount = formatAmount(receiptData.totalAmount);
  await sendWhatsAppMessage(
    phoneNumber,
    `${typeLabel}: ${formattedAmount} - ${title}\n${capitalizeFirst(category)} - ${project.name}\n${description ? `_${description}_\n` : ''}\nResponde *si* para confirmar o *no* para cancelar.`
  );
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

  const project = await resolveProject(userId, linkData.activeProjectId);
  if (!project) {
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

  // Pass active projects for transcription context
  const activeProjects = await getActiveProjects(userId);
  const transcription = await geminiHandler.transcribeAudio(audioData.base64, audioData.mimeType, activeProjects);

  if (!transcription || (!transcription.totalAmount && !transcription.items?.length && !transcription.title)) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el audio. Intenta nuevamente o envia una foto del ticket.');
    return;
  }

  const title = transcription.title || 'Gasto por audio';
  const items = Array.isArray(transcription.items) && transcription.items.length > 0
    ? transcription.items.filter(i => i && i.name && i.amount > 0)
    : null;
  const amount = items && items.length > 0
    ? items.reduce((sum, i) => sum + i.amount, 0)
    : (transcription.totalAmount || 0);
  const description = transcription.description || '';

  const transactionType = transcription.transactionType && ['expense', 'payment', 'provider_expense'].includes(transcription.transactionType)
    ? transcription.transactionType
    : 'expense';
  const typeDefaults = getTypeDefaults(transactionType);
  let category = transactionType === 'payment' ? 'pago' : (transcription.category || null);

  if (amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, `Transcripcion: "${transcription.transcription}"\n\nNo pude determinar el monto. Envia una foto del ticket.`);
    return;
  }

  // Resolve category with provider's custom categories
  if (!category) {
    const providerCats = await getProviderCategories(userId, project.id);
    category = await geminiHandler.categorizeExpense(title, description, providerCats);
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount,
    category,
    type: transactionType,
    installmentPercent: typeDefaults.installmentPercent,
    paymentMethod: null,
    recipientName: null,
    recipientBankInfo: null,
    recipientPlatform: null,
    recipientCuit: null,
    linkedExpenseId: null,
    linkedPaymentId: null,
    items: items || null,
    imageUrl: null,
    audioTranscription: transcription.transcription || null,
    originalMessage: `[Audio] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  setPendingConfirmation(phoneNumber, userId, expenseData);

  const typeLabel = getTypeLabel(transactionType);
  const formattedAmount = formatAmount(amount);
  let confirmMsg = `${typeLabel}: ${formattedAmount} - ${title}\n`;
  if (items && items.length > 1) {
    confirmMsg += items.map(i => `  - ${i.name}: ${formatAmount(i.amount)}`).join('\n') + '\n';
  }
  confirmMsg += `${capitalizeFirst(category)} - ${project.name}\n`;
  if (description) confirmMsg += `_${description}_\n`;
  confirmMsg += `\nResponde *si* para confirmar o *no* para cancelar.`;
  await sendWhatsAppMessage(phoneNumber, confirmMsg);
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

  const context = {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag })),
    categories: providerCats,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS
  };

  const result = await geminiHandler.parseTextExpense(text, context);

  if (!result || !result.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el mensaje. Intenta con algo como "500 clavos" o envia una foto/audio.');
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
      linkedExpenseId: null,
      linkedPaymentId: null,
      items: items || null,
      imageUrl: null,
      audioTranscription: null,
      originalMessage: text,
      source: 'whatsapp',
      projectTag: detectedProject.tag,
      projectName: detectedProject.name,
      timestamp: Date.now()
    };

    setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject);

    const confirmMsg = buildExpenseConfirmationMessage(expenseData);
    await sendWhatsAppMessage(
      phoneNumber,
      `${confirmMsg}\nEste gasto se guardaria en *${detectedProject.name}* (no tu proyecto activo).\n\nResponde *si* para confirmar o *no* para cancelar.\nSi queres guardar automaticamente a este proyecto, usa el comando *PROYECTO*.`
    );
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
    linkedExpenseId: null,
    linkedPaymentId: null,
    items: items || null,
    imageUrl: null,
    audioTranscription: null,
    originalMessage: text,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  setPendingConfirmation(phoneNumber, userId, expenseData);

  const confirmMsg = buildExpenseConfirmationMessage(expenseData);
  await sendWhatsAppMessage(phoneNumber, confirmMsg);
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
  if (data.recipientName) {
    msg += `\nDestinatario: ${data.recipientName}`;
  }
  if (data.installmentPercent >= 100) {
    msg += `\nEstado: Pagado`;
  }

  msg += `\n\nResponde *si* para confirmar o *no* para cancelar.`;
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
    audioTranscription: data.audioTranscription || null,
    originalMessage: data.originalMessage || '',
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const expenseRef = await db.collection(COLLECTIONS.EXPENSES).add(expenseDoc);

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
      audioTranscription: null,
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

  // Notify client
  if (data.type !== 'provider_expense') {
    await notifyClient(data.projectId, data.amount, data.projectName, data.type);
  }
}

// ============================================
// Client Notification
// ============================================

async function notifyClient(projectId, amount, projectName, type) {
  try {
    const projectDoc = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get();
    if (!projectDoc.exists) return;

    const project = projectDoc.data();
    if (!project.clientPhone) return;

    const formattedAmount = formatAmount(amount);
    const label = type === 'payment' ? 'pago' : 'gasto';

    await sendWhatsAppMessage(
      project.clientPhone,
      `El proveedor registro un ${label} de ${formattedAmount} en *${projectName}*.`
    );
  } catch (error) {
    // Fail silently - client notification is best-effort
    Sentry.captureException(error);
    logger.error('Error notifying client', { error });
  }
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
    message += 'Envia una foto o audio para registrar gastos.\nEnvia *PROYECTO* para cambiar de proyecto.\nEscribi *AYUDA* para mas info.';

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
- Envia un *texto* describiendo el gasto
- Envia una *foto* de un ticket
- Envia un *audio* describiendo el gasto

Se registra automaticamente en tu proyecto activo.

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

    // Separate by type
    const clientExpenses = expenses.filter(e => !e.type || e.type === 'expense');
    const payments = expenses.filter(e => e.type === 'payment');
    const providerExpenses = expenses.filter(e => e.type === 'provider_expense');

    const totalExpenses = clientExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPayments = payments.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProviderExpenses = providerExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = totalPayments - totalExpenses;

    // Group expenses by category
    const byCategory = {};
    clientExpenses.forEach(e => {
      const cat = e.category || 'otros';
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
    });

    const categoryLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => `  ${capitalizeFirst(cat)}: ${formatAmount(amount)}`)
      .join('\n');

    let message = `*Resumen - ${project.name}*
Tag: #${project.tag}
${project.clientName ? `Cliente: ${project.clientName}` : ''}

*${clientExpenses.length} gastos registrados*

*Por categoria:*
${categoryLines}

*Total gastos:* ${formatAmount(totalExpenses)}`;

    if (totalPayments > 0) {
      message += `\n*Pagos recibidos:* ${formatAmount(totalPayments)}`;
      message += `\n*Saldo:* ${formatAmount(balance)}`;
    }

    if (totalProviderExpenses > 0) {
      message += `\n*Gastos propios:* ${formatAmount(totalProviderExpenses)}`;
    }

    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error in RESUMEN command', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al obtener el resumen.');
  }
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
