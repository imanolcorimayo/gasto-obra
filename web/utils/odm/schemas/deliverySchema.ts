import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult } from '../types';

export class DeliverySchema extends Schema {
  protected collectionName = 'deliveries';

  protected schema: SchemaDefinition = {
    projectId: {
      type: 'string',
      required: true
    },
    providerId: {
      type: 'string',
      required: true
    },
    number: {
      type: 'number',
      required: true,
      min: 1
    },
    date: {
      type: 'date',
      required: true
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 200
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

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }]
    });
  }
}
