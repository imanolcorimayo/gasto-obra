import '../../lib/instrument.js';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { db } from '../config/firebase.js';
import { sendWhatsAppMessage } from '../helpers/whatsapp.js';
import { formatAmount, capitalizeFirst } from '../helpers/responseFormatter.js';
import logger from '../../lib/logger.js';

const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';

// ============================================
// Main
// ============================================
async function sendDailySummaries() {
  logger.info('Starting daily summary generation');

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
    logger.info('No active projects found');
    return;
  }

  const dateFormatted = `${String(artNow.getDate()).padStart(2, '0')}/${String(artNow.getMonth() + 1).padStart(2, '0')}/${artNow.getFullYear()}`;

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();

    if (!project.clientPhone) {
      logger.info('Project has no client phone, skipping', { project: project.name });
      continue;
    }

    // Get today's expenses for this project (only client-facing: expense + payment)
    const expensesSnapshot = await db
      .collection('expenses')
      .where('projectId', '==', projectDoc.id)
      .where('date', '>=', todayStartUTC)
      .where('date', '<=', todayEndUTC)
      .get();

    // Filter to client-relevant entries only
    const todayEntries = expensesSnapshot.docs
      .map(doc => doc.data())
      .filter(e => !e.type || e.type === 'expense' || e.type === 'payment');

    if (todayEntries.length === 0) {
      logger.info('No expenses today, skipping', { project: project.name });
      continue;
    }

    const todayExpenses = todayEntries.filter(e => !e.type || e.type === 'expense');
    const todayPayments = todayEntries.filter(e => e.type === 'payment');
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayPaymentTotal = todayPayments.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Get accumulated totals for the project
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
    const balance = accumulatedPayments - accumulatedExpenses;

    // Build expense list
    let expenseLines = '';
    if (todayExpenses.length > 0) {
      expenseLines += '*Gastos de hoy:*\n';
      expenseLines += todayExpenses
        .map(e => {
          const cat = e.category ? ` (${capitalizeFirst(e.category)})` : '';
          return `  ${formatAmount(e.amount)} - ${e.title}${cat}`;
        })
        .join('\n');
    }

    if (todayPayments.length > 0) {
      if (expenseLines) expenseLines += '\n\n';
      expenseLines += '*Pagos de hoy:*\n';
      expenseLines += todayPayments
        .map(e => `  ${formatAmount(e.amount)} - ${e.title}`)
        .join('\n');
    }

    // Build message
    const viewUrl = `${APP_URL}/view/${project.shareToken}`;

    let message = `*Resumen del dia - ${project.name}*
Fecha: ${dateFormatted}

${expenseLines}`;

    if (todayExpenseTotal > 0) {
      message += `\n\n*Total gastos del dia:* ${formatAmount(todayExpenseTotal)}`;
    }
    if (todayPaymentTotal > 0) {
      message += `\n*Pagos del dia:* ${formatAmount(todayPaymentTotal)}`;
    }

    // Calculate pending amounts
    const pendingTotal = allEntries
      .filter(e => (!e.type || e.type === 'expense') && e.installmentPercent === 0)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    message += `\n\n*Total acumulado gastos:* ${formatAmount(accumulatedExpenses)}`;

    if (pendingTotal > 0) {
      message += `\n*Pendiente de pago:* ${formatAmount(pendingTotal)}`;
    }

    if (accumulatedPayments > 0) {
      message += `\n*Total pagos:* ${formatAmount(accumulatedPayments)}`;
      message += `\n*Saldo:* ${formatAmount(balance)}`;
    }

    message += `\n\nVer detalle: ${viewUrl}`;

    await sendWhatsAppMessage(project.clientPhone, message);
  }

  logger.info('Daily summary generation complete');
}

// Run
sendDailySummaries()
  .then(() => process.exit(0))
  .catch((error) => {
    Sentry.captureException(error);
    logger.error('Fatal error', { error });
    process.exit(1);
  });
