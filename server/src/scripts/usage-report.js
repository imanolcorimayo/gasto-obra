/**
 * Read-only usage report: who signed up and what they actually did.
 *
 * Walks Firebase Auth users, then groups projects/expenses by providerId so
 * you see real activity (not just accounts) without opening anyone's session.
 * Data comes from helpers/usageReport.js (shared with GET /api/admin/usage).
 *
 * Usage: node src/scripts/usage-report.js [--uid <uid>]
 *
 * With --uid it prints that user's projects and last 20 expenses in detail.
 */

import { getUsageSummary, getUserDetail } from '../helpers/usageReport.js';

const uidArg = process.argv.indexOf('--uid');
const ONLY_UID = uidArg !== -1 ? process.argv[uidArg + 1] : null;

const ars = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
const when = s => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const day = s => (s ? s.slice(0, 10) : '—');

// --- Detail mode -----------------------------------------------------------
if (ONLY_UID) {
  const u = await getUserDetail(ONLY_UID);
  if (!u) {
    console.log(`\nUsuario no encontrado: ${ONLY_UID}\n`);
    process.exit(1);
  }
  console.log(`\n${u.name || '(sin nombre)'} <${u.email || 'sin email'}>  ${u.uid}`);
  console.log(`Alta: ${when(u.createdAt)}  |  Último login: ${when(u.lastLoginAt)}`);
  console.log('TELÉFONOS');
  if (!u.phones.length) console.log('  — ninguno vinculado');
  u.phones.forEach(p => {
    console.log(`  ${p.phone}  ${p.origin}  |  WhatsApp: ${p.contactName || '—'}  |  vinculado ${when(p.linkedAt)}`);
  });
  console.log(`  Códigos pendientes sin usar: ${u.pendingCodes}\n`);

  console.log('OBRAS');
  u.projects.forEach(p => {
    console.log(`  ${p.name} [${p.status}] creada ${when(p.createdAt)} — ${p.expenses} gastos, ${ars(p.total)}`);
  });

  console.log('\nÚLTIMOS 20 GASTOS');
  u.lastExpenses.forEach(e => {
    const media = e.media.join('+');
    console.log(`  ${when(e.createdAt)}  ${e.type}  ${ars(e.amount).padStart(12)}  ${e.category || '—'}  [${e.source}${media ? ' ' + media : ''}]  ${e.title || ''}`);
  });
  console.log();
  process.exit(0);
}

// --- Summary mode ----------------------------------------------------------
const { metrics, users } = await getUsageSummary();

const rows = users.map(u => ({
  Usuario: u.name || '(sin nombre)',
  Alta: day(u.createdAt),
  'Últ. actividad': day(u.lastActivityAt),
  Obras: String(u.projects),
  Gastos: String(u.expenses),
  'Gastos 30d': String(u.expenses30d),
  Origen: u.origins.length
    ? u.origins.join(', ')
    : (u.pendingCodes ? `sin vincular (${u.pendingCodes} cód.)` : '—'),
  uid: u.uid,
}));

// Pad to the widest cell per column so columns line up in any terminal.
function table(data, cols) {
  const width = {};
  cols.forEach(c => { width[c] = Math.max(c.length, ...data.map(r => String(r[c]).length)); });
  const numeric = new Set(['Obras', 'Gastos', 'Gastos 30d']);
  const line = r => cols.map(c => (numeric.has(c) ? String(r[c]).padStart(width[c]) : String(r[c]).padEnd(width[c]))).join('  ');
  const header = cols.map(c => (numeric.has(c) ? c.padStart(width[c]) : c.padEnd(width[c]))).join('  ');
  return [header, cols.map(c => '─'.repeat(width[c])).join('  '), ...data.map(line)].join('\n');
}

console.log();
console.log(table(rows, ['Usuario', 'Alta', 'Últ. actividad', 'Obras', 'Gastos', 'Gastos 30d', 'Origen']));
console.log();
const trend = ({ current, previous }) => `${current} (prev. ${previous})`;
console.log(`Últimos 30 días: activos ${trend(metrics.activeUsers)} | nuevos ${trend(metrics.newUsers)} | gastos ${trend(metrics.expenses)} | obras nuevas ${trend(metrics.newProjects)}`);
console.log(`Detalle:  node src/scripts/usage-report.js --uid <uid>`);
console.log();
console.log(table(rows, ['Usuario', 'uid']));
console.log();
process.exit(0);
