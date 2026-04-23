import { admin, db, bucket } from '../../config/firebase.js';
import { isProjectParticipant } from '../../helpers/participantCheck.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import logger from '../../../lib/logger.js';
import * as Sentry from '@sentry/node';

const storage = new StorageHandler(bucket);

const CONFIG = {
  item: {
    collection: 'projectItems',
    pathPrefix: 'items'
  },
  proposal: {
    collection: 'projectMaterialProposals',
    pathPrefix: 'proposals'
  },
  task: {
    collection: 'projectTasks',
    pathPrefix: 'tasks'
  }
};

export function DeleteEntityImage(entityKind) {
  const config = CONFIG[entityKind];
  if (!config) throw new Error(`Unknown entity kind: ${entityKind}`);

  return async function handler(req, res) {
    try {
      const { id, imageId } = req.params;
      if (!id || !imageId) {
        return res.status(400).json({ error: 'Parámetros faltantes' });
      }

      const entityRef = db.collection(config.collection).doc(id);
      const entityDoc = await entityRef.get();
      if (!entityDoc.exists) {
        return res.status(404).json({ error: 'No encontrado' });
      }

      const entity = entityDoc.data();
      const projectId = entity.projectId;

      const allowed = await isProjectParticipant(req.uid, projectId);
      if (!allowed) {
        return res.status(403).json({ error: 'Sin permisos para este proyecto' });
      }

      const images = Array.isArray(entity.images) ? entity.images : [];
      const image = images.find(img => img.id === imageId);
      if (!image) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      // Delete both Storage files (best-effort; continue even if deletion fails)
      const basePath = `projects/${projectId}/${config.pathPrefix}/${id}/${imageId}`;
      await Promise.all([
        storage.deleteFile(`${basePath}.jpg`),
        storage.deleteFile(`${basePath}_thumb.jpg`)
      ]);

      // Remove from array
      await entityRef.update({
        images: admin.firestore.FieldValue.arrayRemove(image),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info('Image deleted', { entityKind, entityId: id, imageId });
      return res.json({ success: true });
    } catch (error) {
      Sentry.captureException(error, { extra: { entityKind, params: req.params } });
      logger.error('DeleteEntityImage error', { error: error.message, entityKind });
      return res.status(500).json({ error: 'Error al eliminar la imagen' });
    }
  };
}
