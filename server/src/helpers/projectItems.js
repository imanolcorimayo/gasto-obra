import { admin, db, COLLECTIONS } from '../config/firebase.js';

// Project ITEMS — sub-budgets of an obra (e.g. "Baño", "Cocina"), so a big project
// can be priced by section instead of one guessed lump sum. Each item carries a
// labor budget + a materials budget range; expenses link to an item via expense.itemId
// and roll up as actual spend. MATERIALS live under an item, and PROPOSALS are vendor
// price quotes under a material (their min/max refine the item's materials budget).
//
// Ownership is enforced on every write/read by providerId === userId — never trust a
// raw id from the model. Mirrors the field names of the web ODM schemas so both the
// web app and the client view read these docs unchanged.

const ts = (d) => (d instanceof Date ? admin.firestore.Timestamp.fromDate(d) : null);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Assert an obra belongs to the user; returns the project data or null. */
async function ownedProject(userId, projectId) {
  if (!projectId) return null;
  const doc = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get();
  if (!doc.exists || doc.data().providerId !== userId) return null;
  return doc.data();
}

/**
 * List an obra's items with their budgets and actual spend rolled up from expenses
 * (sum of `type==='expense'` amounts carrying that itemId). Returns [] if the obra
 * isn't the user's. `spentUnassigned` reports expense spend not linked to any item.
 */
export async function listItems(userId, projectId) {
  if (!(await ownedProject(userId, projectId))) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };

  const [itemsSnap, expSnap, matSnap] = await Promise.all([
    db.collection(COLLECTIONS.PROJECT_ITEMS).where('projectId', '==', projectId).get(),
    db.collection(COLLECTIONS.EXPENSES).where('projectId', '==', projectId).get(),
    db.collection(COLLECTIONS.PROJECT_MATERIALS).where('projectId', '==', projectId).get(),
  ]);

  // Roll up actual spend per itemId (client expenses only).
  const spentByItem = {};
  let spentUnassigned = 0;
  for (const d of expSnap.docs) {
    const e = d.data();
    if (e.type && e.type !== 'expense') continue;
    const amt = e.amount || 0;
    if (e.itemId) spentByItem[e.itemId] = (spentByItem[e.itemId] || 0) + amt;
    else spentUnassigned += amt;
  }
  const matCountByItem = {};
  for (const d of matSnap.docs) {
    const m = d.data();
    matCountByItem[m.itemId] = (matCountByItem[m.itemId] || 0) + 1;
  }

  const items = itemsSnap.docs.map((d) => {
    const i = d.data();
    const materialsMid = (num(i.materialsBudgetMin) + num(i.materialsBudgetMax)) / 2;
    return {
      id: d.id,
      name: i.name,
      laborBudget: num(i.laborBudget),
      materialsBudgetMin: num(i.materialsBudgetMin),
      materialsBudgetMax: num(i.materialsBudgetMax),
      budget: num(i.laborBudget) + materialsMid, // midpoint effective budget
      spent: spentByItem[d.id] || 0,
      materialsCount: matCountByItem[d.id] || 0,
      plannedStartDate: i.plannedStartDate?.toDate?.()?.toISOString().slice(0, 10) || null,
      plannedEndDate: i.plannedEndDate?.toDate?.()?.toISOString().slice(0, 10) || null,
    };
  });

  return { ok: true, items, spentUnassigned };
}

/** Create a sub-budget item under an owned obra. Only `name` is required. */
export async function createItem(userId, { projectId, name, laborBudget, materialsBudgetMin, materialsBudgetMax, plannedStartDate, plannedEndDate } = {}) {
  if (!(await ownedProject(userId, projectId))) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
  const trimmed = (name || '').trim();
  if (!trimmed) return { ok: false, error: 'Falta el nombre del ítem.' };

  const doc = {
    projectId,
    providerId: userId,
    name: trimmed.slice(0, 100),
    laborBudget: num(laborBudget),
    materialsBudgetMin: num(materialsBudgetMin),
    materialsBudgetMax: num(materialsBudgetMax || materialsBudgetMin),
    plannedStartDate: ts(plannedStartDate),
    plannedEndDate: ts(plannedEndDate),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await db.collection(COLLECTIONS.PROJECT_ITEMS).add(doc);
  return { ok: true, item: { id: ref.id, name: doc.name, laborBudget: doc.laborBudget, materialsBudgetMin: doc.materialsBudgetMin, materialsBudgetMax: doc.materialsBudgetMax } };
}

const ITEM_NUMERIC = ['laborBudget', 'materialsBudgetMin', 'materialsBudgetMax'];
const ITEM_DATES = ['plannedStartDate', 'plannedEndDate'];

/** Update an owned item's name/budgets/dates. */
export async function updateItem(userId, itemId, fields = {}) {
  if (!itemId) return { ok: false, error: 'Falta el id del ítem.' };
  const ref = db.collection(COLLECTIONS.PROJECT_ITEMS).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists || doc.data().providerId !== userId) return { ok: false, error: 'No encontré ese ítem entre los tuyos.' };

  const update = {};
  if (fields.name !== undefined && String(fields.name).trim()) update.name = String(fields.name).trim().slice(0, 100);
  for (const k of ITEM_NUMERIC) if (fields[k] !== undefined) update[k] = num(fields[k]);
  for (const k of ITEM_DATES) if (fields[k] !== undefined) update[k] = ts(fields[k]);
  if (Object.keys(update).length === 0) return { ok: false, error: 'No hay cambios para aplicar.' };

  update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await ref.update(update);
  return { ok: true, item: { id: itemId, ...update } };
}

/** Add a material line under an owned item. Optionally seed a first vendor proposal. */
export async function addMaterial(userId, { projectId, itemId, name, notes, vendor, amount } = {}) {
  const item = itemId ? await db.collection(COLLECTIONS.PROJECT_ITEMS).doc(itemId).get() : null;
  if (!item || !item.exists || item.data().providerId !== userId) return { ok: false, error: 'No encontré ese ítem entre los tuyos.' };
  const trimmed = (name || '').trim();
  if (!trimmed) return { ok: false, error: 'Falta el nombre del material.' };
  const pid = item.data().projectId;

  const matRef = await db.collection(COLLECTIONS.PROJECT_MATERIALS).add({
    projectId: pid,
    providerId: userId,
    itemId,
    name: trimmed.slice(0, 200),
    notes: (notes || '').trim().slice(0, 500) || null,
    addedBy: 'provider',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  let proposalId = null;
  if (amount !== undefined || vendor) {
    const res = await addProposal(userId, { itemId, materialId: matRef.id, vendor, amount, notes });
    if (res.ok) proposalId = res.proposalId;
  }
  return { ok: true, materialId: matRef.id, proposalId };
}

/** Add a vendor price quote (proposal) under an owned material. */
export async function addProposal(userId, { itemId, materialId, vendor, amount, notes } = {}) {
  const mat = materialId ? await db.collection(COLLECTIONS.PROJECT_MATERIALS).doc(materialId).get() : null;
  if (!mat || !mat.exists || mat.data().providerId !== userId) return { ok: false, error: 'No encontré ese material entre los tuyos.' };
  const m = mat.data();

  const ref = await db.collection(COLLECTIONS.PROJECT_MATERIAL_PROPOSALS).add({
    projectId: m.projectId,
    providerId: userId,
    itemId: itemId || m.itemId,
    materialId,
    vendor: (vendor || '').trim().slice(0, 100) || null,
    amount: num(amount),
    notes: (notes || '').trim().slice(0, 500) || null,
    addedBy: 'provider',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, proposalId: ref.id };
}
