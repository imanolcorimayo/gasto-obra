import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult } from '../types';

export class ExpenseSchema extends Schema {
  protected collectionName = 'expenses';

  protected schema: SchemaDefinition = {
    projectId: {
      type: 'string',
      required: true
    },
    providerId: {
      type: 'string',
      required: true
    },
    title: {
      type: 'string',
      required: true,
      maxLength: 200
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    amount: {
      type: 'number',
      required: true,
      min: 0
    },
    category: {
      type: 'string',
      required: false,
      default: 'otros'
    },
    imageUrl: {
      type: 'string',
      required: false
    },
    audioTranscription: {
      type: 'string',
      required: false
    },
    originalMessage: {
      type: 'string',
      required: false
    },
    source: {
      type: 'string',
      required: true,
      default: 'web'
    },
    date: {
      type: 'date',
      required: false
    },
    createdAt: {
      type: 'date',
      required: false
    }
  };

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    }, 'providerId');
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }
}
