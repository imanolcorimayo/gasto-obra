import { admin, db, bucket } from '../../config/firebase.js';
import { isProjectParticipant } from '../../helpers/participantCheck.js';
import { serializeDoc } from '../../helpers/firestoreSerialize.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import logger from '../../../lib/logger.js';
import * as Sentry from '@sentry/node';

const storage = new StorageHandler(bucket);
const MATERIALS = 'projectMaterials';
const PROPOSALS = 'projectMaterialProposals';

async function getRole(uid, projectId) {
  const projectDoc = await db.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) return { allowed: false };
  const project = projectDoc.data();
  if (project.providerId === uid) return { allowed: true, role: 'provider', project };
  if (project.clientUserId === uid) return { allowed: true, role: 'client', project };
  return { allowed: false };
}

export async function CreateProposal(req, res) {
  try {
    const { materialId, vendor, amount, notes } = req.body || {};
    if (!materialId || amount == null) {
      return res.status(400).json({ error: 'materialId y amount son requeridos' });
    }

    const matDoc = await db.collection(MATERIALS).doc(materialId).get();
    if (!matDoc.exists) return res.status(404).json({ error: 'Material no encontrado' });
    const material = matDoc.data();

    const roleInfo = await getRole(req.uid, material.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    const addedBy = roleInfo.role;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection(PROPOSALS).add({
      materialId,
      itemId: material.itemId,
      projectId: material.projectId,
      providerId: material.providerId,
      vendor: vendor ? String(vendor).trim().slice(0, 100) : null,
      amount: parseFloat(amount) || 0,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      addedBy,
      createdAt: now,
      updatedAt: now
    });
    const created = await docRef.get();

    return res.json({ success: true, proposal: serializeDoc(created) });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('CreateProposal error', { error: error.message });
    return res.status(500).json({ error: 'Error al crear propuesta' });
  }
}

export async function UpdateProposal(req, res) {
  try {
    const { id } = req.params;
    const { vendor, amount, notes } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const ref = db.collection(PROPOSALS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Propuesta no encontrada' });
    const proposal = doc.data();

    const roleInfo = await getRole(req.uid, proposal.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    if (roleInfo.role === 'client' && proposal.addedBy !== 'client') {
      return res.status(403).json({ error: 'Solo podés editar propuestas que sugeriste vos' });
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (vendor !== undefined) updates.vendor = vendor ? String(vendor).trim().slice(0, 100) : null;
    if (amount !== undefined) updates.amount = parseFloat(amount) || 0;
    if (notes !== undefined) updates.notes = notes ? String(notes).trim().slice(0, 500) : null;

    await ref.update(updates);
    const updated = await ref.get();
    return res.json({ success: true, proposal: serializeDoc(updated) });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('UpdateProposal error', { error: error.message });
    return res.status(500).json({ error: 'Error al actualizar propuesta' });
  }
}

export async function DeleteProposal(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const ref = db.collection(PROPOSALS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Propuesta no encontrada' });
    const proposal = doc.data();

    const roleInfo = await getRole(req.uid, proposal.projectId);
    if (!roleInfo.allowed) return res.status(403).json({ error: 'Sin permisos' });

    if (roleInfo.role === 'client' && proposal.addedBy !== 'client') {
      return res.status(403).json({ error: 'Solo podés eliminar propuestas que sugeriste vos' });
    }

    // Cascade: delete proposal's images from Storage
    const images = Array.isArray(proposal.images) ? proposal.images : [];
    const deletions = [];
    for (const img of images) {
      const base = `projects/${proposal.projectId}/proposals/${id}/${img.id}`;
      deletions.push(storage.deleteFile(`${base}.jpg`));
      deletions.push(storage.deleteFile(`${base}_thumb.jpg`));
    }
    await Promise.allSettled(deletions);

    await ref.delete();
    return res.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('DeleteProposal error', { error: error.message });
    return res.status(500).json({ error: 'Error al eliminar propuesta' });
  }
}
