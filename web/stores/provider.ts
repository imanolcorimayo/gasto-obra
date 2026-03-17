import { defineStore } from 'pinia';
import { ProviderSchema } from '~/utils/odm/schemas/providerSchema';

interface ProviderState {
  managementFeePercent: number;
  displayName: string;
  email: string;
  businessName: string;
  cuit: string;
  industry: string;
  additionalContact: string;
  isLoading: boolean;
  error: string | null;
}

let providerSchema: ProviderSchema | null = null;

const getSchema = () => {
  if (!providerSchema) {
    providerSchema = new ProviderSchema();
  }
  return providerSchema;
};

export const useProviderStore = defineStore('provider', {
  state: (): ProviderState => ({
    managementFeePercent: 0,
    displayName: '',
    email: '',
    businessName: '',
    cuit: '',
    industry: '',
    additionalContact: '',
    isLoading: false,
    error: null
  }),

  getters: {
    hasManagementFee: (state) => state.managementFeePercent > 0
  },

  actions: {
    async fetchOrCreate() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findOrCreateForCurrentUser();
        if (result.success && result.data) {
          this.managementFeePercent = result.data.managementFeePercent ?? 0;
          this.displayName = result.data.displayName ?? '';
          this.email = result.data.email ?? '';
          this.businessName = result.data.businessName ?? '';
          this.cuit = result.data.cuit ?? '';
          this.industry = result.data.industry ?? '';
          this.additionalContact = result.data.additionalContact ?? '';
        } else {
          this.error = result.error || 'Error al obtener perfil';
        }
      } catch (error) {
        console.error('Error fetching provider:', error);
        this.error = 'Error al obtener perfil';
      } finally {
        this.isLoading = false;
      }
    },

    async saveProfile(data: {
      displayName?: string;
      businessName?: string;
      cuit?: string;
      industry?: string;
      additionalContact?: string;
    }) {
      try {
        const result = await getSchema().updateProfile(data);
        if (result.success) {
          if (data.displayName !== undefined) this.displayName = data.displayName;
          if (data.businessName !== undefined) this.businessName = data.businessName;
          if (data.cuit !== undefined) this.cuit = data.cuit;
          if (data.industry !== undefined) this.industry = data.industry;
          if (data.additionalContact !== undefined) this.additionalContact = data.additionalContact;
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch (error) {
        console.error('Error saving profile:', error);
        return { success: false, error: 'Error al guardar el perfil' };
      }
    },

    async saveManagementFee(percent: number) {
      try {
        const result = await getSchema().updateManagementFee(percent);
        if (result.success) {
          this.managementFeePercent = percent;
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch (error) {
        console.error('Error saving management fee:', error);
        return { success: false, error: 'Error al guardar el porcentaje de gestión' };
      }
    },

    /** Fire-and-forget: ensures provider doc exists without blocking */
    ensureExists() {
      getSchema().findOrCreateForCurrentUser().catch((err) => {
        console.error('Error ensuring provider exists:', err);
      });
    },

    clearState() {
      this.managementFeePercent = 0;
      this.displayName = '';
      this.email = '';
      this.businessName = '';
      this.cuit = '';
      this.industry = '';
      this.additionalContact = '';
      this.isLoading = false;
      this.error = null;
    }
  }
});
