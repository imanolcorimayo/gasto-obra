import { defineStore } from 'pinia';
import { DeliverySchema } from '~/utils/odm/schemas/deliverySchema';
import type { Delivery } from '~/interfaces';

interface DeliveryState {
  deliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
}

let deliverySchema: DeliverySchema | null = null;

const getSchema = () => {
  if (!deliverySchema) {
    deliverySchema = new DeliverySchema();
  }
  return deliverySchema;
};

export const useDeliveryStore = defineStore('delivery', {
  state: (): DeliveryState => ({
    deliveries: [],
    isLoading: false,
    error: null
  }),

  getters: {
    nextNumber: (state) => {
      if (state.deliveries.length === 0) return 1;
      return Math.max(...state.deliveries.map(d => d.number)) + 1;
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByProjectId(projectId);

        if (result.success && result.data) {
          this.deliveries = (result.data as Delivery[]).sort((a, b) => a.number - b.number);
        } else {
          this.error = result.error || 'Error al obtener las entregas';
        }
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        this.error = 'Error al obtener las entregas';
      } finally {
        this.isLoading = false;
      }
    },

    async createDelivery(data: Partial<Delivery>) {
      this.error = null;

      try {
        const result = await getSchema().create({
          ...data,
          number: this.nextNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        if (result.success && result.data) {
          this.deliveries.push(result.data as Delivery);
          return { success: true, data: result.data };
        } else {
          this.error = result.error || 'Error al crear la entrega';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error creating delivery:', error);
        this.error = 'Error al crear la entrega';
        return { success: false, error: this.error };
      }
    },

    async updateDelivery(id: string, data: Partial<Delivery>) {
      this.error = null;

      try {
        const result = await getSchema().update(id, { ...data, updatedAt: new Date() });

        if (result.success) {
          const index = this.deliveries.findIndex(d => d.id === id);
          if (index !== -1) {
            this.deliveries[index] = { ...this.deliveries[index], ...data };
          }
          return { success: true };
        } else {
          this.error = result.error || 'Error al actualizar la entrega';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error updating delivery:', error);
        this.error = 'Error al actualizar la entrega';
        return { success: false, error: this.error };
      }
    },

    async deleteDelivery(id: string, expenseStore: any) {
      this.error = null;

      try {
        // Unlink expenses from this delivery in batch
        const linkedExpenses = expenseStore.expenses.filter(
          (e: any) => e.deliveryId === id
        );
        if (linkedExpenses.length > 0) {
          await expenseStore.batchUpdateDeliveryId(
            linkedExpenses.map((e: any) => ({ expenseId: e.id, deliveryId: null }))
          );
        }

        const result = await getSchema().delete(id);

        if (result.success) {
          this.deliveries = this.deliveries.filter(d => d.id !== id);
          return true;
        } else {
          this.error = result.error || 'Error al eliminar la entrega';
          return false;
        }
      } catch (error) {
        console.error('Error deleting delivery:', error);
        this.error = 'Error al eliminar la entrega';
        return false;
      }
    },

    clearState() {
      this.deliveries = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
