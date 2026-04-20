import { defineStore } from 'pinia';
import { ProjectItemSchema } from '~/utils/odm/schemas/projectItemSchema';
import type { ProjectItem } from '~/interfaces';

interface ProjectItemState {
  items: ProjectItem[];
  isLoading: boolean;
  error: string | null;
}

let projectItemSchema: ProjectItemSchema | null = null;

const getSchema = () => {
  if (!projectItemSchema) {
    projectItemSchema = new ProjectItemSchema();
  }
  return projectItemSchema;
};

const toMs = (d: any): number => {
  if (!d) return 0;
  if (d.toDate) return d.toDate().getTime();
  return new Date(d).getTime();
};

const sortItems = (a: ProjectItem, b: ProjectItem) => {
  const aDate = toMs(a.plannedStartDate);
  const bDate = toMs(b.plannedStartDate);
  if (aDate !== bDate) return aDate - bDate;
  return toMs(a.createdAt) - toMs(b.createdAt);
};

// Per-item midpoint total: labor + average of materials min/max.
export const itemMidpoint = (i: ProjectItem): number => {
  const labor = i.laborBudget || 0;
  const matsMid = ((i.materialsBudgetMin || 0) + (i.materialsBudgetMax || 0)) / 2;
  return labor + matsMid;
};

export const itemRangeMin = (i: ProjectItem): number =>
  (i.laborBudget || 0) + (i.materialsBudgetMin || 0);

export const itemRangeMax = (i: ProjectItem): number =>
  (i.laborBudget || 0) + (i.materialsBudgetMax || 0);

export const useProjectItemStore = defineStore('projectItem', {
  state: (): ProjectItemState => ({
    items: [],
    isLoading: false,
    error: null
  }),

  getters: {
    totalBudget: (state): number =>
      state.items.reduce((sum, i) => sum + itemMidpoint(i), 0),

    totalBudgetRange: (state): { min: number; max: number } => ({
      min: state.items.reduce((sum, i) => sum + itemRangeMin(i), 0),
      max: state.items.reduce((sum, i) => sum + itemRangeMax(i), 0)
    }),

    hasMaterialsRange: (state): boolean =>
      state.items.some(i => (i.materialsBudgetMin || 0) !== (i.materialsBudgetMax || 0)),

    completedItems: (state): ProjectItem[] =>
      state.items.filter(i => i.actualEndDate),

    inProgressItems: (state): ProjectItem[] =>
      state.items.filter(i => i.actualStartDate && !i.actualEndDate),

    pendingItems: (state): ProjectItem[] =>
      state.items.filter(i => !i.actualStartDate),

    completedBudget(): number {
      return this.completedItems.reduce((sum: number, i: ProjectItem) => sum + itemMidpoint(i), 0);
    },

    progressPercentage(): number {
      const total = this.totalBudget;
      if (total <= 0) return 0;
      return (this.completedBudget / total) * 100;
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByProjectId(projectId);

        if (result.success && result.data) {
          this.items = result.data as ProjectItem[];
        } else {
          this.error = result.error || 'Error al obtener los items';
        }
      } catch (error) {
        console.error('Error fetching project items:', error);
        this.error = 'Error al obtener los items';
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
          this.items = result.data as ProjectItem[];
        } else {
          this.error = result.error || 'Error al obtener los items';
        }
      } catch (error) {
        console.error('Error fetching project items:', error);
        this.error = 'Error al obtener los items';
      } finally {
        this.isLoading = false;
      }
    },

    async createItem(data: Partial<ProjectItem>) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().create(data);

        if (result.success && result.data) {
          this.items.push(result.data as ProjectItem);
          this.items.sort(sortItems);
          return { success: true, data: result.data };
        } else {
          this.error = result.error || 'Error al crear el item';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error creating project item:', error);
        this.error = 'Error al crear el item';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updateItem(id: string, data: Partial<ProjectItem>) {
      this.error = null;

      try {
        const result = await getSchema().updateItem(id, data);

        if (result.success) {
          const index = this.items.findIndex(i => i.id === id);
          if (index !== -1) {
            this.items[index] = { ...this.items[index], ...data };
            this.items.sort(sortItems);
          }
          return { success: true };
        } else {
          this.error = result.error || 'Error al actualizar el item';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error updating project item:', error);
        this.error = 'Error al actualizar el item';
        return { success: false, error: this.error };
      }
    },

    async deleteItem(id: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().delete(id);

        if (result.success) {
          this.items = this.items.filter(i => i.id !== id);
          return true;
        } else {
          this.error = result.error || 'Error al eliminar el item';
          return false;
        }
      } catch (error) {
        console.error('Error deleting project item:', error);
        this.error = 'Error al eliminar el item';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    clearState() {
      this.items = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
