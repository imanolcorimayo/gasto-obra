import { defineStore } from 'pinia';
import { collection, query, where, onSnapshot, doc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase';
import { WhatsappLinkSchema } from '~/utils/odm/schemas/whatsappLinkSchema';

interface LinkedAccount {
  id: string;
  status: string;
  userId: string;
  phoneNumber: string;
  contactName?: string;
  linkedAt?: any;
}

interface WhatsappState {
  linkedAccount: LinkedAccount | null;
  pendingCode: string | null;
  codeExpiresAt: Date | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  managementFeePercent: number;
}

let whatsappSchema: WhatsappLinkSchema | null = null;
let unsubscribeLink: Unsubscribe | null = null;

const getSchema = () => {
  if (!whatsappSchema) {
    whatsappSchema = new WhatsappLinkSchema();
  }
  return whatsappSchema;
};

export const useWhatsappStore = defineStore('whatsapp', {
  state: (): WhatsappState => ({
    linkedAccount: null,
    pendingCode: null,
    codeExpiresAt: null,
    isLoading: false,
    isGenerating: false,
    error: null,
    managementFeePercent: 0
  }),

  getters: {
    isLinked: (state) => !!state.linkedAccount,
    hasManagementFee: (state) => state.managementFeePercent > 0,
    hasValidCode: (state) => {
      if (!state.pendingCode || !state.codeExpiresAt) return false;
      return new Date() < state.codeExpiresAt;
    }
  },

  actions: {
    async fetchLinkedAccount() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findLinkedAccount();

        if (result.success && result.data && result.data.length > 0) {
          const link = result.data[0];
          this.linkedAccount = {
            ...link,
            phoneNumber: link.id
          } as LinkedAccount;
          this.managementFeePercent = link.managementFeePercent ?? 0;
        } else {
          this.linkedAccount = null;
          this.managementFeePercent = 0;
        }

        return true;
      } catch (error) {
        console.error('Error fetching linked account:', error);
        this.error = 'Error al obtener la cuenta vinculada';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPendingCode() {
      try {
        const result = await getSchema().findPendingCode();

        if (result.success && result.data && result.data.length > 0) {
          const pending = result.data[0];
          const createdAt = pending.createdAt?.toDate?.() || new Date(pending.createdAt);
          const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

          if (new Date() < expiresAt) {
            this.pendingCode = pending.id;
            this.codeExpiresAt = expiresAt;
            return { success: true, code: pending.id, expiresAt };
          } else {
            this.pendingCode = null;
            this.codeExpiresAt = null;
          }
        }

        return { success: false };
      } catch (error) {
        console.error('Error fetching pending code:', error);
        return { success: false };
      }
    },

    async generateCode() {
      this.isGenerating = true;
      this.error = null;

      try {
        const result = await getSchema().createPendingCode();

        if (result.success && result.code) {
          this.pendingCode = result.code;
          this.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
          return { success: true, code: result.code };
        } else {
          this.error = result.error || 'Error al generar el codigo';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error generating code:', error);
        this.error = 'Error al generar el codigo';
        return { success: false, error: this.error };
      } finally {
        this.isGenerating = false;
      }
    },

    async unlinkAccount() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().unlinkAccount();

        if (result.success) {
          this.linkedAccount = null;
          return true;
        } else {
          this.error = result.error || 'Error al desvincular la cuenta';
          return false;
        }
      } catch (error) {
        console.error('Error unlinking account:', error);
        this.error = 'Error al desvincular la cuenta';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    clearPendingCode() {
      this.pendingCode = null;
      this.codeExpiresAt = null;
    },

    subscribeToChanges() {
      const user = getCurrentUser();
      if (!user) return;

      this.unsubscribe();

      const db = getFirestoreInstance();
      const linksRef = collection(db, 'whatsappLinks');
      const q = query(linksRef, where('userId', '==', user.uid), where('status', '==', 'linked'));

      unsubscribeLink = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          this.linkedAccount = {
            ...docData,
            id: snapshot.docs[0].id,
            phoneNumber: snapshot.docs[0].id
          } as LinkedAccount;
          this.managementFeePercent = docData.managementFeePercent ?? 0;
          this.clearPendingCode();
        } else {
          this.linkedAccount = null;
          this.managementFeePercent = 0;
        }
      });
    },

    unsubscribe() {
      if (unsubscribeLink) {
        unsubscribeLink();
        unsubscribeLink = null;
      }
    },

    async saveManagementFee(percent: number) {
      if (!this.linkedAccount) return { success: false, error: 'No hay cuenta vinculada' };

      try {
        const db = getFirestoreInstance();
        const docRef = doc(db, 'whatsappLinks', this.linkedAccount.phoneNumber);
        await updateDoc(docRef, { managementFeePercent: percent });
        this.managementFeePercent = percent;
        return { success: true };
      } catch (error) {
        console.error('Error saving management fee:', error);
        return { success: false, error: 'Error al guardar el porcentaje de gestión' };
      }
    },

    clearState() {
      this.unsubscribe();
      this.linkedAccount = null;
      this.pendingCode = null;
      this.codeExpiresAt = null;
      this.isLoading = false;
      this.isGenerating = false;
      this.error = null;
    }
  }
});
