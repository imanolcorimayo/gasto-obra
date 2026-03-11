import { sendWhatsAppMessage } from '../helpers/whatsapp.js';
import { formatAmount, capitalizeFirst } from '../helpers/responseFormatter.js';

const APP_URL = process.env.APP_URL || 'https://gasto-obra.web.app';

function getARTDate(date) {
  const artOffset = -3 * 60;
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + artOffset * 60000);
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export async function sendGlobalResumen(phoneNumber, pendingData) {
  const { project, expenses } = pendingData;

  const clientExpenses = expenses.filter(e => !e.type || e.type === 'expense');
  const payments = expenses.filter(e => e.type === 'payment');
  const providerExpenses = expenses.filter(e => e.type === 'provider_expense');

  const totalExpenses = clientExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPayments = payments.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProviderExpenses = providerExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalPayments - totalExpenses;

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
  message += `\n\n*Por categoría:*\n${categoryLines}`;
  message += `\n\n*Total gastos:* ${formatAmount(totalExpenses)}`;
  message += `\n*Pagos recibidos:* ${formatAmount(totalPayments)}`;
  message += `\n*Saldo:* ${formatAmount(balance)}`;

  if (providerExpenses.length > 0) {
    message += `\n\n*Gastos propios (${providerExpenses.length}):* ${formatAmount(totalProviderExpenses)}`;
  }

  message += `\n\n🔗 Ver detalle: ${APP_URL}`;
  message += `\n\n_Podés compartir este mensaje con tu cliente_`;

  await sendWhatsAppMessage(phoneNumber, message);
}

export async function sendWeeklyResumen(phoneNumber, pendingData) {
  const { project, expenses } = pendingData;

  const artNow = getARTDate(new Date());
  const dayOfWeek = artNow.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(artNow.getFullYear(), artNow.getMonth(), artNow.getDate() - mondayOffset);

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

  const byDay = {};
  weekExpenses.forEach(e => {
    const expDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
    const artDate = getARTDate(expDate);
    const key = `${artDate.getFullYear()}-${String(artDate.getMonth() + 1).padStart(2, '0')}-${String(artDate.getDate()).padStart(2, '0')}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e);
  });

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

        const title = e.title || 'Sin título';
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
  message += `\n\n_Podés compartir este mensaje con tu cliente_`;

  if (message.length > 3800) {
    message = message.substring(0, 3750) + '\n... (ver más en la app)';
  }

  await sendWhatsAppMessage(phoneNumber, message);
}
