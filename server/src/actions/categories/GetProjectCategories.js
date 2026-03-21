import * as CategoryService from '../../domain/services/CategoryService.js';
import * as respond from '../../responders/JsonResponder.js';

export async function GetProjectCategories(req, res) {
  const { projectId } = req.params;

  if (!projectId || typeof projectId !== 'string' || projectId.length > 50) {
    return respond.error(res, 'Project ID inválido');
  }

  const result = await CategoryService.getProjectCategories(req.uid, projectId);

  if (result.error) {
    return respond.error(res, result.error, result.statusCode);
  }

  return respond.success(res, result.data);
}
