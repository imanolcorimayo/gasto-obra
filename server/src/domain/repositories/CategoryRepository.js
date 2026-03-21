import { db, COLLECTIONS } from '../../config/firebase.js';

export async function findGlobalByProvider(providerId) {
  const snap = await db.collection(COLLECTIONS.CATEGORIES)
    .where('userId', '==', providerId)
    .where('projectId', '==', null)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function findByProviderAndProject(providerId, projectId) {
  const snap = await db.collection(COLLECTIONS.CATEGORIES)
    .where('userId', '==', providerId)
    .where('projectId', '==', projectId)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
