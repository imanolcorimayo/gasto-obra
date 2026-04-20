import { admin, db } from '../../config/firebase.js';
import { isProjectParticipant } from '../../helpers/participantCheck.js';
import { serializeDoc } from '../../helpers/firestoreSerialize.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import { bucket } from '../../config/firebase.js';
import logger from '../../../lib/logger.js';
import * as Sentry from '@sentry/node';

const storage = new StorageHandler(bucket);
const MATERIALS = 'projectMaterials';
const PROPOSALS = 'projectMaterialProposals';

// Determine whether the caller is the project's provider.
async function getRole(uid, projectId) {
  const projectDoc = await db.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) return { allowed: false };
  const project = projectDoc.data();
  if (project.providerId === uid) return { allowed: true, role: 'provider', project };
  if (project.clientUserId === uid) return { allowed: true, role: 'client', project };
  return { allowed: false };
}

export async function CreateMaterial(req, res) {
  try {
    const { itemId, name, notes } = req.body || {};
    if (!itemId || !name) {
      return res.status(400).json({ error: 'itemId y name son requeridos' });
    }

    const itemDoc = await db.collection('projectItems').doc(itemId).get();
    if (!itemDoc.exists) return res.status(404).json({ error: 'Item no encontrado' });
    const item = itemDoc.data();

    const roleInfo = await getRole(req.uid, item.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    const addedBy = roleInfo.role;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection(MATERIALS).add({
      itemId,
      projectId: item.projectId,
      providerId: item.providerId,
      name: String(name).trim().slice(0, 200),
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      addedBy,
      createdAt: now,
      updatedAt: now
    });
    const created = await docRef.get();

    return res.json({ success: true, material: serializeDoc(created) });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('CreateMaterial error', { error: error.message });
    return res.status(500).json({ error: 'Error al crear material' });
  }
}

export async function UpdateMaterial(req, res) {
  try {
    const { id } = req.params;
    const { name, notes } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const ref = db.collection(MATERIALS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Material no encontrado' });
    const material = doc.data();

    const roleInfo = await getRole(req.uid, material.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    if (roleInfo.role === 'client' && material.addedBy !== 'client') {
      return res.status(403).json({ error: 'Solo podés editar materiales que sugeriste vos' });
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) updates.name = String(name).trim().slice(0, 200);
    if (notes !== undefined) updates.notes = notes ? String(notes).trim().slice(0, 500) : null;

    await ref.update(updates);
    const updated = await ref.get();
    return res.json({ success: true, material: serializeDoc(updated) });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('UpdateMaterial error', { error: error.message });
    return res.status(500).json({ error: 'Error al actualizar material' });
  }
}

export async function DeleteMaterial(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const ref = db.collection(MATERIALS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Material no encontrado' });
    const material = doc.data();

    const roleInfo = await getRole(req.uid, material.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    if (roleInfo.role === 'client' && material.addedBy !== 'client') {
      return res.status(403).json({ error: 'Solo podés eliminar materiales que sugeriste vos' });
    }

    // Cascade: delete proposals of this material + their images from Storage
    const propsSnap = await db.collection(PROPOSALS).where('materialId', '==', id).get();
    const batch = db.batch();
    const imageDeletions = [];
    for (const propDoc of propsSnap.docs) {
      batch.delete(propDoc.ref);
      const p = propDoc.data();
      const images = Array.isArray(p.images) ? p.images : [];
      for (const img of images) {
        const base = `projects/${p.projectId}/proposals/${propDoc.id}/${img.id}`;
        imageDeletions.push(storage.deleteFile(`${base}.jpg`));
        imageDeletions.push(storage.deleteFile(`${base}_thumb.jpg`));
      }
    }
    batch.delete(ref);
    await batch.commit();
    await Promise.allSettled(imageDeletions);

    return res.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('DeleteMaterial error', { error: error.message });
    return res.status(500).json({ error: 'Error al eliminar material' });
  }
}
