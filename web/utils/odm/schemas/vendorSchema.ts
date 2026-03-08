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

export class VendorSchema extends Schema {
  protected collectionName = 'vendors';

  protected schema: SchemaDefinition = {
    userId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100
    }
  };

  async findAll(): Promise<FetchResult> {
    return this.find({}, 'userId');
  }

  async saveVendors(vendors: Array<{ name: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const batch = writeBatch(db);

      // Delete existing vendors for this user
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));

      // Create new vendors
      for (const v of vendors) {
        const newDoc = doc(colRef);
        batch.set(newDoc, {
          userId: user.uid,
          name: v.name
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error saving vendors:', error);
      return { success: false, error: `Error al guardar comercios: ${error}` };
    }
  }
}
