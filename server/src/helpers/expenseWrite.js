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
    date: admin.firestore.FieldValue.serverTimestamp(),
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
