import { db } from '../config/firebase.js';

// Returns true when the given uid owns (providerId) or is joined as the
// client (clientUserId) of the given project.
export async function isProjectParticipant(uid, projectId) {
  if (!uid || !projectId) return false;
  const doc = await db.collection('projects').doc(projectId).get();
  if (!doc.exists) return false;
  const data = doc.data();
  return data.providerId === uid || data.clientUserId === uid;
}
