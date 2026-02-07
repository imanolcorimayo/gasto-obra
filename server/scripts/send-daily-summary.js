import 'dotenv/config';
import admin from 'firebase-admin';

// ============================================
// Configuration
// ============================================
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
}

const db = admin.firestore();

// ============================================
// Helpers
// ============================================
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

async function sendWhatsAppMessage(to, message) {
  const normalizedTo = normalizePhoneNumber(to);

  if (!WP_PHONE_NUMBER_ID || !WP_ACCESS_TOKEN) {
    console.log(`[DRY RUN] Would send to ${normalizedTo}:\n${message}\n`);
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
          text: { preview_url: true, body: message }
        })
      }
    );

    const result = await response.json();
    if (!response.ok) {
      console.error(`Error sending to ${normalizedTo}:`, result);
    } else {
      console.log(`Summary sent to ${normalizedTo}`);
    }
  } catch (error) {
    console.error(`Error sending to ${normalizedTo}:`, error);
  }
}

// ============================================
// Main
// ============================================
async function sendDailySummaries() {
  console.log('Starting daily summary generation...');

  // Get today's date range (ART timezone)
  const now = new Date();
  const artOffset = -3 * 60; // ART is UTC-3
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const artNow = new Date(utcNow + artOffset * 60000);

  const todayStart = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate());
  const todayEnd = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate(), 23, 59, 59);

  // Convert back to UTC for Firestore query
  const todayStartUTC = new Date(todayStart.getTime() - artOffset * 60000);
  const todayEndUTC = new Date(todayEnd.getTime() - artOffset * 60000);

  // Get all active projects
  const projectsSnapshot = await db
    .collection('projects')
    .where('status', '==', 'active')
    .get();

  if (projectsSnapshot.empty) {
    console.log('No active projects found.');
    return;
  }

  const dateFormatted = `${String(artNow.getDate()).padStart(2, '0')}/${String(artNow.getMonth() + 1).padStart(2, '0')}/${artNow.getFullYear()}`;

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();

    if (!project.clientPhone) {
      console.log(`Project "${project.name}" has no client phone, skipping.`);
      continue;
    }

    // Get today's expenses for this project
    const expensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .where('date', '>=', todayStartUTC)
      .where('date', '<=', todayEndUTC)
      .get();

    if (expensesSnapshot.empty) {
      console.log(`No expenses today for project "${project.name}", skipping.`);
      continue;
    }

    const expenses = expensesSnapshot.docs.map(doc => doc.data());
    const todayTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Get accumulated total for the project
    const allExpensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .get();

    const accumulatedTotal = allExpensesSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0), 0
    );

    // Build expense list
    const expenseLines = expenses
      .map(e => {
        const cat = e.category ? ` (${capitalizeFirst(e.category)})` : '';
        return `  ${formatAmount(e.amount)} - ${e.title}${cat}`;
      })
      .join('\n');

    // Build message
    const viewUrl = `${APP_URL}/view/${project.shareToken}`;

    const message = `*Resumen del dia - ${project.name}*
Fecha: ${dateFormatted}

*Gastos de hoy:*
${expenseLines}

*Total del dia:* ${formatAmount(todayTotal)}
*Total acumulado del proyecto:* ${formatAmount(accumulatedTotal)}

Ver detalle: ${viewUrl}`;

    await sendWhatsAppMessage(project.clientPhone, message);
  }

  console.log('Daily summary generation complete.');
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run
sendDailySummaries()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
