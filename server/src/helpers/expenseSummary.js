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

  return {
    count: clientExpenses.length,
    totalExpenses,
    totalPayments,
    totalProviderExpenses: sum(providerExpenses),
    balance: totalPayments - totalExpenses, // negative = el cliente debe
    byCategory,
  };
}
