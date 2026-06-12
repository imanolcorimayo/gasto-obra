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

  let autoCreated = false;

  if (projects.length === 0) {
    autoCreated = true;
    const projectData = {
      name: 'Mi Obra (completar datos)',
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

  return { project: selected, activeProjects: projects, autoCreated };
}

// Derive a URL-safe tag from the obra name (mirrors the web schema's normalization)
// and make it unique against the provider's existing tags by suffixing a number.
function deriveUniqueTag(name, existingTags) {
  let base = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 30);
  if (!base) base = 'obra';
  const taken = new Set(existingTags);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base.slice(0, 28)}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 24)}${Date.now().toString().slice(-5)}`;
}

/**
 * Create a new obra for `userId`. `name` is the only required field; `tag` is
 * auto-derived and deduped. Optional: clientName, clientPhone, address, description.
 * Returns the created project (with its id), shaped like getActiveProjects entries.
 */
export async function createProject(userId, { name, clientName, clientPhone, address, description } = {}) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, error: 'Falta el nombre de la obra.' };

  const existing = await getActiveProjects(userId);
  const tag = deriveUniqueTag(trimmedName, existing.map((p) => p.tag).filter(Boolean));

  const projectData = {
    name: trimmedName.slice(0, 100),
    tag,
    description: description?.trim().slice(0, 500) || null,
    address: address?.trim().slice(0, 200) || null,
    clientName: clientName?.trim().slice(0, 100) || null,
    clientPhone: clientPhone?.trim().slice(0, 20) || null,
    providerId: userId,
    status: 'active',
    shareToken: crypto.randomUUID(),
    clientUserId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(COLLECTIONS.PROJECTS).add(projectData);
  logger.info('Created project via agent', { userId, projectId: ref.id, tag });
  return { ok: true, project: { id: ref.id, ...projectData } };
}
