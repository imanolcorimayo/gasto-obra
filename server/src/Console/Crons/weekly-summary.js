import '../../../lib/instrument.js';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { admin, db, COLLECTIONS } from '../../config/firebase.js';
import ResendHandler from '../../handlers/ResendHandler.js';
import { sendWhatsAppMessage } from '../../helpers/whatsapp.js';
import { formatAmount } from '../../helpers/responseFormatter.js';
import { normalizePhoneNumber } from '../../helpers/phone.js';
import logger from '../../../lib/logger.js';
import { purgeExpiredSnapshots } from '../../snapshots/repo.js';

const APP_URL = process.env.APP_URL || 'https://gastoobra.com';
const PROVIDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const resendHandler = process.env.RESEND_API_KEY
  ? new ResendHandler(process.env.RESEND_API_KEY)
  : null;

// When set, only send to recipients matching these substrings (for testing)
const SUMMARY_EMAIL_FILTER = process.env.SUMMARY_EMAIL_FILTER || '';
const SUMMARY_PHONE_FILTER = process.env.SUMMARY_PHONE_FILTER || '';

function shouldSendEmail(email) {
  return email && (!SUMMARY_EMAIL_FILTER || email.includes(SUMMARY_EMAIL_FILTER));
}

function shouldSendWhatsApp(phone) {
  return phone && (!SUMMARY_PHONE_FILTER || phone.includes(SUMMARY_PHONE_FILTER));
}

// ============================================
// Helpers
// ============================================

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

async function getUserInfo(userId) {
  if (!userId) return { email: null, name: null };
  try {
    const user = await admin.auth().getUser(userId);
    const name = user.displayName?.split(' ')[0] || null;
    return { email: user.email || null, name };
  } catch {
    return { email: null, name: null };
  }
}

function buildWhatsAppMessage({ role, project, dateFormatted, weekExpenses, weekPayments, weekProviderExpenses, weekExpenseTotal, weekPaymentTotal, weekProviderExpenseTotal, accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses, balance, viewUrl }) {
  const txCount = weekExpenses.length + weekPayments.length + (role === 'provider' ? weekProviderExpenses.length : 0);

  let message = `*${project.name}* - Semana ${dateFormatted}\n`;
  message += `Se registraron *${txCount} movimiento${txCount > 1 ? 's' : ''}* esta semana:\n`;

  if (weekExpenseTotal > 0) message += `\n  Gastos: *${formatAmount(weekExpenseTotal)}*`;
  if (weekPaymentTotal > 0) message += `\n  Pagos: *${formatAmount(weekPaymentTotal)}*`;
  if (role === 'provider' && weekProviderExpenseTotal > 0) message += `\n  Gastos propios: *${formatAmount(weekProviderExpenseTotal)}*`;

  message += `\n\n`;
  if (accumulatedPayments > 0) message += `Saldo actual: *${formatAmount(balance)}*\n`;
  message += `Total acumulado: *${formatAmount(accumulatedExpenses)}*`;
  if (role === 'provider' && accumulatedProviderExpenses > 0) message += `\nGastos propios acumulados: *${formatAmount(accumulatedProviderExpenses)}*`;

  message += `\n\nMirá el detalle completo en Gasto Obra:\n${viewUrl}`;
  return message;
}

function buildClientEmailVars({ project, providerName, dateFormatted, weekExpenses, weekExpenseTotal, weekPaymentTotal, accumulatedExpenses, accumulatedPayments, balance, viewUrl }) {
  const who = providerName || 'Tu proveedor';
  const blocks = [];

  if (weekExpenseTotal > 0) {
    const count = weekExpenses.length;
    blocks.push(highlightBox('📋', `${who} registró <span class="amount">${formatAmount(weekExpenseTotal)}</span> en ${count} gasto${count > 1 ? 's' : ''}`));
  }
  if (weekPaymentTotal > 0) {
    blocks.push(highlightBox('✅', `Se acreditaron <span class="amount">${formatAmount(weekPaymentTotal)}</span> en pagos`));
  }

  const statsRows = [];
  statsRows.push(statRow('Total acumulado', formatAmount(accumulatedExpenses)));
  if (accumulatedPayments > 0) {
    statsRows.push(statRow('Total pagos', formatAmount(accumulatedPayments)));
    const balanceColor = balance >= 0 ? '#3E9954' : '#C74840';
    const balanceLabel = balance >= 0 ? 'Saldo a favor' : 'Pendiente';
    statsRows.push(`<tr><td class="label">${balanceLabel}</td><td class="value" style="color: ${balanceColor};">${formatAmount(Math.abs(balance))}</td></tr>`);
  }

  return {
    Project_Name: project.name,
    Address: project.address || '',
    Provider_Name: who,
    Date: dateFormatted,
    Today_Blocks: blocks.join(''),
    Stats_Rows: statsRows.join(''),
    View_Url: viewUrl
  };
}

function buildProviderEmailVars({ project, clientName, dateFormatted, weekExpenses, weekPayments, weekProviderExpenses, weekExpenseTotal, weekPaymentTotal, weekProviderExpenseTotal, accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses, balance, viewUrl }) {
  // Main activity blocks (client-facing: expenses + payments)
  const blocks = [];

  if (weekExpenseTotal > 0) {
    const count = weekExpenses.length;
    blocks.push(highlightBox('📋', `Registraste <span class="amount">${formatAmount(weekExpenseTotal)}</span> en ${count} gasto${count > 1 ? 's' : ''}`));
  }
  if (weekPaymentTotal > 0) {
    const count = weekPayments.length;
    blocks.push(highlightBox('✅', `Recibiste <span class="amount">${formatAmount(weekPaymentTotal)}</span> en ${count} pago${count > 1 ? 's' : ''}`));
  }

  // Project stats (client balance only)
  const statsRows = [];
  statsRows.push(statRow('Total acumulado', formatAmount(accumulatedExpenses)));
  if (accumulatedPayments > 0) {
    statsRows.push(statRow('Total cobrado', formatAmount(accumulatedPayments)));
    const balanceColor = balance >= 0 ? '#3E9954' : '#C74840';
    const balanceLabel = balance >= 0 ? 'A favor del cliente' : 'Pendiente de cobro';
    statsRows.push(`<tr><td class="label">${balanceLabel}</td><td class="value" style="color: ${balanceColor};">${formatAmount(Math.abs(balance))}</td></tr>`);
  }

  // Provider expenses — separate section
  let providerExpenseSection = '';
  if (weekProviderExpenseTotal > 0 || accumulatedProviderExpenses > 0) {
    providerExpenseSection += '<hr class="divider">';
    providerExpenseSection += '<h2 class="stats-title">Tus gastos propios</h2>';

    if (weekProviderExpenseTotal > 0) {
      const count = weekProviderExpenses.length;
      providerExpenseSection += highlightBox('📝', `${count} gasto${count > 1 ? 's' : ''} propio${count > 1 ? 's' : ''} esta semana por <span class="amount">${formatAmount(weekProviderExpenseTotal)}</span>`);
    }

    if (accumulatedProviderExpenses > 0) {
      providerExpenseSection += `<table class="stats-table">${statRow('Acumulado gastos propios', formatAmount(accumulatedProviderExpenses))}</table>`;
    }
  }

  return {
    Project_Name: project.name,
    Address: project.address || '',
    Client_Name: clientName || project.clientName || '',
    Date: dateFormatted,
    Today_Blocks: blocks.join(''),
    Stats_Rows: statsRows.join(''),
    Provider_Expense_Section: providerExpenseSection,
    View_Url: viewUrl
  };
}

function highlightBox(emoji, text) {
  return `<div class="highlight-box"><div class="emoji">${emoji}</div><div class="text">${text}</div></div>`;
}

function statRow(label, value) {
  return `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
}

// ============================================
// Main
// ============================================

async function sendWeeklySummaries() {
  logger.info('Starting weekly summary generation');

  // Weekly summary: Monday to Thursday (cron runs Friday 10 AM ART)
  const now = new Date();
  const artOffset = -3 * 60; // ART is UTC-3
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const artNow = new Date(utcNow + artOffset * 60000);

  const dayOfWeek = artNow.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate() - mondayOffset);
  const weekEnd = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate() - 1, 23, 59, 59);

  const weekStartUTC = new Date(weekStart.getTime() - artOffset * 60000);
  const weekEndUTC = new Date(weekEnd.getTime() - artOffset * 60000);

  const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dateFormatted = `${fmtDate(weekStart)} al ${fmtDate(weekEnd)}`;

  const projectsSnapshot = await db
    .collection('projects')
    .where('status', '==', 'active')
    .get();

  if (projectsSnapshot.empty) {
    logger.info('No active projects found');
    return;
  }

  logger.info('Processing weekly summaries', { projects: projectsSnapshot.size, period: dateFormatted });

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    const clientPhone = normalizePhoneNumber(project.clientPhone);
    const { email: clientEmail, name: clientName } = await getUserInfo(project.clientUserId);
    const { email: providerEmail, name: providerName } = await getUserInfo(project.providerId);
    const { phone: providerPhone, lastActivity } = await getProviderInfo(project.providerId);
    const providerWithin24h = lastActivity && (Date.now() - lastActivity.getTime()) < PROVIDER_WINDOW_MS;

    if (!clientPhone && !clientEmail && !providerPhone && !providerEmail) continue;

    // Get this week's expenses
    const expensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .where('date', '>=', weekStartUTC)
      .where('date', '<=', weekEndUTC)
      .get();

    const allWeekEntries = expensesSnapshot.docs.map(doc => doc.data());
    const weekExpenses = allWeekEntries.filter(e => !e.type || e.type === 'expense');
    const weekPayments = allWeekEntries.filter(e => e.type === 'payment');
    const weekProviderExpenses = allWeekEntries.filter(e => e.type === 'provider_expense');

    if (weekExpenses.length === 0 && weekPayments.length === 0 && weekProviderExpenses.length === 0) {
      logger.info('No expenses this week, skipping', { project: project.name });
      continue;
    }

    const weekExpenseTotal = weekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const weekPaymentTotal = weekPayments.reduce((sum, e) => sum + (e.amount || 0), 0);
    const weekProviderExpenseTotal = weekProviderExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Get all-time totals
    const allExpensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .get();

    const allEntries = allExpensesSnapshot.docs.map(doc => doc.data());
    const accumulatedExpenses = allEntries.filter(e => !e.type || e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0);
    const accumulatedPayments = allEntries.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
    const accumulatedProviderExpenses = allEntries.filter(e => e.type === 'provider_expense').reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = accumulatedPayments - accumulatedExpenses;

    const clientViewUrl = `${APP_URL}/client/project/${projectDoc.id}`;
    const providerViewUrl = `${APP_URL}/projects/${projectDoc.id}`;

    const sharedData = {
      project, dateFormatted, weekExpenses, weekPayments, weekProviderExpenses,
      weekExpenseTotal, weekPaymentTotal, weekProviderExpenseTotal,
      accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses,
      balance
    };

    const hasClientActivity = weekExpenses.length > 0 || weekPayments.length > 0;
    const emailSubject = `${project.name} — Resumen semanal ${dateFormatted}`;

    // Send to client (prefer email, fallback to WhatsApp)
    if (hasClientActivity) {
      if (shouldSendEmail(clientEmail) && resendHandler) {
        const vars = buildClientEmailVars({ ...sharedData, providerName, viewUrl: clientViewUrl });
        const result = await resendHandler.sendEmail(clientEmail, emailSubject, 'daily-summary', vars);
        if (!result.success) logger.error('Failed to send client email', { project: project.name, email: clientEmail, error: result.error });
      } else if (shouldSendWhatsApp(clientPhone)) {
        const msg = buildWhatsAppMessage({ role: 'client', ...sharedData, viewUrl: clientViewUrl });
        await sendWhatsAppMessage(clientPhone, msg);
      }
    }

    // Send to provider (prefer email, fallback to WhatsApp if within 24h window)
    if (shouldSendEmail(providerEmail) && resendHandler) {
      const vars = buildProviderEmailVars({ ...sharedData, clientName, viewUrl: providerViewUrl });
      const result = await resendHandler.sendEmail(providerEmail, emailSubject, 'provider-summary', vars);
      if (!result.success) logger.error('Failed to send provider email', { project: project.name, email: providerEmail, error: result.error });
    } else if (shouldSendWhatsApp(providerPhone) && providerWithin24h) {
      const msg = buildWhatsAppMessage({ role: 'provider', ...sharedData, viewUrl: providerViewUrl });
      await sendWhatsAppMessage(providerPhone, msg);
    }
  }

  logger.info('Weekly summary generation complete');
}

// Run
sendWeeklySummaries()
  .then(async () => {
    // Housekeeping: drop expired/revoked share snapshots so the auto-share-per-expense
    // table stays bounded. Best-effort — a failure here must not fail the cron.
    try {
      const removed = await purgeExpiredSnapshots();
      if (removed) logger.info('Purged expired share snapshots', { removed });
    } catch (error) {
      Sentry.captureException(error);
      logger.error('Error purging expired snapshots', { error });
    }
    process.exit(0);
  })
  .catch((error) => {
    Sentry.captureException(error);
    logger.error('Fatal error in weekly summary', { error });
    process.exit(1);
  });
