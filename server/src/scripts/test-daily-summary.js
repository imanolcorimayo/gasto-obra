import '../../lib/instrument.js';
import 'dotenv/config';
import { admin, db, COLLECTIONS } from '../config/firebase.js';
import ResendHandler from '../handlers/ResendHandler.js';
import { sendWhatsAppMessage } from '../helpers/whatsapp.js';
import { formatAmount, capitalizeFirst } from '../helpers/responseFormatter.js';
import { normalizePhoneNumber } from '../helpers/phone.js';
import logger from '../../lib/logger.js';

const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';
const MY_PHONE = '5493513467739';
const MY_EMAIL = 'imanolcorimayo@gmail.com';
const PROVIDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const resendHandler = new ResendHandler(process.env.RESEND_API_KEY);

async function getProviderInfo(providerId) {
  const linksSnapshot = await db
    .collection(COLLECTIONS.WHATSAPP_LINKS)
    .where('userId', '==', providerId)
    .where('status', '==', 'linked')
    .limit(1)
    .get();
  if (linksSnapshot.empty) return { phone: null, lastActivity: null };
  const data = linksSnapshot.docs[0].data();
  return {
    phone: linksSnapshot.docs[0].id,
    lastActivity: data.lastActivity?.toDate() || null
  };
}

async function getClientEmail(clientUserId) {
  if (!clientUserId) return null;
  try {
    const app = admin.app();
    const hasCredential = !!app.options.credential;
    if (!hasCredential) {
      console.log('    [DEBUG] No credential configured for Auth');
      return null;
    }
    const user = await admin.auth().getUser(clientUserId);
    return user.email || null;
  } catch (error) {
    console.log(`    [DEBUG] getUser(${clientUserId}) failed:`, error.code, error.message);
    return null;
  }
}

function buildSummaryMessage({ role, project, dateFormatted, todayExpenses, todayPayments, todayProviderExpenses, todayExpenseTotal, todayPaymentTotal, todayProviderExpenseTotal, accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses, balance, pendingTotal, viewUrl }) {
  const txCount = todayExpenses.length + todayPayments.length + (role === 'provider' ? todayProviderExpenses.length : 0);

  let message = `*${project.name}* - ${dateFormatted}\n`;
  message += `Se registraron *${txCount} movimiento${txCount > 1 ? 's' : ''}* hoy:\n`;

  if (todayExpenseTotal > 0) {
    message += `\n  Gastos: *${formatAmount(todayExpenseTotal)}*`;
  }
  if (todayPaymentTotal > 0) {
    message += `\n  Pagos: *${formatAmount(todayPaymentTotal)}*`;
  }
  if (role === 'provider' && todayProviderExpenseTotal > 0) {
    message += `\n  Gastos propios: *${formatAmount(todayProviderExpenseTotal)}*`;
  }

  message += `\n\n`;

  if (accumulatedPayments > 0) {
    message += `Saldo actual: *${formatAmount(balance)}*\n`;
  }
  message += `Total acumulado: *${formatAmount(accumulatedExpenses)}*`;

  if (role === 'provider' && accumulatedProviderExpenses > 0) {
    message += `\nGastos propios acumulados: *${formatAmount(accumulatedProviderExpenses)}*`;
  }

  message += `\n\nMirá el detalle completo en Gasto Obra:\n${viewUrl}`;

  return message;
}

async function testDailySummaries() {
  logger.info('Starting TEST daily summary generation');

  const now = new Date();
  const artOffset = -3 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const artNow = new Date(utcNow + artOffset * 60000);

  const todayStart = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate());
  const todayEnd = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate(), 23, 59, 59);

  const todayStartUTC = new Date(todayStart.getTime() - artOffset * 60000);
  const todayEndUTC = new Date(todayEnd.getTime() - artOffset * 60000);

  const projectsSnapshot = await db
    .collection('projects')
    .where('status', '==', 'active')
    .get();

  if (projectsSnapshot.empty) {
    console.log('No active projects found');
    return;
  }

  const dateFormatted = `${String(artNow.getDate()).padStart(2, '0')}/${String(artNow.getMonth() + 1).padStart(2, '0')}/${artNow.getFullYear()}`;

  console.log(`\n=== Daily Summary Test - ${dateFormatted} ===\n`);
  console.log(`Found ${projectsSnapshot.size} active projects\n`);

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    const clientPhone = normalizePhoneNumber(project.clientPhone);
    const clientEmail = await getClientEmail(project.clientUserId);
    const { phone: providerPhone, lastActivity } = await getProviderInfo(project.providerId);

    const providerWithin24h = lastActivity && (Date.now() - lastActivity.getTime()) < PROVIDER_WINDOW_MS;
    const lastActivityAgo = lastActivity
      ? `${Math.round((Date.now() - lastActivity.getTime()) / 3600000)}h ago`
      : 'never';

    console.log(`--- Project: ${project.name} (${projectDoc.id}) ---`);
    console.log(`  clientUserId: ${project.clientUserId || '(null)'}`);
    console.log(`  Client phone: ${clientPhone || '(none)'}${clientPhone !== project.clientPhone ? ` (normalized from ${project.clientPhone})` : ''}`);
    console.log(`  Client email: ${clientEmail || '(not linked)'}`);
    console.log(`  Provider phone: ${providerPhone || '(none)'}`);
    console.log(`  Provider last activity: ${lastActivityAgo} ${providerWithin24h ? '(within 24h - FREE)' : '(outside 24h - PAID)'}`);

    if (!clientPhone && !clientEmail && !providerPhone) {
      console.log('  SKIP: no client or provider contact\n');
      continue;
    }

    const expensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .where('date', '>=', todayStartUTC)
      .where('date', '<=', todayEndUTC)
      .get();

    const allTodayEntries = expensesSnapshot.docs.map(doc => doc.data());

    // Client sees: expense + payment
    // Provider sees: expense + payment + provider_expense
    const todayExpenses = allTodayEntries.filter(e => !e.type || e.type === 'expense');
    const todayPayments = allTodayEntries.filter(e => e.type === 'payment');
    const todayProviderExpenses = allTodayEntries.filter(e => e.type === 'provider_expense');

    if (todayExpenses.length === 0 && todayPayments.length === 0 && todayProviderExpenses.length === 0) {
      console.log('  SKIP: no expenses today\n');
      continue;
    }

    const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayPaymentTotal = todayPayments.reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayProviderExpenseTotal = todayProviderExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const allExpensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .get();

    const allEntries = allExpensesSnapshot.docs.map(doc => doc.data());
    const accumulatedExpenses = allEntries
      .filter(e => !e.type || e.type === 'expense')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const accumulatedPayments = allEntries
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const accumulatedProviderExpenses = allEntries
      .filter(e => e.type === 'provider_expense')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = accumulatedPayments - accumulatedExpenses;
    const pendingTotal = allEntries
      .filter(e => (!e.type || e.type === 'expense') && e.installmentPercent === 0)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const viewUrl = `${APP_URL}/view/${project.shareToken}`;

    const messageData = {
      project, dateFormatted, todayExpenses, todayPayments, todayProviderExpenses,
      todayExpenseTotal, todayPaymentTotal, todayProviderExpenseTotal,
      accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses,
      balance, pendingTotal, viewUrl
    };

    // Skip client message if only provider_expense activity today
    const hasClientActivity = todayExpenses.length > 0 || todayPayments.length > 0;
    const clientMessage = hasClientActivity ? buildSummaryMessage({ role: 'client', ...messageData }) : null;
    const providerMessage = buildSummaryMessage({ role: 'provider', ...messageData });

    // Build email template variables
    function buildEmailVars(role) {
      const todayRows = [];
      if (todayExpenseTotal > 0) todayRows.push(row('Gastos', formatAmount(todayExpenseTotal)));
      if (todayPaymentTotal > 0) todayRows.push(row('Pagos', formatAmount(todayPaymentTotal)));
      if (role === 'provider' && todayProviderExpenseTotal > 0) todayRows.push(row('Gastos propios', formatAmount(todayProviderExpenseTotal)));

      const statsRows = [];
      statsRows.push(row('Total acumulado', formatAmount(accumulatedExpenses)));
      if (role === 'provider' && accumulatedProviderExpenses > 0) statsRows.push(row('Gastos propios acum.', formatAmount(accumulatedProviderExpenses)));
      if (accumulatedPayments > 0) {
        statsRows.push(row('Total pagos', formatAmount(accumulatedPayments)));
        const balanceColor = balance >= 0 ? '#3E9954' : '#C74840';
        statsRows.push(`<tr><td class="label">Saldo</td><td class="value" style="color: ${balanceColor};">${formatAmount(balance)}</td></tr>`);
      }

      return {
        Project_Name: project.name,
        Date: dateFormatted,
        Today_Rows: todayRows.join(''),
        Stats_Rows: statsRows.join(''),
        View_Url: viewUrl
      };
    }

    function row(label, value) {
      return `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
    }

    const isMyPhone = (phone) => phone === MY_PHONE;

    // Send to client (prefer email if linked, fallback to WhatsApp)
    if (clientMessage) {
      if (clientEmail) {
        console.log(`  Sending email to ${MY_EMAIL} (original: ${clientEmail})...`);
        const vars = buildEmailVars('client');
        const result = await resendHandler.sendEmail(MY_EMAIL, `${project.name} — Resumen ${dateFormatted}`, 'daily-summary', vars);
        console.log(`  ${result.success ? 'SENT' : 'FAILED'}: ${result.emailId || result.error}`);
      } else if (clientPhone) {
        if (isMyPhone(clientPhone)) {
          console.log(`  SENDING WhatsApp to client (${clientPhone})...`);
          await sendWhatsAppMessage(clientPhone, clientMessage);
          console.log('  SENT!');
        } else {
          console.log(`  [DRY RUN] Client WhatsApp (${clientPhone}) - PAID:`);
          console.log(clientMessage.split('\n').map(l => `    ${l}`).join('\n'));
        }
      } else {
        console.log('  No client contact (no email, no phone)');
      }
    } else {
      console.log('  No client message (only provider_expense activity today)');
    }

    // Send to provider (only if within 24h window)
    if (providerPhone) {
      if (!providerWithin24h) {
        console.log(`  SKIP provider WhatsApp (last activity: ${lastActivityAgo}) - would be PAID`);
      } else if (isMyPhone(providerPhone)) {
        console.log(`  SENDING WhatsApp to provider (${providerPhone}) - FREE...`);
        await sendWhatsAppMessage(providerPhone, providerMessage);
        console.log('  SENT!');
      } else {
        console.log(`  [DRY RUN] Provider WhatsApp (${providerPhone}) - FREE:`);
        console.log(providerMessage.split('\n').map(l => `    ${l}`).join('\n'));
      }
    } else {
      console.log('  Provider has no linked WhatsApp');
    }

    console.log('');
  }

  console.log('=== Test complete ===');
}

testDailySummaries()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Fatal error', { error });
    console.error(error);
    process.exit(1);
  });
