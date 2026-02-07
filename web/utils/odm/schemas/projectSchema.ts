import { Schema } from '../schema';
import type { SchemaDefinition, CreateResult } from '../types';
import { serverTimestamp } from 'firebase/firestore';

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
}
