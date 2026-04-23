import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult, UpdateResult } from '../types';

export class CollaboratorSchema extends Schema {
  protected collectionName = 'collaborators';

  protected schema: SchemaDefinition = {
    providerId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    role: {
      type: 'string',
      required: true,
      default: 'otro'
    },
    phone: {
      type: 'string',
      required: false,
      maxLength: 30
    },
    email: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 2000
    },
    rating: {
      type: 'number',
      required: false,
      min: 0,
      max: 5
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

  async updateCollaborator(id: string, data: any): Promise<UpdateResult> {
    return this.update(id, data);
  }

  async findMine(): Promise<FetchResult> {
    const uid = this.getCurrentUserId();
    if (!uid) return { success: false, error: 'No autenticado' };
    return this.find({
      where: [{ field: 'providerId', operator: '==', value: uid }],
      orderBy: [{ field: 'name', direction: 'asc' }]
    }, 'providerId');
  }
}
