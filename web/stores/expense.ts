import { defineStore } from 'pinia';
import { ExpenseSchema } from '~/utils/odm/schemas/expenseSchema';
import type { Expense } from '~/interfaces';

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
}

let expenseSchema: ExpenseSchema | null = null;

const getSchema = () => {
  if (!expenseSchema) {
    expenseSchema = new ExpenseSchema();
  }
  return expenseSchema;
};

export const useExpenseStore = defineStore('expense', {
  state: (): ExpenseState => ({
    expenses: [],
    isLoading: false,
    error: null
  }),

  getters: {
    totalAmount: (state) => state.expenses.reduce((sum, e) => sum + (e.amount || 0), 0),

    expensesByCategory: (state) => {
      const grouped: Record<string, { total: number; count: number }> = {};
      state.expenses.forEach(e => {
        const cat = e.category || 'otros';
        if (!grouped[cat]) {
          grouped[cat] = { total: 0, count: 0 };
        }
        grouped[cat].total += e.amount || 0;
        grouped[cat].count++;
      });
      return grouped;
    },

    clientExpenses: (state) => {
      return state.expenses.filter(e => !e.type || e.type === 'expense');
    },

    payments: (state) => {
      return state.expenses.filter(e => e.type === 'payment');
    },

    providerExpenses: (state) => {
      return state.expenses.filter(e => e.type === 'provider_expense');
    },

    totalClientExpenses(): number {
      return this.clientExpenses.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0);
    },

    totalPayments(): number {
      return this.payments.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0);
    },

    totalProviderExpenses(): number {
      return this.providerExpenses.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0);
    },

    clientBalance(): number {
      return this.totalPayments - this.totalClientExpenses;
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByProjectId(projectId);

        if (result.success && result.data) {
          this.expenses = result.data as Expense[];
        } else {
          this.error = result.error || 'Error al obtener los gastos';
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
        this.error = 'Error al obtener los gastos';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchByProjectIdPublic(projectId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByProjectIdPublic(projectId);

        if (result.success && result.data) {
          this.expenses = result.data as Expense[];
        } else {
          this.error = result.error || 'Error al obtener los gastos';
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
        this.error = 'Error al obtener los gastos';
      } finally {
        this.isLoading = false;
      }
    },

    async createExpense(data: Partial<Expense>) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().create({
          ...data,
          type: data.type || 'expense',
          source: 'web',
          date: new Date()
        });

        if (result.success && result.data) {
          this.expenses.unshift(result.data as Expense);
          return { success: true, data: result.data };
        } else {
          this.error = result.error || 'Error al crear el gasto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error creating expense:', error);
        this.error = 'Error al crear el gasto';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updateExpense(id: string, data: Partial<Expense>) {
      this.error = null;

      try {
        const result = await getSchema().updateExpense(id, data);

        if (result.success) {
          const index = this.expenses.findIndex(e => e.id === id);
          if (index !== -1) {
            this.expenses[index] = { ...this.expenses[index], ...data };
          }
          return { success: true };
        } else {
          this.error = result.error || 'Error al actualizar el gasto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error updating expense:', error);
        this.error = 'Error al actualizar el gasto';
        return { success: false, error: this.error };
      }
    },

    async deleteExpense(id: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().delete(id);

        if (result.success) {
          this.expenses = this.expenses.filter(e => e.id !== id);
          return true;
        } else {
          this.error = result.error || 'Error al eliminar el gasto';
          return false;
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        this.error = 'Error al eliminar el gasto';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    clearState() {
      this.expenses = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
