import { defineStore } from 'pinia';
import { VendorSchema } from '~/utils/odm/schemas/vendorSchema';

function vendorSlug(name: string): string {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

interface VendorState {
  vendors: string[];
  isLoading: boolean;
  error: string | null;
}

let vendorSchema: VendorSchema | null = null;

const getSchema = () => {
  if (!vendorSchema) {
    vendorSchema = new VendorSchema();
  }
  return vendorSchema;
};

export const useVendorStore = defineStore('vendor', {
  state: (): VendorState => ({
    vendors: [],
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
          this.vendors = result.data
            .map((doc: any) => doc.name)
            .filter((name: any): name is string => typeof name === 'string' && name.trim() !== '');
        } else {
          this.error = result.error || 'Error al obtener comercios';
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        this.error = 'Error al obtener comercios';
      } finally {
        this.isLoading = false;
      }
    },

    async saveAll(vendorNames: string[]) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().saveVendors(vendorNames.map(name => ({ name })));
        if (result.success) {
          this.vendors = vendorNames;
          return { success: true };
        } else {
          this.error = result.error || 'Error al guardar comercios';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error saving vendors:', error);
        this.error = 'Error al guardar comercios';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async addVendor(name: string) {
      const normalized = name.trim();
      if (!normalized) return;
      const newSlug = vendorSlug(normalized);
      const existing = this.vendors.find(v => vendorSlug(v) === newSlug);
      if (existing) return; // same slug = same vendor, skip

      const updated = [...this.vendors, normalized];
      await this.saveAll(updated);
    },

    clearState() {
      this.vendors = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
