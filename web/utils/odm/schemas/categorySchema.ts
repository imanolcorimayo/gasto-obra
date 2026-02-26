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

export class CategorySchema extends Schema {
  protected collectionName = 'categories';

  protected schema: SchemaDefinition = {
    userId: {
      type: 'string',
      required: true
    },
    projectId: {
      type: 'string',
      required: false
    },
    value: {
      type: 'string',
      required: true,
      maxLength: 50
    },
    label: {
      type: 'string',
      required: true,
      maxLength: 50
    },
    color: {
      type: 'string',
      required: true,
      maxLength: 7
    }
  };

  async findGlobal(): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: null }]
    }, 'userId');
  }

  async findByProject(projectId: string): Promise<FetchResult> {
    return this.find({
      where: [{ field: 'projectId', operator: '==', value: projectId }]
    }, 'userId');
  }

  async findByProviderPublic(providerId: string, projectId?: string): Promise<FetchResult> {
    const constraints = [
      { field: 'userId', operator: '==' as const, value: providerId }
    ];

    if (projectId) {
      constraints.push({ field: 'projectId', operator: '==', value: projectId });
    } else {
      constraints.push({ field: 'projectId', operator: '==', value: null });
    }

    return this.findPublic({ where: constraints });
  }

  async saveCategories(categories: Array<{ value: string; label: string; color: string }>, projectId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const batch = writeBatch(db);

      // Delete existing categories for this scope
      const colRef = collection(db, this.collectionName);
      const q = projectId
        ? query(colRef, where('userId', '==', user.uid), where('projectId', '==', projectId))
        : query(colRef, where('userId', '==', user.uid), where('projectId', '==', null));

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));

      // Create new categories
      for (const cat of categories) {
        const newDoc = doc(colRef);
        batch.set(newDoc, {
          userId: user.uid,
          projectId: projectId || null,
          value: cat.value,
          label: cat.label,
          color: cat.color
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error saving categories:', error);
      return { success: false, error: `Error al guardar categorias: ${error}` };
    }
  }

  async deleteByProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const batch = writeBatch(db);

      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('userId', '==', user.uid), where('projectId', '==', projectId));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error deleting project categories:', error);
      return { success: false, error: `Error al eliminar categorias: ${error}` };
    }
  }
}
