import { db, COLLECTIONS } from '../config/firebase.js';

// Structured project summary (numbers, not a formatted message) so the agent can
// phrase it in its own voice. Mirrors the math in resumen.js's sendGlobalResumen.

export async function getProjectSummary(projectId) {
  const snap = await db.collection(COLLECTIONS.EXPENSES).where('projectId', '==', projectId).get();
  const expenses = snap.docs.map((d) => d.data());

  const clientExpenses = expenses.filter((e) => !e.type || e.type === 'expense');
  const payments = expenses.filter((e) => e.type === 'payment');
  const providerExpenses = expenses.filter((e) => e.type === 'provider_expense');

  const sum = (arr) => arr.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = sum(clientExpenses);
  const totalPayments = sum(payments);

  const byCategory = {};
  for (const e of clientExpenses) {
    const c = e.category || 'otros';
    byCategory[c] = (byCategory[c] || 0) + (e.amount || 0);
  }

  // Scope split (Original vs Agregados) — what the client view shows as a doughnut.
  // 'addition' = unforeseen/extra work; everything else counts as original.
  const additionExpenses = clientExpenses.filter((e) => e.scopeType === 'addition');
  const totalAdditions = sum(additionExpenses);

  return {
    count: clientExpenses.length,
    totalExpenses,
    totalPayments,
    totalProviderExpenses: sum(providerExpenses),
    balance: totalPayments - totalExpenses, // negative = el cliente debe
    byCategory,
    byScope: {
      original: totalExpenses - totalAdditions,
      additions: totalAdditions,
      additionsCount: additionExpenses.length,
    },
  };
}

/**
 * Frozen-snapshot math for a date window. Like getProjectSummary but bounded to
 * [from, to] and returning the actual movements in range (no cap) so a shared
 * snapshot can render specific lines, not just totals. All filtering in memory.
 * Provider's own expenses ('provider_expense') are excluded — a client snapshot
 * shows only what's billable to / paid by the client.
 *
 * @param {string} projectId
 * @param {Date} from inclusive lower bound
 * @param {Date} to   inclusive upper bound
 */
export async function getPeriodSummary(projectId, from, to) {
  const snap = await db.collection(COLLECTIONS.EXPENSES).where('projectId', '==', projectId).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const dateMs = (e) => e.date?.toMillis?.() ?? e.createdAt?.toMillis?.() ?? 0;
  const inRange = all.filter((e) => {
    const t = dateMs(e);
    return t >= from.getTime() && t <= to.getTime();
  });

  const sum = (arr) => arr.reduce((s, e) => s + (e.amount || 0), 0);
  const clientExpenses = inRange.filter((e) => !e.type || e.type === 'expense');
  const payments = inRange.filter((e) => e.type === 'payment');
  const totalExpenses = sum(clientExpenses);
  const totalPayments = sum(payments);

  const byCategory = {};
  for (const e of clientExpenses) {
    const c = e.category || 'otros';
    byCategory[c] = (byCategory[c] || 0) + (e.amount || 0);
  }

  // Client-facing movement list (newest first): gastos + cobros, never provider_expense.
  const movements = inRange
    .filter((e) => (e.type || 'expense') !== 'provider_expense')
    .sort((a, b) => dateMs(b) - dateMs(a))
    .map((e) => ({
      type: e.type || 'expense',
      title: e.title || null,
      amount: e.amount || 0,
      category: e.category || null,
      vendor: e.vendor || null,
      date: e.date?.toDate?.()?.toISOString().slice(0, 10)
        || e.createdAt?.toDate?.()?.toISOString().slice(0, 10) || null,
      hasReceipt: Boolean(e.imageUrl || e.fileUrl),
    }));

  return {
    count: clientExpenses.length,
    paymentsCount: payments.length,
    totalExpenses,
    totalPayments,
    balance: totalPayments - totalExpenses, // negative = el cliente debe
    byCategory,
    movements,
  };
}

/**
 * Search a project's expenses with optional filters. All filtering is in memory
 * (one project's expenses fit easily), so no Firestore composite indexes needed.
 *
 * @param {string} projectId
 * @param {object} f { from?: Date, to?: Date, query?: string, type?: string, category?: string, limit?: number }
 *   from/to: inclusive date bounds. query: case-insensitive substring over title/vendor/description/items.
 */
export async function searchProjectExpenses(projectId, f = {}) {
  const snap = await db.collection(COLLECTIONS.EXPENSES).where('projectId', '==', projectId).get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const dateMs = (e) => e.date?.toMillis?.() ?? e.createdAt?.toMillis?.() ?? 0;
  if (f.from instanceof Date) items = items.filter((e) => dateMs(e) >= f.from.getTime());
  if (f.to instanceof Date) items = items.filter((e) => dateMs(e) <= f.to.getTime());
  if (f.type) items = items.filter((e) => (e.type || 'expense') === f.type);
  if (f.category) items = items.filter((e) => (e.category || '') === f.category);

  if (f.query) {
    const q = f.query.toLowerCase();
    items = items.filter((e) => {
      const hay = [e.title, e.vendor, e.description, ...(e.items || []).map((i) => i.name)]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  items.sort((a, b) => dateMs(b) - dateMs(a));
  return items.slice(0, f.limit || 10).map((e) => ({
    id: e.id,
    type: e.type || 'expense',
    title: e.title,
    amount: e.amount,
    category: e.category || null,
    scopeType: e.scopeType || 'original',
    itemId: e.itemId || null,
    date: e.date?.toDate?.()?.toISOString().slice(0, 10) || null,
    vendor: e.vendor || null,
    recipient: e.recipientName || null,
    paymentMethod: e.paymentMethod || null,
    description: e.description || null,
    items: e.items || null,
    source: e.source || null,        // 'whatsapp' | 'app' | 'mcp' — helps spot duplicates loaded twice
    hasReceipt: Boolean(e.imageUrl || e.fileUrl),
  }));
}
