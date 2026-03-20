import '../../../lib/instrument.js';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { admin, db, COLLECTIONS } from '../../config/firebase.js';
import ResendHandler from '../../handlers/ResendHandler.js';
import { sendWhatsAppMessage } from '../../helpers/whatsapp.js';
import { formatAmount } from '../../helpers/responseFormatter.js';
import { normalizePhoneNumber } from '../../helpers/phone.js';
import logger from '../../../lib/logger.js';

const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';
const PROVIDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const resendHandler = process.env.RESEND_API_KEY
  ? new ResendHandler(process.env.RESEND_API_KEY)
  : null;

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

async function getClientEmail(clientUserId) {
  if (!clientUserId) return null;
  try {
    const user = await admin.auth().getUser(clientUserId);
    return user.email || null;
  } catch {
    return null;
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

function buildEmailVars({ role, project, dateFormatted, weekExpenses, weekExpenseTotal, weekPaymentTotal, weekProviderExpenseTotal, accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses, balance, viewUrl }) {
  const blocks = [];

  if (weekExpenseTotal > 0) {
    blocks.push(highlightBox(
      weekExpenses.length > 1 ? '🧱' : '🛒',
      `Se registraron <span class="amount">${formatAmount(weekExpenseTotal)}</span> en gastos esta semana`
    ));
  }
  if (weekPaymentTotal > 0) {
    blocks.push(highlightBox('💰', `Ingresaron <span class="amount">${formatAmount(weekPaymentTotal)}</span> en pagos`));
  }
  if (role === 'provider' && weekProviderExpenseTotal > 0) {
    blocks.push(highlightBox('🧾', `Gastos propios por <span class="amount">${formatAmount(weekProviderExpenseTotal)}</span>`));
  }

  const statsRows = [];
  statsRows.push(statRow('Total acumulado', formatAmount(accumulatedExpenses)));
  if (role === 'provider' && accumulatedProviderExpenses > 0) statsRows.push(statRow('Gastos propios acum.', formatAmount(accumulatedProviderExpenses)));
  if (accumulatedPayments > 0) {
    statsRows.push(statRow('Total pagos', formatAmount(accumulatedPayments)));
    const balanceColor = balance >= 0 ? '#3E9954' : '#C74840';
    statsRows.push(`<tr><td class="label">Saldo</td><td class="value" style="color: ${balanceColor};">${formatAmount(balance)}</td></tr>`);
  }

  return {
    Project_Name: project.name,
    Address: project.address || '',
    Date: dateFormatted,
    Today_Blocks: blocks.join(''),
    Stats_Rows: statsRows.join(''),
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
    const clientEmail = await getClientEmail(project.clientUserId);
    const { phone: providerPhone, lastActivity } = await getProviderInfo(project.providerId);
    const providerWithin24h = lastActivity && (Date.now() - lastActivity.getTime()) < PROVIDER_WINDOW_MS;

    if (!clientPhone && !clientEmail && !providerPhone) continue;

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

    const viewUrl = `${APP_URL}/view/${project.shareToken}`;

    const sharedData = {
      project, dateFormatted, weekExpenses, weekPayments, weekProviderExpenses,
      weekExpenseTotal, weekPaymentTotal, weekProviderExpenseTotal,
      accumulatedExpenses, accumulatedPayments, accumulatedProviderExpenses,
      balance, viewUrl
    };

    const hasClientActivity = weekExpenses.length > 0 || weekPayments.length > 0;

    // Send to client (prefer email, fallback to WhatsApp)
    if (hasClientActivity) {
      if (clientEmail && resendHandler) {
        const vars = buildEmailVars({ role: 'client', ...sharedData });
        const result = await resendHandler.sendEmail(clientEmail, `${project.name} — Resumen semanal ${dateFormatted}`, 'daily-summary', vars);
        if (!result.success) logger.error('Failed to send client email', { project: project.name, email: clientEmail, error: result.error });
      } else if (clientPhone) {
        const msg = buildWhatsAppMessage({ role: 'client', ...sharedData });
        await sendWhatsAppMessage(clientPhone, msg);
      }
    }

    // Send to provider (only if within 24h window — free)
    if (providerPhone && providerWithin24h) {
      const msg = buildWhatsAppMessage({ role: 'provider', ...sharedData });
      await sendWhatsAppMessage(providerPhone, msg);
    }
  }

  logger.info('Weekly summary generation complete');
}

// Run
sendWeeklySummaries()
  .then(() => process.exit(0))
  .catch((error) => {
    Sentry.captureException(error);
    logger.error('Fatal error in weekly summary', { error });
    process.exit(1);
  });
