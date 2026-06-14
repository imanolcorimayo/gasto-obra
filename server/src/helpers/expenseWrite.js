import { admin, db, COLLECTIONS } from '../config/firebase.js';
import logger from '../../lib/logger.js';

// Pure, reusable expense write — the canonical persistence for a registered
// transaction. Extracted from the WhatsApp webhook's confirmPendingExpense so the
// agent (and, later, anything else) writes through one path. Builds the expense
// doc, auto-learns the vendor, and creates a linked payment when fully paid.

function vendorSlug(name) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

async function getProviderVendors(userId) {
  const snap = await db.collection(COLLECTIONS.VENDORS).where('userId', '==', userId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} userId  provider Firebase UID
 * @param {object} data    { projectId, type, title, amount, category, description?,
 *                           items?, paymentMethod?, installmentPercent?, recipient*?,
 *                           vendor?, source?, originalMessage?, amountBase?, managementFeePercent? }
 * @returns {Promise<{ expenseId: string, paymentId: string|null }>}
 */
export async function createExpense(userId, data) {
  const expenseDoc = {
    projectId: data.projectId,
    providerId: userId,
    title: data.title,
    description: data.description || '',
    amount: data.amount,
    amountBase: data.amountBase || null,
    managementFeePercent: data.managementFeePercent || null,
    category: data.category,
    type: data.type || 'expense',
    installmentPercent: data.installmentPercent ?? null,
    paymentMethod: data.paymentMethod || null,
    recipientName: data.recipientName || null,
    recipientBankInfo: data.recipientBankInfo || null,
    recipientPlatform: data.recipientPlatform || null,
    recipientCuit: data.recipientCuit || null,
    linkedExpenseId: data.linkedExpenseId || null,
    linkedPaymentId: null,
    items: data.items || null,
    imageUrl: data.imageUrl || null,
    audioUrl: data.audioUrl || null,
    audioTranscription: data.audioTranscription || null,
    fileUrl: data.fileUrl || null,
    vendor: data.vendor || null,
    originalMessage: data.originalMessage || '',
    source: data.source || 'agent',
    // Optional backdating: a Date → that moment; omitted → now.
    date: data.date instanceof Date
      ? admin.firestore.Timestamp.fromDate(data.date)
      : admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const expenseRef = await db.collection(COLLECTIONS.EXPENSES).add(expenseDoc);

  // Auto-learn the vendor (slug-based dedup).
  if (data.vendor) {
    try {
      const existing = await getProviderVendors(userId);
      const slug = vendorSlug(data.vendor);
      const match = existing.find((v) => vendorSlug(v.name) === slug);
      if (match) await expenseRef.update({ vendor: match.name });
      else await db.collection(COLLECTIONS.VENDORS).add({ userId, name: data.vendor });
    } catch (e) {
      logger.error('Error auto-adding vendor', { error: e.message });
    }
  }

  // A fully-paid expense spawns a linked payment.
  let paymentId = null;
  if (data.installmentPercent >= 100 && (data.type === 'expense' || !data.type)) {
    const paymentDoc = {
      projectId: data.projectId,
      providerId: userId,
      title: `Pago: ${data.title}`,
      description: '',
      amount: data.amount,
      category: 'pago',
      type: 'payment',
      installmentPercent: null,
      paymentMethod: data.paymentMethod || null,
      recipientName: data.recipientName || null,
      recipientBankInfo: data.recipientBankInfo || null,
      recipientPlatform: data.recipientPlatform || null,
      recipientCuit: data.recipientCuit || null,
      linkedExpenseId: expenseRef.id,
      linkedPaymentId: null,
      items: null,
      vendor: data.vendor || null,
      originalMessage: '',
      source: data.source || 'agent',
      date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const paymentRef = await db.collection(COLLECTIONS.EXPENSES).add(paymentDoc);
    await expenseRef.update({ linkedPaymentId: paymentRef.id });
    paymentId = paymentRef.id;
  }

  return { expenseId: expenseRef.id, paymentId };
}

// projectId/Name/Tag included so an expense can be MOVED between obras. The caller
// (tool) must validate the target obra belongs to the user before passing these.
const EDITABLE_FIELDS = ['title', 'amount', 'category', 'type', 'description', 'paymentMethod', 'installmentPercent', 'items', 'date', 'vendor', 'recipientName', 'recipientPlatform', 'recipientCuit', 'projectId', 'projectName', 'projectTag'];

/** Fetch one expense, but only if it belongs to `userId`. Returns a slim view or null. */
export async function getExpense(userId, expenseId) {
  const doc = await db.collection(COLLECTIONS.EXPENSES).doc(expenseId).get();
  if (!doc.exists) return null;
  const e = doc.data();
  if (e.providerId !== userId) return null; // ownership guard (IDOR)
  return {
    id: doc.id, type: e.type || 'expense', title: e.title, amount: e.amount,
    category: e.category || null, projectId: e.projectId,
    vendor: e.vendor || null, recipientName: e.recipientName || null,
  };
}

/** Ownership-guarded comprobante URLs for an expense (for the receipt-image tool). */
export async function getExpenseMedia(userId, expenseId) {
  const doc = await db.collection(COLLECTIONS.EXPENSES).doc(expenseId).get();
  if (!doc.exists) return null;
  const e = doc.data();
  if (e.providerId !== userId) return null; // ownership guard (IDOR)
  return { title: e.title || null, imageUrl: e.imageUrl || null, fileUrl: e.fileUrl || null };
}

/** Update an owned expense (trusted, no confirm). Only whitelisted fields. */
export async function updateExpense(userId, expenseId, fields) {
  const ref = db.collection(COLLECTIONS.EXPENSES).doc(expenseId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'No existe ese registro.' };
  if (doc.data().providerId !== userId) return { ok: false, error: 'Ese registro no es tuyo.' };

  const update = {};
  for (const k of EDITABLE_FIELDS) if (fields[k] !== undefined) update[k] = fields[k];
  if (Object.keys(update).length === 0) return { ok: false, error: 'No hay cambios para aplicar.' };
  if (update.date instanceof Date) update.date = admin.firestore.Timestamp.fromDate(update.date);

  update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await ref.update(update);
  return { ok: true, expenseId, updated: update };
}

/** Delete an owned expense (and its linked payment, if any). Confirm gate lives in the tool. */
export async function deleteExpense(userId, expenseId) {
  const ref = db.collection(COLLECTIONS.EXPENSES).doc(expenseId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'No existe ese registro.' };
  const data = doc.data();
  if (data.providerId !== userId) return { ok: false, error: 'Ese registro no es tuyo.' };

  if (data.linkedPaymentId) {
    await db.collection(COLLECTIONS.EXPENSES).doc(data.linkedPaymentId).delete().catch(() => {});
  }
  await ref.delete();
  return { ok: true, expenseId };
}
