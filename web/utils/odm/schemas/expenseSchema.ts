import { Schema } from '../schema';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '~/utils/firebase';
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
    type: {
      type: 'string',
      required: false,
      default: 'expense'
    },
    scopeType: {
      type: 'string',
      required: false,
      default: 'original'
    },
    items: {
      type: 'array',
      required: false
    },
    paymentStatus: {
      type: 'string',
      required: false,
      default: 'paid'
    },
    paymentMethod: {
      type: 'string',
      required: false
    },
    recipientName: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    recipientBankInfo: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    recipientPlatform: {
      type: 'string',
      required: false,
      maxLength: 50
    },
    recipientCuit: {
      type: 'string',
      required: false,
      maxLength: 20
    },
    linkedExpenseId: {
      type: 'string',
      required: false
    },
    linkedPaymentId: {
      type: 'string',
      required: false
    },
    deliveryId: {
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

  async updateExpense(id: string, data: any): Promise<any> {
    return this.update(id, data);
  }

  async findByProjectId(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    }, 'providerId');
  }

  async batchUpdateDeliveryId(assignments: Array<{ expenseId: string; deliveryId: string | null }>): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getFirestoreInstance();
      const batch = writeBatch(db);
      const colRef = collection(db, this.collectionName);

      for (const { expenseId, deliveryId } of assignments) {
        batch.update(doc(colRef, expenseId), {
          deliveryId: deliveryId || null,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error batch updating deliveryId:', error);
      return { success: false, error: `Error al asignar entregas: ${error}` };
    }
  }

  async findByProjectIdPublic(projectId: string): Promise<FetchResult> {
    return this.findPublic({
      where: [{ field: 'projectId', operator: '==', value: projectId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }
}
