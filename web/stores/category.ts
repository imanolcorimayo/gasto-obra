import { defineStore } from 'pinia';
import { CategorySchema } from '~/utils/odm/schemas/categorySchema';
import { resolveCategories, DEFAULT_EXPENSE_CATEGORIES } from '~/utils';
import type { ExpenseCategory } from '~/interfaces';

interface CategoryState {
  globalCategories: ExpenseCategory[];
  projectCategoriesMap: Record<string, ExpenseCategory[]>;
  isLoading: boolean;
  error: string | null;
}

let categorySchema: CategorySchema | null = null;

const getSchema = () => {
  if (!categorySchema) {
    categorySchema = new CategorySchema();
  }
  return categorySchema;
};

function docToCategory(doc: any): ExpenseCategory {
  return {
    value: doc.value,
    label: doc.label,
    color: doc.color
  };
}

export const useCategoryStore = defineStore('category', {
  state: (): CategoryState => ({
    globalCategories: [],
    projectCategoriesMap: {},
    isLoading: false,
    error: null
  }),

  actions: {
    async fetchGlobal() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findGlobal();
        if (result.success && result.data) {
          this.globalCategories = result.data.map(docToCategory);
        } else {
          this.error = result.error || 'Error al obtener categorías globales';
        }
      } catch (error) {
        console.error('Error fetching global categories:', error);
        this.error = 'Error al obtener categorías globales';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchForProject(projectId: string) {
      this.error = null;

      try {
        const result = await getSchema().findByProject(projectId);
        if (result.success && result.data) {
          this.projectCategoriesMap[projectId] = result.data.map(docToCategory);
        } else {
          this.error = result.error || 'Error al obtener categorías del proyecto';
        }
      } catch (error) {
        console.error('Error fetching project categories:', error);
        this.error = 'Error al obtener categorías del proyecto';
      }
    },

    async fetchForProviderPublic(providerId: string, projectId: string) {
      this.error = null;

      try {
        // Fetch both global and project-specific in parallel
        const [globalResult, projectResult] = await Promise.all([
          getSchema().findByProviderPublic(providerId),
          getSchema().findByProviderPublic(providerId, projectId)
        ]);

        if (globalResult.success && globalResult.data) {
          this.globalCategories = globalResult.data.map(docToCategory);
        }
        if (projectResult.success && projectResult.data) {
          this.projectCategoriesMap[projectId] = projectResult.data.map(docToCategory);
        }
      } catch (error) {
        console.error('Error fetching provider categories:', error);
      }
    },

    getResolved(projectId?: string): ExpenseCategory[] {
      const projectCats = projectId ? this.projectCategoriesMap[projectId] || [] : [];
      return resolveCategories(this.globalCategories, projectCats);
    },

    async saveGlobal(categories: ExpenseCategory[]) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().saveCategories(categories);
        if (result.success) {
          this.globalCategories = categories;
          return { success: true };
        } else {
          this.error = result.error || 'Error al guardar categorías';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error saving global categories:', error);
        this.error = 'Error al guardar categorías';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async saveForProject(projectId: string, categories: ExpenseCategory[]) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().saveCategories(categories, projectId);
        if (result.success) {
          this.projectCategoriesMap[projectId] = categories;
          return { success: true };
        } else {
          this.error = result.error || 'Error al guardar categorías del proyecto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error saving project categories:', error);
        this.error = 'Error al guardar categorías del proyecto';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async removeProjectOverride(projectId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().deleteByProject(projectId);
        if (result.success) {
          delete this.projectCategoriesMap[projectId];
          return { success: true };
        } else {
          this.error = result.error || 'Error al eliminar categorías del proyecto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error removing project categories:', error);
        this.error = 'Error al eliminar categorías del proyecto';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    clearState() {
      this.globalCategories = [];
      this.projectCategoriesMap = {};
      this.isLoading = false;
      this.error = null;
    }
  }
});
