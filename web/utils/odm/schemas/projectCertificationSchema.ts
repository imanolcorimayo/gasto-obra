import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult, UpdateResult } from '../types';

export class ProjectCertificationSchema extends Schema {
  protected collectionName = 'projectCertifications';

  protected schema: SchemaDefinition = {
    projectId: { type: 'string', required: true },
    providerId: { type: 'string', required: true },
    number: { type: 'number', required: false, default: 1 },
    title: { type: 'string', required: false, maxLength: 200 },
    periodStart: { type: 'date', required: false },
    periodEnd: { type: 'date', required: false },
    issueDate: { type: 'date', required: false },
    lines: { type: 'array', required: false },
    totalAmount: { type: 'number', required: false, default: 0 },
    notes: { type: 'string', required: false, maxLength: 4000 },
    status: { type: 'string', required: false, default: 'draft' },
    createdAt: { type: 'date', required: false },
    updatedAt: { type: 'date', required: false }
  };

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'number', direction: 'desc' }]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'number', direction: 'desc' }]
    });
  }

  async updateCertification(id: string, data: any): Promise<UpdateResult> {
    return this.update(id, data);
  }
}
