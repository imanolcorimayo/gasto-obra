import { defineStore } from 'pinia';
import { ProjectTaskSchema } from '~/utils/odm/schemas/projectTaskSchema';
import type { ProjectTask, TaskStatus } from '~/interfaces';

interface ProjectTaskState {
  tasks: ProjectTask[];
  isLoading: boolean;
  error: string | null;
}

let taskSchema: ProjectTaskSchema | null = null;

const getSchema = () => {
  if (!taskSchema) taskSchema = new ProjectTaskSchema();
  return taskSchema;
};

export const useProjectTaskStore = defineStore('projectTask', {
  state: (): ProjectTaskState => ({
    tasks: [],
    isLoading: false,
    error: null
  }),

  getters: {
    tasksForItem: (state) => (itemId: string): ProjectTask[] =>
      state.tasks
        .filter(t => t.itemId === itemId)
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0)),

    itemTaskCounts: (state) => (itemId: string): { done: number; total: number } => {
      let done = 0;
      let total = 0;
      for (const t of state.tasks) {
        if (t.itemId !== itemId) continue;
        total++;
        if (t.status === 'completada') done++;
      }
      return { done, total };
    },

    // Progress in [0,1]: tasks-based if any exist, else null (caller decides fallback).
    itemTaskProgress: (state) => (itemId: string): number | null => {
      let done = 0;
      let total = 0;
      for (const t of state.tasks) {
        if (t.itemId !== itemId) continue;
        total++;
        if (t.status === 'completada') done++;
      }
      if (total === 0) return null;
      return done / total;
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const result = await getSchema().findByProjectId(projectId);
        if (result.success && result.data) {
          this.tasks = result.data as ProjectTask[];
        } else {
          this.error = result.error || 'Error al obtener tareas';
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        this.error = 'Error al obtener tareas';
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
          this.tasks = result.data as ProjectTask[];
        } else {
          this.error = result.error || 'Error al obtener tareas';
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        this.error = 'Error al obtener tareas';
      } finally {
        this.isLoading = false;
      }
    },

    async createTask(data: Partial<ProjectTask>) {
      this.error = null;
      try {
        const order = data.order ?? this.nextOrderForItem(data.itemId as string);
        const payload = { status: 'pendiente' as TaskStatus, order, ...data };
        const result = await getSchema().create(payload);
        if (result.success && result.data) {
          this.tasks.push(result.data as ProjectTask);
          return { success: true, data: result.data };
        }
        this.error = result.error || 'Error al crear tarea';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error creating task:', error);
        this.error = 'Error al crear tarea';
        return { success: false, error: this.error };
      }
    },

    async updateTask(id: string, data: Partial<ProjectTask>) {
      this.error = null;
      try {
        const result = await getSchema().updateTask(id, data);
        if (result.success) {
          const idx = this.tasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            this.tasks[idx] = { ...this.tasks[idx], ...data } as ProjectTask;
          }
          return { success: true };
        }
        this.error = result.error || 'Error al actualizar tarea';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error updating task:', error);
        this.error = 'Error al actualizar tarea';
        return { success: false, error: this.error };
      }
    },

    async toggleTaskDone(id: string) {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return { success: false, error: 'Tarea no encontrada' };
      const nextStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada';
      const patch: Partial<ProjectTask> = {
        status: nextStatus,
        completedAt: nextStatus === 'completada' ? new Date() : null
      };
      return this.updateTask(id, patch);
    },

    async deleteTask(id: string) {
      this.error = null;
      try {
        const result = await getSchema().delete(id);
        if (result.success) {
          this.tasks = this.tasks.filter(t => t.id !== id);
          return true;
        }
        this.error = result.error || 'Error al eliminar tarea';
        return false;
      } catch (error) {
        console.error('Error deleting task:', error);
        this.error = 'Error al eliminar tarea';
        return false;
      }
    },

    nextOrderForItem(itemId: string): number {
      let max = -1;
      for (const t of this.tasks) {
        if (t.itemId !== itemId) continue;
        if ((t.order || 0) > max) max = t.order || 0;
      }
      return max + 1;
    },

    clearState() {
      this.tasks = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
