import { Schema } from '../schema';
import type { SchemaDefinition, CreateResult, FetchResult, UpdateResult } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export class ProjectSchema extends Schema {
  protected collectionName = 'projects';

  protected schema: SchemaDefinition = {
    name: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    tag: {
      type: 'string',
      required: true,
      maxLength: 30
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    address: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    clientName: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    clientPhone: {
      type: 'string',
      required: false,
      maxLength: 20
    },
    providerId: {
      type: 'string',
      required: true
    },
    status: {
      type: 'string',
      required: true,
      default: 'active'
    },
    shareToken: {
      type: 'string',
      required: true
    },
    budget: {
      type: 'number',
      required: false
    },
    startDate: {
      type: 'date',
      required: false
    },
    estimatedEndDate: {
      type: 'date',
      required: false
    },
    clientUserId: {
      type: 'string',
      required: false
    },
    reportNumber: {
      type: 'string',
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

  private generateShareToken(): string {
    return crypto.randomUUID();
  }

  async createProject(data: any): Promise<CreateResult> {
    // Normalize tag (lowercase, no spaces, no special chars)
    if (data.tag) {
      data.tag = data.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Set provider and defaults before validation
    data.providerId = this.getCurrentUserId();
    data.status = data.status || 'active';
    data.shareToken = this.generateShareToken();
    data.clientUserId = null;

    return this.create(data);
  }

  async findByProviderId() {
    return this.find({
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    }, 'providerId');
  }

  async findActiveByProviderId() {
    return this.find({
      where: [{ field: 'status', operator: '==', value: 'active' }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    }, 'providerId');
  }

  async findByShareToken(token: string) {
    return this.findPublic({
      where: [{ field: 'shareToken', operator: '==', value: token }],
      limit: 1
    });
  }

  async findByClientUserId(clientUserId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'clientUserId', operator: '==', value: clientUserId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  // Direct update without pre-read — needed for client join flow where the
  // user can't read the project yet (not a participant) but can update
  // clientUserId per Firestore rules.
  async joinProject(projectId: string, clientUserId: string): Promise<UpdateResult> {
    try {
      const docRef = doc(this.getCollectionRef(), projectId);
      await updateDoc(docRef, {
        clientUserId,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error joining project:', error);
      return { success: false, error: `Error al unirse al proyecto: ${error}` };
    }
  }
}
