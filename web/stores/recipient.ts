import { defineStore } from 'pinia';
import { RecipientSchema } from '~/utils/odm/schemas/recipientSchema';
import type { Recipient } from '~/interfaces';

interface RecipientState {
  recipients: Recipient[];
  isLoading: boolean;
  error: string | null;
}

let recipientSchema: RecipientSchema | null = null;

const getSchema = () => {
  if (!recipientSchema) {
    recipientSchema = new RecipientSchema();
  }
  return recipientSchema;
};

function docToRecipient(doc: any): Recipient {
  return {
    name: doc.name,
    bankInfo: doc.bankInfo || '',
    platform: doc.platform || '',
    cuit: doc.cuit || ''
  };
}

export const useRecipientStore = defineStore('recipient', {
  state: (): RecipientState => ({
    recipients: [],
    isLoading: false,
    error: null
  }),

  actions: {
    async fetchAll() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findAll();
        if (result.success && result.data) {
          this.recipients = result.data.map(docToRecipient);
        } else {
          this.error = result.error || 'Error al obtener destinatarios';
        }
      } catch (error) {
        console.error('Error fetching recipients:', error);
        this.error = 'Error al obtener destinatarios';
      } finally {
        this.isLoading = false;
      }
    },

    async saveAll(recipients: Recipient[]) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().saveRecipients(recipients);
        if (result.success) {
          this.recipients = recipients;
          return { success: true };
        } else {
          this.error = result.error || 'Error al guardar destinatarios';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error saving recipients:', error);
        this.error = 'Error al guardar destinatarios';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    clearState() {
      this.recipients = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
