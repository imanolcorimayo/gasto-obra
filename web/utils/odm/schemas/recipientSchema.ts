import { Schema } from '../schema';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc
} from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase';
import type { SchemaDefinition, FetchResult } from '../types';

export class RecipientSchema extends Schema {
  protected collectionName = 'recipients';

  protected schema: SchemaDefinition = {
    userId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    bankInfo: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    platform: {
      type: 'string',
      required: false,
      maxLength: 50
    },
    cuit: {
      type: 'string',
      required: false,
      maxLength: 20
    }
  };

  async findAll(): Promise<FetchResult> {
    return this.find({}, 'userId');
  }

  async saveRecipients(recipients: Array<{ name: string; bankInfo: string; platform: string; cuit: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const batch = writeBatch(db);

      // Delete existing recipients for this user
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));

      // Create new recipients
      for (const r of recipients) {
        const newDoc = doc(colRef);
        batch.set(newDoc, {
          userId: user.uid,
          name: r.name,
          bankInfo: r.bankInfo || '',
          platform: r.platform || '',
          cuit: r.cuit || ''
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error saving recipients:', error);
      return { success: false, error: `Error al guardar destinatarios: ${error}` };
    }
  }
}
