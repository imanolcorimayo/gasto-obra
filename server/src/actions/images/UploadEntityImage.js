import { randomUUID } from 'crypto';
import { admin, db, bucket } from '../../config/firebase.js';
import { processImage } from '../../helpers/imageProcessor.js';
import { isProjectParticipant } from '../../helpers/participantCheck.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import logger from '../../../lib/logger.js';
import * as Sentry from '@sentry/node';

const storage = new StorageHandler(bucket);

// entityKind is 'item' (projectItems) or 'proposal' (projectMaterialProposals).
// Routes to the right collection and storage path.
const CONFIG = {
  item: {
    collection: 'projectItems',
    pathPrefix: 'items'
  },
  proposal: {
    collection: 'projectMaterialProposals',
    pathPrefix: 'proposals'
  }
};

export function UploadEntityImage(entityKind) {
  const config = CONFIG[entityKind];
  if (!config) throw new Error(`Unknown entity kind: ${entityKind}`);

  return async function handler(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Imagen requerida' });
      }

      // Look up the entity
      const entityRef = db.collection(config.collection).doc(id);
      const entityDoc = await entityRef.get();
      if (!entityDoc.exists) {
        return res.status(404).json({ error: 'No encontrado' });
      }

      const entity = entityDoc.data();
      const projectId = entity.projectId;

      // Verify the caller is a participant of the owning project
      const allowed = await isProjectParticipant(req.uid, projectId);
      if (!allowed) {
        return res.status(403).json({ error: 'Sin permisos para este proyecto' });
      }

      // Determine uploader role
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const project = projectDoc.data();
      const uploadedBy = project.providerId === req.uid ? 'provider' : 'client';

      // Process
      const { thumb, display } = await processImage(req.file.buffer);

      // Upload both sizes
      const imageId = randomUUID();
      const basePath = `projects/${projectId}/${config.pathPrefix}/${id}/${imageId}`;
      const [displayUrl, thumbUrl] = await Promise.all([
        storage.uploadFile(display, `${basePath}.jpg`, 'image/jpeg'),
        storage.uploadFile(thumb, `${basePath}_thumb.jpg`, 'image/jpeg')
      ]);

      if (!displayUrl || !thumbUrl) {
        return res.status(500).json({ error: 'Error al subir la imagen' });
      }

      // Append to images array
      const imageEntry = {
        id: imageId,
        url: displayUrl,
        thumbUrl,
        uploadedBy,
        createdAt: new Date()
      };

      await entityRef.update({
        images: admin.firestore.FieldValue.arrayUnion(imageEntry),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info('Image uploaded', { entityKind, entityId: id, imageId, uploadedBy });
      return res.json({ success: true, image: imageEntry });
    } catch (error) {
      Sentry.captureException(error, { extra: { entityKind, params: req.params } });
      logger.error('UploadEntityImage error', { error: error.message, entityKind });
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }
  };
}
