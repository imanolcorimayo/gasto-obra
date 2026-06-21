import { db, COLLECTIONS } from '../config/firebase.js';
import { normalizePhoneNumber } from './phone.js';
import { getPeriodSummary } from './expenseSummary.js';
import { insertSnapshot } from '../snapshots/repo.js';
import { formatAmount, capitalizeFirst } from './responseFormatter.js';

// Build frozen, shareable snapshots a provider hands to their client via a wa.me
// deep link (sent from the provider's OWN phone — no Meta template, no 24h window).
// The payload is captured now and never recomputed; see migrations/004.
//
// Two kinds, deliberately distinct so the client never has to guess scope:
//   • summary  — the WHOLE obra's standing (its numbers don't depend on any window).
//   • movement — one specific expense, full detail + receipt photo.

const appUrl = () => process.env.APP_URL || 'https://gastoobra.com';
const SNAPSHOT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // links self-purge after 90 days
const MAX_RECENT = 12; // latest movements shown in a summary (the rest live in the full obra)

// Client-voice balance line for the prefilled WhatsApp message (mirrors the /v page).
const balanceLine = (b) =>
  b > 0 ? `A tu favor: ${formatAmount(b)}`
  : b < 0 ? `Saldo a pagar: ${formatAmount(-b)}`
  : 'Estás al día';

// ISO 'YYYY-MM-DD' → 'DD/MM/YYYY' without going through Date (avoids TZ shifts).
const fmtDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return d && m ? `${d}/${m}/${y}` : iso;
};

/** Load a project and assert the caller owns it. */
async function loadOwnedProject(projectId, userId) {
  if (!projectId) return { error: 'Falta el id de la obra.' };
  const doc = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get();
  if (!doc.exists) return { error: 'No existe esa obra.' };
  const data = doc.data();
  if (data.providerId !== userId) return { error: 'Esa obra no es tuya.' };
  return { data };
}

/** Provider first name, denormalized into the frozen payload (no live lookup on view). */
async function providerFirstName(providerId) {
  if (!providerId) return null;
  const doc = await db.collection(COLLECTIONS.PROVIDERS).doc(providerId).get();
  return doc.exists ? doc.data().displayName?.split(' ')[0] || null : null;
}

/**
 * Common public view URL + ready-to-send wa.me link (when a clientPhone is on file).
 * The prefilled message carries the gist (`body`) so the client gets value right in
 * the chat, then a `cta` footer points to the nicer, fuller /v page.
 */
function buildShare({ slug, data, body, cta }) {
  const viewUrl = `${appUrl()}/v/${slug}`;
  const text = `${body}\n\n${cta}\n${viewUrl}`;
  // wa.me wants digits only, no '+'. normalizePhoneNumber handles the AR 549→54 case.
  const phone = data.clientPhone
    ? normalizePhoneNumber(String(data.clientPhone).replace(/\D/g, ''))
    : null;
  // With a phone, the link opens straight to that client. Without one,
  // `wa.me/?text=` opens WhatsApp's contact picker with the message prefilled, so
  // the provider just taps whoever they want — no number on file required.
  const waLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  return { viewUrl, waLink, hasClientPhone: Boolean(phone) };
}

/**
 * Whole-obra summary snapshot. Its figures are cumulative (a "balance" only makes
 * sense for the whole obra), so two shares of the same obra render identical numbers.
 *
 * @returns {{ ok:true, project, slug, viewUrl, waLink:string|null, hasClientPhone:boolean }
 *          | { ok:false, error:string }}
 */
export async function createSummarySnapshot({ userId, projectId, now = Date.now() }) {
  const { data, error } = await loadOwnedProject(projectId, userId);
  if (error) return { ok: false, error };

  const providerName = await providerFirstName(data.providerId);
  // Full history window = the whole obra; same math as getProjectSummary, plus the
  // movement list so we can show the latest few.
  const s = await getPeriodSummary(projectId, new Date(0), new Date(now));

  const payload = {
    v: 3,
    kind: 'summary',
    project: {
      name: data.name,
      tag: data.tag || null,
      address: data.address || null,
      clientName: data.clientName || null,
      shareToken: data.shareToken || null, // lets the page invite into the full obra
    },
    providerName,
    obra: {
      totalExpenses: s.totalExpenses,
      totalPayments: s.totalPayments,
      balance: s.balance,
      count: s.count,
      byCategory: s.byCategory,
    },
    movements: s.movements.slice(0, MAX_RECENT),
    movementsTotal: s.movements.length,
    generatedTs: now,
  };

  const { slug } = await insertSnapshot(
    { userId, projectId, type: 'summary', payload, expiresTs: now + SNAPSHOT_TTL_MS },
    now
  );
  return {
    ok: true,
    project: { id: projectId, name: data.name },
    slug,
    ...buildShare({
      slug,
      data,
      body:
        `Así va la obra *${data.name}*:\n\n` +
        `Gastos de la obra: ${formatAmount(s.totalExpenses)}\n` +
        `Tus pagos: ${formatAmount(s.totalPayments)}\n` +
        balanceLine(s.balance),
      cta: 'Mirá el detalle completo acá:',
    }),
  };
}

/**
 * Single-expense snapshot — full detail + receipt photo, frozen. Provider's own
 * ('provider_expense') items are never shareable to a client.
 *
 * @returns {{ ok:true, project, slug, viewUrl, waLink:string|null, hasClientPhone:boolean }
 *          | { ok:false, error:string }}
 */
export async function createExpenseSnapshot({ userId, projectId, expenseId, now = Date.now() }) {
  const { data, error } = await loadOwnedProject(projectId, userId);
  if (error) return { ok: false, error };
  if (!expenseId) return { ok: false, error: 'Falta el id del gasto.' };

  const eDoc = await db.collection(COLLECTIONS.EXPENSES).doc(expenseId).get();
  if (!eDoc.exists) return { ok: false, error: 'No existe ese gasto.' };
  const e = eDoc.data();
  if (e.projectId !== projectId) return { ok: false, error: 'Ese gasto no pertenece a la obra.' };
  if ((e.type || 'expense') === 'provider_expense') {
    return { ok: false, error: 'Ese gasto es propio, no se comparte con el cliente.' };
  }

  const providerName = await providerFirstName(data.providerId);
  const toISO = (v) => v?.toDate?.()?.toISOString().slice(0, 10) || null;

  const payload = {
    v: 3,
    kind: 'movement',
    project: { name: data.name, tag: data.tag || null, shareToken: data.shareToken || null },
    providerName,
    expense: {
      type: e.type || 'expense',
      title: e.title || null,
      amount: e.amount || 0,
      category: e.category || null,
      scopeType: e.scopeType || 'original',
      vendor: e.vendor || null,
      recipient: e.recipientName || null,
      paymentMethod: e.paymentMethod || null,
      description: e.description || null,
      items: Array.isArray(e.items) ? e.items : null,
      date: toISO(e.date) || toISO(e.createdAt),
      imageUrl: e.imageUrl || e.fileUrl || null,
    },
    generatedTs: now,
  };

  const { slug } = await insertSnapshot(
    { userId, projectId, type: 'movement', payload, expiresTs: now + SNAPSHOT_TTL_MS },
    now
  );
  const isPayment = payload.expense.type === 'payment';
  const label = e.title || (isPayment ? 'Pago' : 'Gasto');
  const metaLine = [
    formatAmount(e.amount || 0),
    e.category ? capitalizeFirst(e.category) : null,
    fmtDate(payload.expense.date),
  ].filter(Boolean).join(' · ');
  return {
    ok: true,
    project: { id: projectId, name: data.name },
    slug,
    ...buildShare({
      slug,
      data,
      body:
        `${isPayment ? 'Pago en la obra' : 'Gasto de la obra'} *${data.name}*:\n\n` +
        `*${label}*\n${metaLine}`,
      cta: payload.expense.imageUrl
        ? 'Mirá el detalle y el comprobante acá:'
        : 'Mirá el detalle acá:',
    }),
  };
}
