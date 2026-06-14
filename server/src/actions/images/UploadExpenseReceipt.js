import { randomUUID } from 'crypto';
import { admin, db, bucket, COLLECTIONS } from '../../config/firebase.js';
import { processImage } from '../../helpers/imageProcessor.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import logger from '../../../lib/logger.js';
import * as Sentry from '@sentry/node';

const storage = new StorageHandler(bucket);

// Attach (or replace) the comprobante image of an existing expense the caller owns.
// Backs the focused "subir comprobante" page linked from agent-created expenses
// (the agent can record an expense from a described receipt but can't carry the
// file's bytes, so the user attaches the photo here in one tap — optional).
export async function UploadExpenseReceipt(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Imagen requerida' });

    const ref = db.collection(COLLECTIONS.EXPENSES).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'No encontrado' });

    const expense = doc.data();
    // Ownership: only the provider who owns the expense can attach its comprobante.
    if (expense.providerId !== req.uid) return res.status(403).json({ error: 'Sin permisos' });

    const { display } = await processImage(req.file.buffer);
    const imageId = randomUUID();
    const path = `projects/${expense.projectId}/expenses/${id}/${imageId}.jpg`;
    const imageUrl = await storage.uploadFile(display, path, 'image/jpeg');
    if (!imageUrl) return res.status(500).json({ error: 'Error al subir la imagen' });

    await ref.update({
      imageUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('Expense receipt uploaded', { expenseId: id });
    return res.json({ success: true, imageUrl });
  } catch (error) {
    Sentry.captureException(error, { extra: { params: req.params } });
    logger.error('UploadExpenseReceipt error', { error: error.message });
    return res.status(500).json({ error: 'Error al procesar la imagen' });
  }
}
