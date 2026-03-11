import crypto from 'crypto';
import { admin, db, COLLECTIONS } from '../config/firebase.js';
import logger from '../../lib/logger.js';

export async function getActiveProjects(userId) {
  const snapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('providerId', '==', userId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function resolveProject(userId, activeProjectId) {
  if (!activeProjectId) return null;
  const doc = await db.collection(COLLECTIONS.PROJECTS).doc(activeProjectId).get();
  if (!doc.exists) return null;
  const project = doc.data();
  if (project.status !== 'active' || project.providerId !== userId) return null;
  return { id: doc.id, ...project };
}

export async function autoSelectProject(userId, phoneNumber) {
  let projects = await getActiveProjects(userId);

  if (projects.length === 0) {
    const projectData = {
      name: 'Mi Obra',
      tag: 'miobra',
      providerId: userId,
      status: 'active',
      shareToken: crypto.randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection(COLLECTIONS.PROJECTS).add(projectData);
    const created = { id: ref.id, ...projectData };
    projects = [created];
    logger.info('Auto-created default project', { userId, projectId: ref.id });
  }

  let selected;
  if (projects.length === 1) {
    selected = projects[0];
  } else {
    selected = [...projects].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0;
      return bTime - aTime;
    })[0];
  }

  await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).update({ activeProjectId: selected.id });

  return { project: selected, activeProjects: projects };
}
