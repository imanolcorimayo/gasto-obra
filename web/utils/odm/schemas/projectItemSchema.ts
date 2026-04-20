import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult, UpdateResult } from '../types';

export class ProjectItemSchema extends Schema {
  protected collectionName = 'projectItems';

  protected schema: SchemaDefinition = {
    projectId: {
      type: 'string',
      required: true
    },
    providerId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    laborBudget: {
      type: 'number',
      required: true,
      min: 0
    },
    materialsBudgetMin: {
      type: 'number',
      required: true,
      min: 0
    },
    materialsBudgetMax: {
      type: 'number',
      required: true,
      min: 0
    },
    plannedStartDate: {
      type: 'date',
      required: true
    },
    plannedEndDate: {
      type: 'date',
      required: true
    },
    actualStartDate: {
      type: 'date',
      required: false
    },
    actualEndDate: {
      type: 'date',
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

  async updateItem(id: string, data: any): Promise<UpdateResult> {
    return this.update(id, data);
  }

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [
        { field: 'plannedStartDate', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' }
      ]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [
        { field: 'plannedStartDate', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' }
      ]
    });
  }
}
