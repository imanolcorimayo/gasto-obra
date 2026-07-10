import { db } from '../config/firebase.js';

export const DEFAULT_EXPENSE_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];

/**
 * The provider's category values (project overrides merged over globals),
 * falling back to the defaults. Same logic as the WhatsApp webhook's local copy.
 */
export async function getProviderCategories(providerId, projectId = null) {
  let projectCats = [];
  if (projectId) {
    const projSnap = await db.collection('categories')
      .where('userId', '==', providerId)
      .where('projectId', '==', projectId)
      .get();
    projectCats = projSnap.docs.map(d => d.data());
  }

  const globalSnap = await db.collection('categories')
    .where('userId', '==', providerId)
    .where('projectId', '==', null)
    .get();
  const globalCats = globalSnap.docs.map(d => d.data());

  if (globalCats.length === 0 && projectCats.length === 0) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  const merged = [...globalCats];
  for (const pc of projectCats) {
    const idx = merged.findIndex(c => c.value === pc.value);
    if (idx !== -1) merged[idx] = pc;
    else merged.push(pc);
  }

  return merged.length > 0 ? merged.map(c => c.value) : DEFAULT_EXPENSE_CATEGORIES;
}
