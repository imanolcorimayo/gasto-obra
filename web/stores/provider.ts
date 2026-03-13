import { defineStore } from 'pinia';
import { ProviderSchema } from '~/utils/odm/schemas/providerSchema';

interface ProviderState {
  managementFeePercent: number;
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
      this.isLoading = false;
      this.error = null;
    }
  }
});
