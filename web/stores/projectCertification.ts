import { defineStore } from 'pinia';
import { ProjectCertificationSchema } from '~/utils/odm/schemas/projectCertificationSchema';
import type { ProjectCertification, CertificationLine } from '~/interfaces';

interface ProjectCertificationState {
  certifications: ProjectCertification[];
  isLoading: boolean;
  error: string | null;
}

let schema: ProjectCertificationSchema | null = null;
const getSchema = () => {
  if (!schema) schema = new ProjectCertificationSchema();
  return schema;
};

export const useProjectCertificationStore = defineStore('projectCertification', {
  state: (): ProjectCertificationState => ({
    certifications: [],
    isLoading: false,
    error: null
  }),

  getters: {
    forProject: (state) => (projectId: string): ProjectCertification[] =>
      state.certifications
        .filter(c => c.projectId === projectId)
        .slice()
        .sort((a, b) => (b.number || 0) - (a.number || 0)),

    byId: (state) => (id: string): ProjectCertification | null =>
      state.certifications.find(c => c.id === id) || null,

    latestIssuedForProject: (state) => (projectId: string): ProjectCertification | null => {
      const issued = state.certifications
        .filter(c => c.projectId === projectId && c.status === 'issued')
        .sort((a, b) => (b.number || 0) - (a.number || 0));
      return issued[0] || null;
    },

    // Latest cumulative % recorded for an item across all issued certs (0 if none)
    lastIssuedPercentForItem: (state) => (projectId: string, itemId: string): number => {
      const issued = state.certifications
        .filter(c => c.projectId === projectId && c.status === 'issued')
        .sort((a, b) => (b.number || 0) - (a.number || 0));
      for (const c of issued) {
        const line = (c.lines || []).find(l => l.kind === 'item' && l.refId === itemId);
        if (line && typeof line.percentCumulative === 'number') return line.percentCumulative;
      }
      return 0;
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const result = await getSchema().findByProjectId(projectId);
        if (result.success && result.data) {
          this.certifications = result.data as ProjectCertification[];
        } else {
          this.error = result.error || 'Error al obtener certificaciones';
        }
      } catch (error) {
        console.error('Error fetching certifications:', error);
        this.error = 'Error al obtener certificaciones';
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
          this.certifications = result.data as ProjectCertification[];
        } else {
          this.error = result.error || 'Error al obtener certificaciones';
        }
      } catch (error) {
        console.error('Error fetching certifications:', error);
        this.error = 'Error al obtener certificaciones';
      } finally {
        this.isLoading = false;
      }
    },

    async createCertification(data: Partial<ProjectCertification>) {
      this.error = null;
      try {
        const projectId = data.projectId as string;
        const nextNumber = this.nextNumberForProject(projectId);
        const payload: Partial<ProjectCertification> = {
          status: 'draft',
          number: nextNumber,
          lines: [],
          totalAmount: 0,
          issueDate: new Date(),
          ...data
        };
        const result = await getSchema().create(payload);
        if (result.success && result.data) {
          this.certifications.push(result.data as ProjectCertification);
          return { success: true, data: result.data };
        }
        this.error = result.error || 'Error al crear certificación';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error creating certification:', error);
        this.error = 'Error al crear certificación';
        return { success: false, error: this.error };
      }
    },

    async updateCertification(id: string, data: Partial<ProjectCertification>) {
      this.error = null;
      try {
        const result = await getSchema().updateCertification(id, data);
        if (result.success) {
          const idx = this.certifications.findIndex(c => c.id === id);
          if (idx !== -1) {
            this.certifications[idx] = { ...this.certifications[idx], ...data } as ProjectCertification;
          }
          return { success: true };
        }
        this.error = result.error || 'Error al actualizar certificación';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error updating certification:', error);
        this.error = 'Error al actualizar certificación';
        return { success: false, error: this.error };
      }
    },

    async updateLines(id: string, lines: CertificationLine[]) {
      const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
      return this.updateCertification(id, { lines, totalAmount });
    },

    async issueCertification(id: string) {
      return this.updateCertification(id, { status: 'issued', issueDate: new Date() });
    },

    async deleteCertification(id: string) {
      this.error = null;
      try {
        const result = await getSchema().delete(id);
        if (result.success) {
          this.certifications = this.certifications.filter(c => c.id !== id);
          return true;
        }
        this.error = result.error || 'Error al eliminar certificación';
        return false;
      } catch (error) {
        console.error('Error deleting certification:', error);
        this.error = 'Error al eliminar certificación';
        return false;
      }
    },

    nextNumberForProject(projectId: string): number {
      let max = 0;
      for (const c of this.certifications) {
        if (c.projectId !== projectId) continue;
        if ((c.number || 0) > max) max = c.number || 0;
      }
      return max + 1;
    },

    clearState() {
      this.certifications = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
