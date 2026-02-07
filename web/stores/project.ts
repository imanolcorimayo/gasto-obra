import { defineStore } from 'pinia';
import { ProjectSchema } from '~/utils/odm/schemas/projectSchema';
import type { Project } from '~/interfaces';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

let projectSchema: ProjectSchema | null = null;

const getSchema = () => {
  if (!projectSchema) {
    projectSchema = new ProjectSchema();
  }
  return projectSchema;
};

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null
  }),

  getters: {
    activeProjects: (state) => state.projects.filter(p => p.status === 'active'),
    completedProjects: (state) => state.projects.filter(p => p.status === 'completed'),
    pausedProjects: (state) => state.projects.filter(p => p.status === 'paused'),
  },

  actions: {
    async fetchProjects() {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByProviderId();

        if (result.success && result.data) {
          this.projects = result.data as Project[];
        } else {
          this.error = result.error || 'Error al obtener los proyectos';
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        this.error = 'Error al obtener los proyectos';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchProject(id: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findById(id);

        if (result.success && result.data) {
          this.currentProject = result.data as Project;
          return result.data;
        } else {
          this.error = result.error || 'Proyecto no encontrado';
          return null;
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        this.error = 'Error al obtener el proyecto';
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async createProject(data: Partial<Project>) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().createProject(data);

        if (result.success && result.data) {
          this.projects.unshift(result.data as Project);
          return { success: true, data: result.data };
        } else {
          this.error = result.error || 'Error al crear el proyecto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error creating project:', error);
        this.error = 'Error al crear el proyecto';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updateProject(id: string, data: Partial<Project>) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().update(id, data);

        if (result.success) {
          const index = this.projects.findIndex(p => p.id === id);
          if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...data };
          }
          if (this.currentProject?.id === id) {
            this.currentProject = { ...this.currentProject, ...data };
          }
          return { success: true };
        } else {
          this.error = result.error || 'Error al actualizar el proyecto';
          return { success: false, error: this.error };
        }
      } catch (error) {
        console.error('Error updating project:', error);
        this.error = 'Error al actualizar el proyecto';
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async deleteProject(id: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().delete(id);

        if (result.success) {
          this.projects = this.projects.filter(p => p.id !== id);
          if (this.currentProject?.id === id) {
            this.currentProject = null;
          }
          return true;
        } else {
          this.error = result.error || 'Error al eliminar el proyecto';
          return false;
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        this.error = 'Error al eliminar el proyecto';
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchProjectByShareToken(token: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await getSchema().findByShareToken(token);

        if (result.success && result.data && result.data.length > 0) {
          this.currentProject = result.data[0] as Project;
          return result.data[0];
        } else {
          this.error = 'Proyecto no encontrado';
          return null;
        }
      } catch (error) {
        console.error('Error fetching project by token:', error);
        this.error = 'Error al obtener el proyecto';
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    clearState() {
      this.projects = [];
      this.currentProject = null;
      this.isLoading = false;
      this.error = null;
    }
  }
});
