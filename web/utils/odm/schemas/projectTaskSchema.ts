import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult, UpdateResult } from '../types';

export class ProjectTaskSchema extends Schema {
  protected collectionName = 'projectTasks';

  protected schema: SchemaDefinition = {
    projectId: {
      type: 'string',
      required: true
    },
    providerId: {
      type: 'string',
      required: true
    },
    itemId: {
      type: 'string',
      required: true
    },
    description: {
      type: 'string',
      required: true,
      maxLength: 300
    },
    status: {
      type: 'string',
      required: true,
      default: 'pendiente'
    },
    order: {
      type: 'number',
      required: false,
      default: 0
    },
    plannedDate: {
      type: 'date',
      required: false
    },
    completedAt: {
      type: 'date',
      required: false
    },
    collaboratorId: {
      type: 'string',
      required: false
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 2000
    },
    images: {
      type: 'array',
      required: false
    },
    createdAt: {
      type: 'date',
      required: false
    },
    updatedAt: {
      type: 'date',
      required: false
    }
  };

  async updateTask(id: string, data: any): Promise<UpdateResult> {
    return this.update(id, data);
  }

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [
        { field: 'itemId', direction: 'asc' },
        { field: 'order', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' }
      ]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [
        { field: 'itemId', direction: 'asc' },
        { field: 'order', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' }
      ]
    });
  }
}
