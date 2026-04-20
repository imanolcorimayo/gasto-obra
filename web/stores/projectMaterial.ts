import { defineStore } from 'pinia';
import { ProjectMaterialSchema } from '~/utils/odm/schemas/projectMaterialSchema';
import { ProjectMaterialProposalSchema } from '~/utils/odm/schemas/projectMaterialProposalSchema';
import type { ProjectMaterial, ProjectMaterialProposal, ProjectItem } from '~/interfaces';

// Returns the effective budget for an item, picking derived values from the
// materials list when it exists, or falling back to the manual fields.
export function effectiveItemBudget(item: ProjectItem, store: ReturnType<typeof useProjectMaterialStore>) {
  const labor = item.laborBudget || 0;
  const matBudget = store.itemMaterialsBudget(item.id);
  const source: 'list' | 'manual' = matBudget.hasMaterials ? 'list' : 'manual';
  const materialsMin = matBudget.hasMaterials ? matBudget.min : (item.materialsBudgetMin || 0);
  const materialsMax = matBudget.hasMaterials ? matBudget.max : (item.materialsBudgetMax || 0);
  return {
    labor,
    materialsMin,
    materialsMax,
    materialsSource: source,
    totalMin: labor + materialsMin,
    totalMax: labor + materialsMax,
    totalMidpoint: labor + (materialsMin + materialsMax) / 2
  };
}

interface ProjectMaterialState {
  materials: ProjectMaterial[];
  proposals: ProjectMaterialProposal[];
  isLoading: boolean;
  error: string | null;
}

let materialSchema: ProjectMaterialSchema | null = null;
let proposalSchema: ProjectMaterialProposalSchema | null = null;

const getMatSchema = () => {
  if (!materialSchema) materialSchema = new ProjectMaterialSchema();
  return materialSchema;
};

const getPropSchema = () => {
  if (!proposalSchema) proposalSchema = new ProjectMaterialProposalSchema();
  return proposalSchema;
};

export const useProjectMaterialStore = defineStore('projectMaterial', {
  state: (): ProjectMaterialState => ({
    materials: [],
    proposals: [],
    isLoading: false,
    error: null
  }),

  getters: {
    materialsForItem: (state) => (itemId: string): ProjectMaterial[] =>
      state.materials.filter(m => m.itemId === itemId),

    proposalsForMaterial: (state) => (materialId: string): ProjectMaterialProposal[] =>
      state.proposals.filter(p => p.materialId === materialId),

    materialMinMax: (state) => (materialId: string): { min: number; max: number; count: number } => {
      const props = state.proposals.filter(p => p.materialId === materialId);
      if (props.length === 0) return { min: 0, max: 0, count: 0 };
      const amounts = props.map(p => p.amount || 0);
      return {
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        count: props.length
      };
    },

    itemMaterialsBudget: (state) => (itemId: string): { min: number; max: number; hasMaterials: boolean } => {
      const mats = state.materials.filter(m => m.itemId === itemId);
      if (mats.length === 0) return { min: 0, max: 0, hasMaterials: false };
      let min = 0;
      let max = 0;
      for (const m of mats) {
        const props = state.proposals.filter(p => p.materialId === m.id);
        if (props.length === 0) continue;
        const amounts = props.map(p => p.amount || 0);
        min += Math.min(...amounts);
        max += Math.max(...amounts);
      }
      return { min, max, hasMaterials: true };
    }
  },

  actions: {
    async fetchByProjectId(projectId: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const [matResult, propResult] = await Promise.all([
          getMatSchema().findByProjectId(projectId),
          getPropSchema().findByProjectId(projectId)
        ]);
        if (matResult.success && matResult.data) {
          this.materials = matResult.data as ProjectMaterial[];
        } else if (!matResult.success) {
          this.error = matResult.error || 'Error al obtener materiales';
        }
        if (propResult.success && propResult.data) {
          this.proposals = propResult.data as ProjectMaterialProposal[];
        } else if (!propResult.success) {
          this.error = propResult.error || 'Error al obtener propuestas';
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
        this.error = 'Error al obtener materiales';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchByProjectIdPublic(projectId: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const [matResult, propResult] = await Promise.all([
          getMatSchema().findByProjectIdPublic(projectId),
          getPropSchema().findByProjectIdPublic(projectId)
        ]);
        if (matResult.success && matResult.data) {
          this.materials = matResult.data as ProjectMaterial[];
        } else if (!matResult.success) {
          this.error = matResult.error || 'Error al obtener materiales';
        }
        if (propResult.success && propResult.data) {
          this.proposals = propResult.data as ProjectMaterialProposal[];
        } else if (!propResult.success) {
          this.error = propResult.error || 'Error al obtener propuestas';
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
        this.error = 'Error al obtener materiales';
      } finally {
        this.isLoading = false;
      }
    },

    async createMaterial(data: Partial<ProjectMaterial>) {
      this.error = null;
      try {
        const result = await getMatSchema().create({ addedBy: 'provider', ...data });
        if (result.success && result.data) {
          this.materials.push(result.data as ProjectMaterial);
          return { success: true, data: result.data };
        }
        this.error = result.error || 'Error al crear material';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error creating material:', error);
        this.error = 'Error al crear material';
        return { success: false, error: this.error };
      }
    },

    async updateMaterial(id: string, data: Partial<ProjectMaterial>) {
      this.error = null;
      try {
        const result = await getMatSchema().updateMaterial(id, data);
        if (result.success) {
          const index = this.materials.findIndex(m => m.id === id);
          if (index !== -1) {
            this.materials[index] = { ...this.materials[index], ...data };
          }
          return { success: true };
        }
        this.error = result.error || 'Error al actualizar material';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error updating material:', error);
        this.error = 'Error al actualizar material';
        return { success: false, error: this.error };
      }
    },

    async deleteMaterial(id: string) {
      this.error = null;
      try {
        // Cascade delete: remove all proposals for this material first
        const propsToDelete = this.proposals.filter(p => p.materialId === id);
        for (const p of propsToDelete) {
          const r = await getPropSchema().delete(p.id);
          if (r.success) {
            this.proposals = this.proposals.filter(x => x.id !== p.id);
          }
        }
        const result = await getMatSchema().delete(id);
        if (result.success) {
          this.materials = this.materials.filter(m => m.id !== id);
          return true;
        }
        this.error = result.error || 'Error al eliminar material';
        return false;
      } catch (error) {
        console.error('Error deleting material:', error);
        this.error = 'Error al eliminar material';
        return false;
      }
    },

    async createProposal(data: Partial<ProjectMaterialProposal>) {
      this.error = null;
      try {
        const result = await getPropSchema().create({ addedBy: 'provider', ...data });
        if (result.success && result.data) {
          this.proposals.push(result.data as ProjectMaterialProposal);
          return { success: true, data: result.data };
        }
        this.error = result.error || 'Error al crear propuesta';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error creating proposal:', error);
        this.error = 'Error al crear propuesta';
        return { success: false, error: this.error };
      }
    },

    async updateProposal(id: string, data: Partial<ProjectMaterialProposal>) {
      this.error = null;
      try {
        const result = await getPropSchema().updateProposal(id, data);
        if (result.success) {
          const index = this.proposals.findIndex(p => p.id === id);
          if (index !== -1) {
            this.proposals[index] = { ...this.proposals[index], ...data };
          }
          return { success: true };
        }
        this.error = result.error || 'Error al actualizar propuesta';
        return { success: false, error: this.error };
      } catch (error) {
        console.error('Error updating proposal:', error);
        this.error = 'Error al actualizar propuesta';
        return { success: false, error: this.error };
      }
    },

    async deleteProposal(id: string) {
      this.error = null;
      try {
        const result = await getPropSchema().delete(id);
        if (result.success) {
          this.proposals = this.proposals.filter(p => p.id !== id);
          return true;
        }
        this.error = result.error || 'Error al eliminar propuesta';
        return false;
      } catch (error) {
        console.error('Error deleting proposal:', error);
        this.error = 'Error al eliminar propuesta';
        return false;
      }
    },

    // ──────────────────────────────────────────────────────────────
    // API-backed writes — used when the caller is the client, so they
    // go through server endpoints (bypassing Firestore rules).
    // ──────────────────────────────────────────────────────────────
    async createMaterialViaAPI(data: Partial<ProjectMaterial>) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) {
          this.error = 'Sesión expirada.';
          return { success: false, error: this.error };
        }
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/materials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al crear material';
          return { success: false, error: this.error };
        }
        this.materials.push(body.material as ProjectMaterial);
        return { success: true, data: body.material };
      } catch (error) {
        console.error('createMaterialViaAPI error', error);
        this.error = 'Error de conexión';
        return { success: false, error: this.error };
      }
    },

    async updateMaterialViaAPI(id: string, data: Partial<ProjectMaterial>) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Sesión expirada.' };
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/materials/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al actualizar material';
          return { success: false, error: this.error };
        }
        const idx = this.materials.findIndex(m => m.id === id);
        if (idx !== -1) this.materials[idx] = body.material as ProjectMaterial;
        return { success: true };
      } catch (error) {
        console.error('updateMaterialViaAPI error', error);
        this.error = 'Error de conexión';
        return { success: false, error: this.error };
      }
    },

    async deleteMaterialViaAPI(id: string) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) return false;
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/materials/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al eliminar material';
          return false;
        }
        // Remove material + its proposals from local state
        this.materials = this.materials.filter(m => m.id !== id);
        this.proposals = this.proposals.filter(p => p.materialId !== id);
        return true;
      } catch (error) {
        console.error('deleteMaterialViaAPI error', error);
        this.error = 'Error de conexión';
        return false;
      }
    },

    async createProposalViaAPI(data: Partial<ProjectMaterialProposal>) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Sesión expirada.' };
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/proposals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al crear propuesta';
          return { success: false, error: this.error };
        }
        this.proposals.push(body.proposal as ProjectMaterialProposal);
        return { success: true, data: body.proposal };
      } catch (error) {
        console.error('createProposalViaAPI error', error);
        this.error = 'Error de conexión';
        return { success: false, error: this.error };
      }
    },

    async updateProposalViaAPI(id: string, data: Partial<ProjectMaterialProposal>) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Sesión expirada.' };
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/proposals/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al actualizar propuesta';
          return { success: false, error: this.error };
        }
        const idx = this.proposals.findIndex(p => p.id === id);
        if (idx !== -1) this.proposals[idx] = body.proposal as ProjectMaterialProposal;
        return { success: true };
      } catch (error) {
        console.error('updateProposalViaAPI error', error);
        this.error = 'Error de conexión';
        return { success: false, error: this.error };
      }
    },

    async deleteProposalViaAPI(id: string) {
      this.error = null;
      try {
        const { getCurrentUser } = await import('~/utils/firebase');
        const config = useRuntimeConfig();
        const user = getCurrentUser();
        if (!user) return false;
        const token = await user.getIdToken();
        const res = await fetch(`${config.public.apiBase}/api/proposals/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          this.error = body.error || 'Error al eliminar propuesta';
          return false;
        }
        this.proposals = this.proposals.filter(p => p.id !== id);
        return true;
      } catch (error) {
        console.error('deleteProposalViaAPI error', error);
        this.error = 'Error de conexión';
        return false;
      }
    },

    addImageToProposal(proposalId: string, image: any) {
      const idx = this.proposals.findIndex(p => p.id === proposalId);
      if (idx === -1) return;
      const current = Array.isArray(this.proposals[idx].images) ? this.proposals[idx].images! : [];
      this.proposals[idx] = { ...this.proposals[idx], images: [...current, image] };
    },

    removeImageFromProposal(proposalId: string, imageId: string) {
      const idx = this.proposals.findIndex(p => p.id === proposalId);
      if (idx === -1) return;
      const current = Array.isArray(this.proposals[idx].images) ? this.proposals[idx].images! : [];
      this.proposals[idx] = { ...this.proposals[idx], images: current.filter(img => img.id !== imageId) };
    },

    clearState() {
      this.materials = [];
      this.proposals = [];
      this.isLoading = false;
      this.error = null;
    }
  }
});
