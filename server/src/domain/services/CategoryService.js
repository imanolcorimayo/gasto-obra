import { db, COLLECTIONS } from '../../config/firebase.js';
import * as CategoryRepository from '../repositories/CategoryRepository.js';

export async function getProjectCategories(uid, projectId) {
  const projectDoc = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get();
  if (!projectDoc.exists) {
    return { error: 'Proyecto no encontrado', statusCode: 404 };
  }

  const project = projectDoc.data();
  const isParticipant = uid === project.providerId || uid === project.clientUserId;
  if (!isParticipant) {
    return { error: 'Sin acceso a este proyecto', statusCode: 403 };
  }

  const [global, project_] = await Promise.all([
    CategoryRepository.findGlobalByProvider(project.providerId),
    CategoryRepository.findByProviderAndProject(project.providerId, projectId)
  ]);

  return {
    data: {
      global: global.map(toDTO),
      project: project_.map(toDTO)
    }
  };
}

function toDTO(cat) {
  return { value: cat.value, label: cat.label, color: cat.color };
}
