import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult, UpdateResult } from '../types';

export class ProjectMaterialProposalSchema extends Schema {
  protected collectionName = 'projectMaterialProposals';

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
    materialId: {
      type: 'string',
      required: true
    },
    vendor: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    amount: {
      type: 'number',
      required: true,
      min: 0
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    addedBy: {
      type: 'string',
      required: true,
      default: 'provider'
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

  async updateProposal(id: string, data: any): Promise<UpdateResult> {
    return this.update(id, data);
  }

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }]
    });
  }
}
