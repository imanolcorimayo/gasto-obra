import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase';

const COLLECTION = 'providers';

export class ProviderSchema {
  async findOrCreateForCurrentUser(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const docRef = doc(db, COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }

      // Create with defaults + Firebase Auth data
      const newData = {
        managementFeePercent: 0,
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, newData, { merge: true });

      return { success: true, data: { id: user.uid, ...newData } };
    } catch (error) {
      console.error('Error in findOrCreateForCurrentUser:', error);
      return { success: false, error: `Error al obtener perfil de proveedor: ${error}` };
    }
  }

  async updateManagementFee(percent: number): Promise<{ success: boolean; error?: string }> {
    try {
      const user = getCurrentUser();
      if (!user) return { success: false, error: 'Usuario debe estar autenticado' };

      const db = getFirestoreInstance();
      const docRef = doc(db, COLLECTION, user.uid);
      await updateDoc(docRef, {
        managementFeePercent: percent,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating management fee:', error);
      return { success: false, error: 'Error al guardar el porcentaje de gestión' };
    }
  }
}
