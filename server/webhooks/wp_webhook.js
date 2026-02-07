import 'dotenv/config';
import express from 'express';
import admin from 'firebase-admin';
import GeminiHandler from '../handlers/GeminiHandler.js';

// ============================================
// Configuration
// ============================================
const app = express();
const PORT = process.env.PORT || 4001;
const VERIFY_TOKEN = process.env.WP_VERIFY_TOKEN || 'gasto_obra_verify';
const WP_PHONE_NUMBER_ID = process.env.IDENTIFIER_WP_NUMBER;
const WP_ACCESS_TOKEN = process.env.ACCESS_TOKEN_WP_BUSINESS;
const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';

// ============================================
// Firebase Admin Initialization
// ============================================
if (!admin.apps.length) {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    firebaseConfig.credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
}

const db = admin.firestore();
console.log('Firestore connection established');

// ============================================
// Collections
// ============================================
const COLLECTIONS = {
  WHATSAPP_LINKS: 'whatsappLinks',
  PROJECTS: 'projects',
  EXPENSES: 'expenses'
};

// ============================================
// Default expense categories
// ============================================
const EXPENSE_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];

// ============================================
// Gemini Handler
// ============================================
const geminiHandler = process.env.GEMINI_API_KEY
  ? new GeminiHandler(process.env.GEMINI_API_KEY)
  : null;

// ============================================
// Pending Expenses (audio without project tag)
// ============================================
const PENDING_EXPENSE_TTL = 10 * 60 * 1000; // 10 minutes
const pendingExpenses = new Map(); // phoneNumber -> { data, userId, timestamp, pendingConfirmation? }

function setPendingExpense(phoneNumber, userId, expenseData) {
  pendingExpenses.set(phoneNumber, {
    data: expenseData,
    userId,
    timestamp: Date.now()
  });
  // Auto-cleanup after TTL
  setTimeout(() => {
    const pending = pendingExpenses.get(phoneNumber);
    if (pending && pending.timestamp === expenseData.timestamp) {
      pendingExpenses.delete(phoneNumber);
    }
  }, PENDING_EXPENSE_TTL);
}

function setPendingConfirmation(phoneNumber, userId, expenseData) {
  pendingExpenses.set(phoneNumber, {
    data: expenseData,
    userId,
    timestamp: Date.now(),
    pendingConfirmation: true
  });
  // Auto-cleanup after TTL
  setTimeout(() => {
    const pending = pendingExpenses.get(phoneNumber);
    if (pending && pending.pendingConfirmation && pending.timestamp === expenseData.timestamp) {
      pendingExpenses.delete(phoneNumber);
    }
  }, PENDING_EXPENSE_TTL);
}

function getPendingExpense(phoneNumber) {
  const pending = pendingExpenses.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > PENDING_EXPENSE_TTL) {
    pendingExpenses.delete(phoneNumber);
    return null;
  }
  return pending;
}

function clearPendingExpense(phoneNumber) {
  pendingExpenses.delete(phoneNumber);
}

// ============================================
// Middleware
// ============================================
app.use(express.json());

// ============================================
// Routes
// ============================================

// GET - Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Verification request received:', { mode, token, challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.log('Webhook verification failed');
  return res.sendStatus(403);
});

// POST - Receive incoming messages
app.post('/webhook', async (req, res) => {
  console.log('Incoming webhook:', JSON.stringify(req.body, null, 2));

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
      console.log(`Text from ${from} (${contactName}): ${messageText}`);
      await processMessage(from, messageText, contactName);
    } else if (message.type === 'image') {
      const caption = message.image?.caption || '';
      const imageId = message.image?.id;
      console.log(`Image from ${from} (${contactName}), caption: ${caption}`);
      await processImageMessage(from, imageId, caption, contactName);
    } else if (message.type === 'audio') {
      const caption = message.audio?.caption || '';
      const audioId = message.audio?.id;
      console.log(`Audio from ${from} (${contactName})`);
      await processAudioMessage(from, audioId, caption, contactName);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

// ============================================
// Message Processing
// ============================================

async function processMessage(phoneNumber, text, contactName) {
  const normalizedText = text.trim().toLowerCase();

  // Check if this is a confirmation reply for a pending expense
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

  // Check if this is a project selection for a pending expense (non-confirmation)
  const tagOnlyMatch = text.trim().match(/^#(\S+)$/);
  if (tagOnlyMatch) {
    if (pending && !pending.pendingConfirmation) {
      await completePendingExpense(phoneNumber, pending, tagOnlyMatch[1].toLowerCase());
      return;
    }
  }

  // Check for VINCULAR command
  if (normalizedText.startsWith('vincular ')) {
    const code = text.trim().split(' ')[1]?.toUpperCase();
    await handleLinkCommand(phoneNumber, code, contactName);
    return;
  }

  // Check for DESVINCULAR command
  if (normalizedText === 'desvincular') {
    await handleUnlinkCommand(phoneNumber);
    return;
  }

  // Check for AYUDA command
  if (normalizedText === 'ayuda' || normalizedText === 'help') {
    await sendHelpMessage(phoneNumber);
    return;
  }

  // Check for PROYECTOS command
  if (normalizedText === 'proyectos') {
    await handleProyectosCommand(phoneNumber);
    return;
  }

  // Check for RESUMEN #tag command
  if (normalizedText.startsWith('resumen ')) {
    const tagMatch = text.match(/#(\S+)/);
    if (tagMatch) {
      await handleResumenCommand(phoneNumber, tagMatch[1].toLowerCase());
    } else {
      await sendWhatsAppMessage(phoneNumber, 'Formato: RESUMEN #tag\n\nEjemplo: RESUMEN #flores3b');
    }
    return;
  }

  // Check for PAGO command
  if (normalizedText.startsWith('pago ')) {
    await handlePagoCommand(phoneNumber, text);
    return;
  }

  // Check for PROPIO command
  if (normalizedText.startsWith('propio ')) {
    await handlePropioCommand(phoneNumber, text);
    return;
  }

  // Try to parse as expense
  await handleExpenseMessage(phoneNumber, text);
}

// ============================================
// Image Message Processing
// ============================================

async function processImageMessage(phoneNumber, imageId, caption, contactName) {
  // Check if linked
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();
  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado. Envia VINCULAR <codigo> para vincular tu cuenta.');
    return;
  }

  const userId = linkDoc.data().userId;

  // Extract project tag from caption
  const tagMatch = caption.match(/#(\S+)/);
  if (!tagMatch) {
    await sendWhatsAppMessage(phoneNumber, 'Incluí el tag del proyecto en el caption de la imagen.\n\nEjemplo: foto + caption "#flores3b"');
    return;
  }

  const tag = tagMatch[1].toLowerCase();
  const project = await findProjectByTag(userId, tag);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${tag}.\n\nEnvia PROYECTOS para ver tus proyectos activos.`);
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de imagenes no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando imagen...');

  // Download image from WhatsApp
  const imageData = await downloadWhatsAppMedia(imageId);
  if (!imageData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar la imagen. Intenta nuevamente.');
    return;
  }

  // Parse receipt with Gemini
  const receiptData = await geminiHandler.parseReceiptImage(imageData.base64, imageData.mimeType);

  if (!receiptData || !receiptData.totalAmount) {
    await sendWhatsAppMessage(phoneNumber, 'No pude leer el ticket. Intenta con una foto mas clara o registra el gasto manualmente.');
    return;
  }

  // Create expense data
  const title = receiptData.storeName || receiptData.items?.[0] || 'Ticket';
  const description = receiptData.items ? receiptData.items.join(', ') : '';
  const category = await geminiHandler.categorizeExpense(title, description);

  // Build line items if available
  const items = receiptData.lineItems && receiptData.lineItems.length > 0
    ? receiptData.lineItems.map(li => ({ name: li.name || li, amount: li.amount || 0 }))
    : null;

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount: receiptData.totalAmount,
    category,
    type: 'expense',
    items,
    imageUrl: null,
    audioTranscription: null,
    originalMessage: `[Imagen] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  // Set as pending confirmation
  setPendingConfirmation(phoneNumber, userId, expenseData);

  const formattedAmount = formatAmount(receiptData.totalAmount);
  await sendWhatsAppMessage(
    phoneNumber,
    `Entendi: ${formattedAmount} - ${title}\n${capitalizeFirst(category)} - #${project.tag}\n${description ? `_${description}_\n` : ''}\nResponde *si* para confirmar o *no* para cancelar.`
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

  const userId = linkDoc.data().userId;

  // Extract project tag from caption (if any)
  const tagMatch = caption.match(/#(\S+)/);

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El procesamiento de audio no esta disponible.');
    return;
  }

  await sendWhatsAppMessage(phoneNumber, 'Procesando audio...');

  // Download audio from WhatsApp
  const audioData = await downloadWhatsAppMedia(audioId);
  if (!audioData) {
    await sendWhatsAppMessage(phoneNumber, 'Error al descargar el audio. Intenta nuevamente.');
    return;
  }

  // Get active projects for this user (for Gemini context + matching)
  const activeProjects = await getActiveProjects(userId);

  // Transcribe with Gemini, passing active projects for context
  const transcription = await geminiHandler.transcribeAudio(audioData.base64, audioData.mimeType, activeProjects);

  if (!transcription || (!transcription.amount && !transcription.title)) {
    await sendWhatsAppMessage(phoneNumber, 'No pude entender el audio. Intenta nuevamente o registra el gasto por texto.');
    return;
  }

  const title = transcription.title || 'Gasto por audio';
  const amount = transcription.amount || 0;
  const description = transcription.description || '';
  const category = transcription.category || await geminiHandler.categorizeExpense(title, description);

  if (amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, `Transcripcion: "${transcription.transcription}"\n\nNo pude determinar el monto. Registra el gasto manualmente.`);
    return;
  }

  // Find project: 1) caption tag, 2) AI-detected from audio, 3) only active project, 4) ask user
  let project = null;

  // 1. From caption tag
  if (tagMatch) {
    project = await findProjectByTag(userId, tagMatch[1].toLowerCase());
  }

  // 2. From AI-detected project reference in audio
  if (!project && transcription.projectReference) {
    project = matchProjectFromReference(activeProjects, transcription.projectReference);
  }

  // 3. If user has only one active project, use it
  if (!project && activeProjects.length === 1) {
    project = activeProjects[0];
  }

  // 4. Can't determine - save as pending and ask user to pick
  if (!project) {
    if (activeProjects.length === 0) {
      await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos. Crea uno desde la app web.');
      return;
    }

    // Save pending expense (project selection, NOT confirmation)
    setPendingExpense(phoneNumber, userId, {
      title,
      amount,
      description,
      category,
      type: 'expense',
      transcription: transcription.transcription,
      originalCaption: caption,
      timestamp: Date.now()
    });

    let message = `Entendi el gasto:\n*${title}* - ${formatAmount(amount)}\n\n`;
    message += `A que proyecto corresponde? Responde con el *#tag*:\n\n`;

    for (const p of activeProjects) {
      message += `*${p.name}* → #${p.tag}\n`;
    }

    message += `\n_Tenes 10 minutos para responder._`;

    await sendWhatsAppMessage(phoneNumber, message);
    return;
  }

  // Set as pending confirmation instead of saving directly
  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description,
    amount,
    category,
    type: 'expense',
    items: null,
    imageUrl: null,
    audioTranscription: transcription.transcription || null,
    originalMessage: `[Audio] ${caption}`,
    source: 'whatsapp',
    projectTag: project.tag,
    projectName: project.name,
    timestamp: Date.now()
  };

  setPendingConfirmation(phoneNumber, userId, expenseData);

  const formattedAmount = formatAmount(amount);
  await sendWhatsAppMessage(
    phoneNumber,
    `Entendi: ${formattedAmount} - ${title}\n${capitalizeFirst(category)} - #${project.tag}\n${description ? `_${description}_\n` : ''}\nResponde *si* para confirmar o *no* para cancelar.`
  );
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
    items: data.items || null,
    imageUrl: data.imageUrl || null,
    audioTranscription: data.audioTranscription || null,
    originalMessage: data.originalMessage || '',
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(COLLECTIONS.EXPENSES).add(expenseDoc);

  const formattedAmount = formatAmount(data.amount);
  const typeLabel = data.type === 'payment' ? 'Pago registrado' : data.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto registrado';

  await sendWhatsAppMessage(
    phoneNumber,
    `${typeLabel}!\n\n*${data.title}*\n${formattedAmount}\n#${data.projectTag} - ${capitalizeFirst(data.category)}\n${data.description ? `_${data.description}_` : ''}`
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
    console.error('Error notifying client:', error);
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

    // Create linked account
    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).set({
      status: 'linked',
      userId: codeData.userId,
      phoneNumber: phoneNumber,
      contactName: contactName,
      linkedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await sendWhatsAppMessage(
      phoneNumber,
      `Cuenta vinculada!\n\nAhora podes registrar gastos de obra:\n\n\`$500 Clavos y tornillos #flores3b\`\n\`$1200 Viaje ferreteria #flores3b\`\n\nEscribi AYUDA para mas info.`
    );
  } catch (error) {
    console.error('Error linking account:', error);
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
    console.error('Error unlinking account:', error);
    await sendWhatsAppMessage(phoneNumber, 'Error al desvincular la cuenta. Intenta nuevamente.');
  }
}

async function sendHelpMessage(phoneNumber) {
  const helpText = `*Gasto Obra - Ayuda*

*Formato:*
\`$<monto> <titulo> #<tag>\`

*Opcionales:*
\`d:<descripcion>\` - Detalle
\`c:<categoria>\` - Categoria manual

*Ejemplos:*
\`$500 Clavos #flores3b\`
\`$1200 Viaje ferreteria #flores3b d:Fui a Easy\`
\`$3000 Ayudante #flores3b c:mano de obra\`

*Tambien podes enviar:*
- Foto de ticket + caption con #tag
- Audio describiendo el gasto + caption con #tag

*Pagos y gastos propios:*
\`PAGO $5000 #flores3b\` - Registrar pago del cliente
\`PROPIO $500 Tornillos #flores3b\` - Registrar gasto propio

*Categorias:*
materiales, herramientas, transporte, mano de obra, comida, otros

*Comandos:*
PROYECTOS - Ver tus proyectos activos
RESUMEN #tag - Resumen de un proyecto
PAGO $monto #tag - Registrar pago del cliente
PROPIO $monto titulo #tag - Registrar gasto propio
AYUDA - Ver este mensaje`;

  await sendWhatsAppMessage(phoneNumber, helpText);
}

async function handleProyectosCommand(phoneNumber) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const userId = linkDoc.data().userId;

  try {
    const projectsSnapshot = await db
      .collection(COLLECTIONS.PROJECTS)
      .where('providerId', '==', userId)
      .where('status', '==', 'active')
      .get();

    if (projectsSnapshot.empty) {
      await sendWhatsAppMessage(phoneNumber, 'No tenes proyectos activos.\n\nCrea uno desde la app web.');
      return;
    }

    let message = '*Tus proyectos activos:*\n\n';

    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();

      // Get expense total for this project
      const expensesSnapshot = await db
        .collection(COLLECTIONS.EXPENSES)
        .where('projectId', '==', doc.id)
        .get();

      const total = expensesSnapshot.docs.reduce((sum, e) => sum + (e.data().amount || 0), 0);

      message += `*${project.name}*\n`;
      message += `Tag: #${project.tag}\n`;
      message += `Total: ${formatAmount(total)}\n\n`;
    }

    await sendWhatsAppMessage(phoneNumber, message.trim());
  } catch (error) {
    console.error('Error in PROYECTOS command:', error);
    await sendWhatsAppMessage(phoneNumber, 'Error al obtener los proyectos.');
  }
}

async function handleResumenCommand(phoneNumber, tag) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const userId = linkDoc.data().userId;
  const project = await findProjectByTag(userId, tag);

  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${tag}.\n\nEnvia PROYECTOS para ver tus proyectos activos.`);
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
    console.error('Error in RESUMEN command:', error);
    await sendWhatsAppMessage(phoneNumber, 'Error al obtener el resumen.');
  }
}

// ============================================
// PAGO Command Handler
// ============================================

async function handlePagoCommand(phoneNumber, text) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const userId = linkDoc.data().userId;

  // Parse: PAGO $5000 #tag or PAGO $5000 Concepto #tag
  const match = text.trim().match(/^pago\s+\$?\s*([\d.,]+)\s*(.*)/i);
  if (!match) {
    await sendWhatsAppMessage(phoneNumber, 'Formato: PAGO $5000 #tag\n\nEjemplo: PAGO $5000 #flores3b');
    return;
  }

  let amountStr = match[1].replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(amountStr);
  const rest = match[2].trim();

  if (isNaN(amount) || amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, 'Monto invalido.');
    return;
  }

  // Extract tag
  const tagMatch = rest.match(/#(\S+)/);
  if (!tagMatch) {
    await sendWhatsAppMessage(phoneNumber, 'Falta el tag del proyecto.\n\nFormato: PAGO $5000 #flores3b');
    return;
  }

  const tag = tagMatch[1].toLowerCase();
  const project = await findProjectByTag(userId, tag);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${tag}.`);
    return;
  }

  // Extract title (anything between amount and tag)
  let title = rest.replace(/#\S+/, '').trim();
  if (!title) title = 'Pago del cliente';

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title,
    description: '',
    amount,
    category: 'pago',
    type: 'payment',
    items: null,
    imageUrl: null,
    audioTranscription: null,
    originalMessage: text,
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(COLLECTIONS.EXPENSES).add(expenseData);

  const formattedAmount = formatAmount(amount);
  await sendWhatsAppMessage(
    phoneNumber,
    `Pago registrado!\n\n*${title}*\n${formattedAmount}\n#${project.tag}`
  );

  // Notify client
  await notifyClient(project.id, amount, project.name, 'payment');
}

// ============================================
// PROPIO Command Handler
// ============================================

async function handlePropioCommand(phoneNumber, text) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(phoneNumber, 'Este numero no esta vinculado a ninguna cuenta.');
    return;
  }

  const userId = linkDoc.data().userId;

  // Parse: PROPIO $500 Tornillos #tag
  const match = text.trim().match(/^propio\s+\$?\s*([\d.,]+)\s+(.*)/i);
  if (!match) {
    await sendWhatsAppMessage(phoneNumber, 'Formato: PROPIO $500 Titulo #tag\n\nEjemplo: PROPIO $500 Tornillos #flores3b');
    return;
  }

  let amountStr = match[1].replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(amountStr);
  const rest = match[2].trim();

  if (isNaN(amount) || amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, 'Monto invalido.');
    return;
  }

  // Extract tag
  const tagMatch = rest.match(/#(\S+)/);
  if (!tagMatch) {
    await sendWhatsAppMessage(phoneNumber, 'Falta el tag del proyecto.\n\nFormato: PROPIO $500 Titulo #flores3b');
    return;
  }

  const tag = tagMatch[1].toLowerCase();
  const project = await findProjectByTag(userId, tag);
  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${tag}.`);
    return;
  }

  // Extract title
  let title = rest.replace(/#\S+/, '').trim();
  if (!title) title = 'Gasto propio';

  // Determine category
  let category = 'otros';
  if (geminiHandler) {
    category = await geminiHandler.categorizeExpense(title, '');
    const normalizedCategory = category.toLowerCase();
    const matchedCategory = EXPENSE_CATEGORIES.find(c => c.includes(normalizedCategory) || normalizedCategory.includes(c));
    category = matchedCategory || 'otros';
  }

  const expenseData = {
    projectId: project.id,
    providerId: userId,
    title: capitalizeFirst(title),
    description: '',
    amount,
    category,
    type: 'provider_expense',
    items: null,
    imageUrl: null,
    audioTranscription: null,
    originalMessage: text,
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(COLLECTIONS.EXPENSES).add(expenseData);

  const formattedAmount = formatAmount(amount);
  await sendWhatsAppMessage(
    phoneNumber,
    `Gasto propio registrado!\n\n*${capitalizeFirst(title)}*\n${formattedAmount}\n#${project.tag} - ${capitalizeFirst(category)}`
  );
}

// ============================================
// Expense Message Handler
// ============================================

async function handleExpenseMessage(phoneNumber, text) {
  const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

  if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
    await sendWhatsAppMessage(
      phoneNumber,
      'Este numero no esta vinculado a ninguna cuenta.\n\nPara vincular:\n1. Ingresa a la app web\n2. Ve a Configuracion > WhatsApp\n3. Genera un codigo\n4. Envialo: VINCULAR <codigo>'
    );
    return;
  }

  const userId = linkDoc.data().userId;

  // Parse the expense message
  const parsed = parseExpenseMessage(text);

  if (!parsed) {
    await sendWhatsAppMessage(
      phoneNumber,
      `No pude entender el mensaje.\n\n*Formato:*\n\`$<monto> <titulo> #<tag>\`\n\n*Ejemplo:*\n\`$500 Clavos #flores3b\`\n\nEscribi AYUDA para mas info.`
    );
    return;
  }

  // Find project by tag
  if (!parsed.projectTag) {
    await sendWhatsAppMessage(
      phoneNumber,
      `Falta el tag del proyecto.\n\n*Formato:*\n\`$500 Clavos #flores3b\`\n\nEnvia PROYECTOS para ver tus tags.`
    );
    return;
  }

  const project = await findProjectByTag(userId, parsed.projectTag);

  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${parsed.projectTag}.\n\nEnvia PROYECTOS para ver tus proyectos activos.`);
    return;
  }

  try {
    // Determine category
    let category = parsed.category;
    if (!category && geminiHandler) {
      category = await geminiHandler.categorizeExpense(parsed.title, parsed.description);
    }
    if (!category) {
      category = 'otros';
    }

    // Validate category
    const normalizedCategory = category.toLowerCase();
    const matchedCategory = EXPENSE_CATEGORIES.find(c => c.includes(normalizedCategory) || normalizedCategory.includes(c));
    category = matchedCategory || 'otros';

    const expenseData = {
      projectId: project.id,
      providerId: userId,
      title: parsed.title,
      description: parsed.description,
      amount: parsed.amount,
      category,
      type: 'expense',
      items: null,
      imageUrl: null,
      audioTranscription: null,
      originalMessage: text,
      source: 'whatsapp',
      date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(COLLECTIONS.EXPENSES).add(expenseData);

    const formattedAmount = formatAmount(parsed.amount);

    let successMessage = `Gasto registrado!\n\n*${parsed.title}*\n${formattedAmount}\n#${project.tag} - ${capitalizeFirst(category)}`;

    if (parsed.description) {
      successMessage += `\n_${parsed.description}_`;
    }

    await sendWhatsAppMessage(phoneNumber, successMessage);

    // Notify client
    await notifyClient(project.id, parsed.amount, project.name, 'expense');
  } catch (error) {
    console.error('Error creating expense:', error);
    await sendWhatsAppMessage(phoneNumber, 'Error al registrar el gasto. Intenta nuevamente.');
  }
}

// ============================================
// Helper Functions
// ============================================

function parseExpenseMessage(text) {
  const cleanText = text.trim();

  // Extract amount
  const amountRegex = /^\$?\s*([\d.,]+)\s+(.+)$/i;
  const match = cleanText.match(amountRegex);

  if (!match) {
    return null;
  }

  let amountStr = match[1];
  let rest = match[2].trim();

  // Normalize Argentine amount format
  amountStr = amountStr.replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // Extract project tag (#tag)
  let projectTag = null;
  const tagMatch = rest.match(/#(\S+)/);
  if (tagMatch) {
    projectTag = tagMatch[1].toLowerCase();
    rest = rest.replace(/#\S+/, '').trim();
  }

  // Extract category (c:)
  let category = null;
  const catMatch = rest.match(/c:(.+?)(?=d:|$)/i);
  if (catMatch) {
    category = catMatch[1].trim().toLowerCase();
    rest = rest.replace(/c:.+?(?=d:|$)/i, '').trim();
  }

  // Extract description (d:)
  let description = '';
  const descMatch = rest.match(/d:(.+?)$/i);
  if (descMatch) {
    description = descMatch[1].trim();
    rest = rest.replace(/d:.+?$/i, '').trim();
  }

  // What remains is the title
  const title = capitalizeFirst(rest.trim());

  if (!title) {
    return null;
  }

  return {
    amount,
    title,
    projectTag,
    category,
    description
  };
}

async function getActiveProjects(userId) {
  const snapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('providerId', '==', userId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function matchProjectFromReference(projects, reference) {
  if (!reference) return null;
  const ref = reference.toLowerCase().trim();

  // Exact tag match
  const byTag = projects.find(p => p.tag === ref);
  if (byTag) return byTag;

  // Tag contained in reference
  const byTagPartial = projects.find(p => ref.includes(p.tag));
  if (byTagPartial) return byTagPartial;

  // Project name match (case-insensitive, partial)
  const byName = projects.find(p => {
    const name = p.name.toLowerCase();
    return ref.includes(name) || name.includes(ref);
  });
  if (byName) return byName;

  // Word overlap: match if any significant word from the reference matches project name words
  const refWords = ref.split(/\s+/).filter(w => w.length > 2);
  const byWord = projects.find(p => {
    const nameWords = p.name.toLowerCase().split(/\s+/);
    return refWords.some(rw => nameWords.some(nw => nw.includes(rw) || rw.includes(nw)));
  });
  if (byWord) return byWord;

  return null;
}

async function completePendingExpense(phoneNumber, pending, tag) {
  const project = await findProjectByTag(pending.userId, tag);

  if (!project) {
    await sendWhatsAppMessage(phoneNumber, `No se encontro el proyecto con tag #${tag}.\n\nEnvia PROYECTOS para ver tus tags.`);
    return;
  }

  clearPendingExpense(phoneNumber);

  const { data } = pending;
  const expenseData = {
    projectId: project.id,
    providerId: pending.userId,
    title: data.title,
    description: data.description,
    amount: data.amount,
    category: data.category,
    type: data.type || 'expense',
    items: null,
    imageUrl: null,
    audioTranscription: data.transcription || null,
    originalMessage: `[Audio] ${data.originalCaption || ''}`,
    source: 'whatsapp',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(COLLECTIONS.EXPENSES).add(expenseData);

  const formattedAmount = formatAmount(data.amount);
  await sendWhatsAppMessage(
    phoneNumber,
    `Gasto registrado desde audio!\n\n*${data.title}*\n${formattedAmount}\n#${project.tag} - ${capitalizeFirst(data.category)}\n${data.description ? `_${data.description}_` : ''}`
  );

  // Notify client
  await notifyClient(project.id, data.amount, project.name, 'expense');
}

async function findProjectByTag(userId, tag) {
  const projectsSnapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('providerId', '==', userId)
    .where('tag', '==', tag)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (projectsSnapshot.empty) {
    return null;
  }

  return { id: projectsSnapshot.docs[0].id, ...projectsSnapshot.docs[0].data() };
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAmount(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}

function normalizePhoneNumber(phone) {
  if (phone.startsWith('549') && phone.length === 13) {
    return '54' + phone.slice(3);
  }
  return phone;
}

async function downloadWhatsAppMedia(mediaId) {
  if (!WP_ACCESS_TOKEN) {
    console.log('WhatsApp credentials not configured, cannot download media');
    return null;
  }

  try {
    // Step 1: Get media URL
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: { 'Authorization': `Bearer ${WP_ACCESS_TOKEN}` }
      }
    );

    if (!mediaResponse.ok) {
      console.error('Error getting media URL:', await mediaResponse.text());
      return null;
    }

    const mediaInfo = await mediaResponse.json();
    const mediaUrl = mediaInfo.url;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';

    // Step 2: Download media
    const downloadResponse = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${WP_ACCESS_TOKEN}` }
    });

    if (!downloadResponse.ok) {
      console.error('Error downloading media');
      return null;
    }

    const buffer = await downloadResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { base64, mimeType };
  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    return null;
  }
}

async function sendWhatsAppMessage(to, message) {
  const normalizedTo = normalizePhoneNumber(to);

  if (!WP_PHONE_NUMBER_ID || !WP_ACCESS_TOKEN) {
    console.log('WhatsApp credentials not configured, skipping message send');
    console.log(`Would send to ${normalizedTo}: ${message}`);
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Error sending WhatsApp message:', result);
    } else {
      console.log('WhatsApp message sent successfully:', result);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`Gasto Obra webhook server running on port ${PORT}`);
  console.log(`Verify token: ${VERIFY_TOKEN}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});
