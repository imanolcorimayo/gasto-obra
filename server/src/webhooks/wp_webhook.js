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
import { stripHtml } from '../helpers/responseFormatter.js';
import logger from '../../lib/logger.js';
import {
  getAISupportSession, clearAISupportSession,
  getOnboardingState, clearOnboarding, setOnboardingState,
  checkMessageRateLimit
} from '../helpers/pendingState.js';
import { normalizePhoneNumber } from '../helpers/phone.js';
import { getActiveProjects, resolveProject, autoSelectProject } from '../helpers/projects.js';
import { handleLinkCommand, handleUnlinkCommand, sendHelpMessage, handleAISupport } from '../handlers/commands.js';
import { runAgentTurn, startFreshSession } from '../agent/core.js';
import { mcpRouter } from '../mcp/httpRoute.js';
import { oauthRouter } from '../mcp/oauth/router.js';

// ============================================
// Configuration
// ============================================
const app = express();
const PORT = process.env.PORT || 4001;
const VERIFY_TOKEN = process.env.WP_VERIFY_TOKEN || 'gasto_obra_verify';
const APP_URL = process.env.APP_URL || 'https://gastoobra.com';
const META_APP_SECRET = process.env.META_APP_SECRET;

// Meta delivers webhooks at-least-once: the same message id (wamid) can arrive
// more than once (retries, redeliveries when our ack is slow). Dedup by id so a
// message is processed exactly once. In-memory is fine — duplicates land within
// seconds, and a restart only risks reprocessing a message mid-flight.
const SEEN_MESSAGE_TTL_MS = 10 * 60 * 1000;
const seenMessageIds = new Map(); // wamid -> first-seen epoch ms

function isDuplicateMessage(id) {
  if (!id) return false;
  const now = Date.now();
  if (seenMessageIds.size > 2000) {
    for (const [k, ts] of seenMessageIds) if (now - ts > SEEN_MESSAGE_TTL_MS) seenMessageIds.delete(k);
  }
  const prev = seenMessageIds.get(id);
  if (prev && now - prev <= SEEN_MESSAGE_TTL_MS) return true;
  seenMessageIds.set(id, now);
  return false;
}

// ============================================
// Default expense categories
// ============================================
const DEFAULT_EXPENSE_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
const VALID_PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago'];

// PDF intake limits (the agentic document handler enforces these before reading).
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_PAGES = 5;

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

// Remote MCP endpoint (Streamable HTTP) — reachable through the same tunnel that
// fronts this webhook. Auth + protocol live in the router; see src/mcp/httpRoute.js.
app.use('/mcp', mcpRouter);

// OAuth 2.1 server for the remote MCP endpoint (discovery metadata at the app root,
// plus /oauth/*). Lets ChatGPT / Claude connect as a connector. See src/mcp/oauth/.
app.use(oauthRouter);

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

    // Drop redelivered duplicates before doing any work (Meta at-least-once).
    if (isDuplicateMessage(message.id)) {
      logger.info('Duplicate message skipped', { id: message.id, from });
      return;
    }

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
      await handleImageMessage(from, imageId, caption);
    } else if (message.type === 'audio') {
      const caption = message.audio?.caption || '';
      const audioId = message.audio?.id;
      logger.info('Audio message received', { from, contactName });
      await handleAudioMessage(from, audioId, caption);
    } else if (message.type === 'document') {
      const caption = message.document?.caption || '';
      const documentId = message.document?.id;
      const documentMimeType = message.document?.mime_type || '';
      const filename = message.document?.filename || 'document.pdf';
      logger.info('Document message received', { from, contactName, filename, documentMimeType });

      if (documentMimeType !== 'application/pdf') {
        await sendWhatsAppMessage(from, 'Solo se aceptan documentos PDF. Para otros formatos, enviá una foto del documento.');
      } else {
        await handleDocumentMessage(from, documentId, caption, filename);
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

  // 1. Active AI support session
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

  // 2. Onboarding flow (unlinked users)
  const onboardingState = getOnboardingState(phoneNumber);
  if (onboardingState) {
    const handled = await handleOnboardingStep(phoneNumber, text);
    if (handled) return;
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
  if (normalizedText === 'ayuda' || normalizedText === 'help' || normalizedText === 'comandos') {
    await sendHelpMessage(phoneNumber);
    return;
  }

  // 6. NUEVO → start a fresh agent conversation (drops prior context).
  if (normalizedText === 'nuevo' || normalizedText === '/nuevo') {
    await handleFreshSession(phoneNumber);
    return;
  }

  // 7. Everything else → agentic chat. The agent handles expenses, corrections,
  // project switching (PROYECTO), summaries (RESUMEN), and questions as tools.
  await handleAgentMessage(phoneNumber, text);
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
// ============================================
// Agent Chat (new agentic flow — text)
// ============================================

// The model speaks Markdown; WhatsApp's flavor differs. Normalize so it renders.
function toWhatsAppMarkdown(s = '') {
  return s
    .replace(/\*\*(.+?)\*\*/gs, '*$1*')   // **bold** → *bold*
    .replace(/^#{1,6}\s+/gm, '')          // strip md headers
    .replace(/^\s*[-*]\s+/gm, '• ');      // list bullets → •
}

// WhatsApp adapter for the transport-agnostic agent core. Resolves the user +
// active project (reusing prepareExpenseContext), builds the live context with a
// setActiveProject capability that persists the active obra, runs one agent turn,
// and renders the reply. Handles both text and media (image/PDF/audio) — media
// callers pass `attachments` (inline base64 for the model) + `mediaUrls` (storage
// links the record_expense tool attaches to the saved expense).
async function runAgentForWhatsApp(phoneNumber, { userText, originalMessage, attachments = [], mediaUrls = null }) {
  const ctx = await prepareExpenseContext(phoneNumber);
  if (!ctx) return; // unlinked → onboarding already triggered inside

  const activeProjects = ctx.activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag }));
  const activeProject = activeProjects.find(p => p.id === ctx.activeProjectId) || null;
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const context = {
    userId: ctx.userId,
    source: 'whatsapp',
    originalMessage: originalMessage ?? userText,
    today,
    activeProjects,
    activeProject,
    categories: ctx.providerCats,
    mediaUrls,
    setActiveProject: async (id) => {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({ activeProjectId: id });
    },
  };

  try {
    const res = await runAgentTurn({ userId: ctx.userId, channel: 'whatsapp', userText, context, attachments });
    let reply = toWhatsAppMarkdown(res.reply);

    // Sessions roll over silently after inactivity (no "session ended" message).
    // Instead, the first reply of a fresh-after-inactivity session carries a faint
    // footer so the professional knows the prior thread's context is gone. Skipped
    // for first-ever messages (rolledOver is false) and for the explicit NUEVO path.
    if (res.rolledOver) {
      reply += '\n\n_Pasó un rato, así que arranco una conversación nueva (no tengo el contexto anterior)._';
    }

    // A delete that needs confirmation → render the agent's question as Sí/No
    // buttons. Tapping a button sends its title back as text, which routes to the
    // agent (with the just-asked delete in context) to fire delete with confirm.
    const needsDeleteConfirm = res.timeline?.some(
      (t) => t.tool === 'delete_expense' && t.result?.needs_confirmation
    );
    // Just created an obra → offer a one-tap shortcut into the "completar datos"
    // flow. Tapping sends the title as text; the agent then explains what's useful
    // and takes all the fields at once (update_project), never field-by-field.
    const justCreatedProject = res.timeline?.some(
      (t) => t.tool === 'create_project' && t.result?.ok
    );
    if (needsDeleteConfirm) {
      await sendWhatsAppButtons(phoneNumber, reply, [
        { id: 'confirm_yes', title: 'Sí, borrar' },
        { id: 'confirm_no', title: 'No' },
      ]);
    } else if (justCreatedProject) {
      await sendWhatsAppButtons(phoneNumber, reply, [
        { id: 'fill_project_data', title: 'Completar datos' },
      ]);
    } else {
      await sendWhatsAppMessage(phoneNumber, reply);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error in agent turn', { error, phoneNumber });
    await sendWhatsAppMessage(phoneNumber, 'Tuve un problema procesando tu mensaje. Probá de nuevo en un momento.');
  }
}

async function handleAgentMessage(phoneNumber, text) {
  await runAgentForWhatsApp(phoneNumber, { userText: text });
}

// "NUEVO" → open a fresh agent session so the next message starts with no prior
// context. Lightweight: just resolves the user and rolls the session boundary.
async function handleFreshSession(phoneNumber) {
  const linkData = await checkLinkedOrOnboard(phoneNumber);
  if (!linkData) return; // unlinked → onboarding already triggered inside
  await startFreshSession({ userId: linkData.userId, channel: 'whatsapp' });
  await sendWhatsAppMessage(phoneNumber, 'Listo, arrancamos de cero. Contame qué necesitás.');
}

// ---- Agentic media handlers ----
// Download the media, store it (so the expense links to its comprobante), then run
// the agent with the bytes inline + the storage URL. The agent reads the receipt,
// decides the type (gasto / gasto propio / cobro), and saves directly when confident.

async function handleImageMessage(phoneNumber, imageId, caption) {
  await sendWhatsAppMessage(phoneNumber, 'Recibí la foto, dame un segundo que la leo…');
  const media = await downloadWhatsAppMedia(imageId);
  if (!media) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar la imagen. Intentá de nuevo.');
    return;
  }

  let imageUrl = null;
  try {
    const compressed = await compressImage(media.base64, media.mimeType);
    if (compressed) {
      const storagePath = storageHandler.generatePath('expenses', 'receipt.jpg');
      imageUrl = await storageHandler.uploadFile(compressed.buffer, storagePath, compressed.mimeType);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading receipt image', { error });
  }

  await runAgentForWhatsApp(phoneNumber, {
    userText: caption?.trim() || 'Te mandé una foto de un comprobante.',
    originalMessage: `[Imagen] ${caption || ''}`.trim(),
    attachments: [{ mimeType: media.mimeType, data: media.base64 }],
    mediaUrls: { imageUrl, audioUrl: null, audioTranscription: null, fileUrl: null },
  });
}

async function handleAudioMessage(phoneNumber, audioId, caption) {
  await sendWhatsAppMessage(phoneNumber, 'Recibí el audio, dame un segundo que lo escucho…');
  const media = await downloadWhatsAppMedia(audioId);
  if (!media) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el audio. Intentá de nuevo.');
    return;
  }

  let audioUrl = null;
  try {
    const audioBuffer = Buffer.from(media.base64, 'base64');
    const ext = media.mimeType === 'audio/ogg' ? 'ogg' : 'audio';
    const storagePath = storageHandler.generatePath('expenses', `audio.${ext}`);
    audioUrl = await storageHandler.uploadFile(audioBuffer, storagePath, media.mimeType);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading audio file', { error });
  }

  await runAgentForWhatsApp(phoneNumber, {
    userText: caption?.trim() || 'Te mandé un audio describiendo un gasto.',
    originalMessage: `[Audio] ${caption || ''}`.trim(),
    attachments: [{ mimeType: media.mimeType, data: media.base64 }],
    mediaUrls: { imageUrl: null, audioUrl, audioTranscription: null, fileUrl: null },
  });
}

async function handleDocumentMessage(phoneNumber, documentId, caption, filename) {
  await sendWhatsAppMessage(phoneNumber, 'Recibí el PDF, dame un segundo que lo reviso…');
  const media = await downloadWhatsAppMedia(documentId);
  if (!media) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el documento. Intentá de nuevo.');
    return;
  }

  const pdfBuffer = Buffer.from(media.base64, 'base64');
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

  let fileUrl = null;
  try {
    const storagePath = storageHandler.generatePath('expenses', filename || 'document.pdf');
    fileUrl = await storageHandler.uploadFile(pdfBuffer, storagePath, 'application/pdf');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error uploading PDF document', { error });
  }

  await runAgentForWhatsApp(phoneNumber, {
    userText: caption?.trim() || `Te mandé un PDF (${filename}).`,
    originalMessage: `[Documento] ${caption || filename}`,
    attachments: [{ mimeType: 'application/pdf', data: media.base64 }],
    mediaUrls: { imageUrl: null, audioUrl: null, audioTranscription: null, fileUrl },
  });
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
