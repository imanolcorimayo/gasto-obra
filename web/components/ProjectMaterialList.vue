<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between text-xs mb-2">
      <span class="font-semibold uppercase tracking-wider text-go-text-muted">
        Materiales{{ materials.length > 0 ? ` (${materials.length})` : '' }}
      </span>
      <span v-if="materials.length > 0" class="tabular-nums text-go-text-muted">
        {{ totalLabel }}
      </span>
    </div>

    <!-- Material rows -->
    <div v-if="materials.length > 0" class="space-y-1">
      <div
        v-for="material in materials"
        :key="material.id"
        class="border border-go-border-subtle rounded-go-sm bg-go-surface"
      >
        <!-- Row header (always visible) -->
        <button
          type="button"
          class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-go-surface-alt/40 transition-colors"
          @click="toggleExpanded(material.id)"
        >
          <MdiChevronDown
            class="text-sm text-go-text-muted transition-transform shrink-0"
            :class="{ '-rotate-90': !expanded.has(material.id) }"
          />
          <span class="flex-1 text-xs text-go-text truncate">{{ material.name }}</span>
          <span class="text-[10px] text-go-text-muted whitespace-nowrap">
            {{ proposalCountLabel(material.id) }}
          </span>
          <span class="text-xs tabular-nums whitespace-nowrap" :class="proposalCountFor(material.id) === 0 ? 'text-go-text-muted italic' : 'text-go-text font-medium'">
            {{ priceLabel(material.id) }}
          </span>
        </button>

        <!-- Expanded content -->
        <div v-if="expanded.has(material.id)" class="px-2.5 pb-2 pt-1 border-t border-go-border-subtle">
          <!-- Notes -->
          <p v-if="material.notes" class="text-[11px] text-go-text-muted italic mb-2">{{ material.notes }}</p>

          <!-- Proposals list -->
          <div v-if="proposalsFor(material.id).length > 0" class="space-y-1">
            <div
              v-for="prop in proposalsFor(material.id)"
              :key="prop.id"
              class="px-2 py-1.5 rounded-go-sm bg-go-bg/40 text-xs"
            >
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-go-text truncate">{{ prop.vendor || 'Sin comercio' }}</span>
                    <span
                      v-if="prop.addedBy === 'client'"
                      class="text-[9px] uppercase font-semibold px-1 py-0.5 rounded-go-sm bg-go-info/15 text-go-info"
                    >Cliente</span>
                  </div>
                  <div v-if="prop.notes" class="text-[10px] text-go-text-muted truncate" :title="prop.notes">{{ prop.notes }}</div>
                </div>
                <span class="font-display font-semibold tabular-nums text-go-primary whitespace-nowrap">{{ formatPrice(prop.amount) }}</span>
                <div v-if="!readonly && canModifyProposal(prop)" class="flex items-center gap-0.5">
                  <button
                    type="button"
                    @click="openEditProposal(material, prop)"
                    class="text-go-text-muted hover:text-go-text transition-colors p-1 rounded-go-sm"
                    title="Editar"
                  >
                    <MdiPencil class="text-xs" />
                  </button>
                  <button
                    type="button"
                    @click="confirmDeleteProposal(prop)"
                    :disabled="busy"
                    class="text-go-text-muted hover:text-go-danger transition-colors p-1 rounded-go-sm disabled:opacity-50"
                    title="Eliminar"
                  >
                    <MdiDelete class="text-xs" />
                  </button>
                </div>
              </div>
              <div v-if="(prop.images && prop.images.length > 0) || !readonly" class="mt-1.5">
                <ProjectImageGallery
                  :images="prop.images || []"
                  :endpoint-base="`/api/proposals/${prop.id}`"
                  :readonly="readonly"
                  @uploaded="(img) => materialStore.addImageToProposal(prop.id, img)"
                  @deleted="(id) => materialStore.removeImageFromProposal(prop.id, id)"
                />
              </div>
            </div>
          </div>
          <p v-else class="text-[11px] text-go-text-muted italic">Sin propuestas todavía. Agregá precios de distintos comercios.</p>

          <!-- Actions -->
          <div v-if="!readonly" class="flex items-center gap-2 mt-2 pt-2 border-t border-go-border-subtle">
            <button
              type="button"
              @click="openAddProposal(material)"
              class="text-[11px] font-medium text-go-primary hover:text-go-primary/80 transition-colors inline-flex items-center gap-1"
            >
              <MdiPlus class="text-sm" />
              {{ isClient ? 'Sugerir propuesta' : 'Agregar propuesta' }}
            </button>
            <div v-if="canModifyMaterial(material)" class="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                @click="openEditMaterial(material)"
                class="text-go-text-muted hover:text-go-text transition-colors p-1 rounded-go-sm"
                title="Editar material"
              >
                <MdiPencil class="text-xs" />
              </button>
              <button
                type="button"
                @click="confirmDeleteMaterial(material)"
                :disabled="busy"
                class="text-go-text-muted hover:text-go-danger transition-colors p-1 rounded-go-sm disabled:opacity-50"
                title="Eliminar material"
              >
                <MdiDelete class="text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add material button -->
    <button
      v-if="!readonly"
      type="button"
      @click="openAddMaterial"
      class="text-[11px] font-medium text-go-primary hover:text-go-primary/80 transition-colors inline-flex items-center gap-1 mt-2"
    >
      <MdiPlus class="text-sm" />
      {{ isClient ? 'Sugerir material' : 'Agregar material' }}
    </button>

    <!-- Material modal -->
    <ProjectMaterialModal
      :show="showMaterialModal"
      :material="editingMaterial"
      :is-submitting="isSubmittingMaterial"
      @close="closeMaterialModal"
      @submit="handleMaterialSubmit"
    />

    <!-- Proposal modal -->
    <ProjectMaterialProposalModal
      :show="showProposalModal"
      :proposal="editingProposal"
      :material-name="proposalMaterialName"
      :is-submitting="isSubmittingProposal"
      @close="closeProposalModal"
      @submit="handleProposalSubmit"
    />
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiChevronDown from '~icons/mdi/chevron-down';
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { formatPrice } from '~/utils';
import { getCurrentUser } from '~/utils/firebase';

const props = defineProps({
  item: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

function canModifyMaterial(material) {
  return !props.isClient || material.addedBy === 'client';
}
function canModifyProposal(proposal) {
  return !props.isClient || proposal.addedBy === 'client';
}

const materialStore = useProjectMaterialStore();
const config = useRuntimeConfig();

const expanded = ref(new Set());
const busy = ref(false);

const showMaterialModal = ref(false);
const editingMaterial = ref(null);
const isSubmittingMaterial = ref(false);

const showProposalModal = ref(false);
const editingProposal = ref(null);
const proposalContextMaterial = ref(null);
const isSubmittingProposal = ref(false);

const materials = computed(() => materialStore.materialsForItem(props.item.id));

const proposalMaterialName = computed(() => proposalContextMaterial.value?.name || '');

const totalLabel = computed(() => {
  const budget = materialStore.itemMaterialsBudget(props.item.id);
  if (!budget.hasMaterials) return '';
  if (budget.min === budget.max) return formatPrice(budget.min);
  return `${formatPrice(budget.min)} – ${formatPrice(budget.max)}`;
});

function proposalsFor(materialId) {
  return materialStore.proposalsForMaterial(materialId);
}

function proposalCountFor(materialId) {
  return proposalsFor(materialId).length;
}

function proposalCountLabel(materialId) {
  const n = proposalCountFor(materialId);
  if (n === 0) return 'sin propuestas';
  if (n === 1) return '1 prop.';
  return `${n} prop.`;
}

function priceLabel(materialId) {
  const { min, max, count } = materialStore.materialMinMax(materialId);
  if (count === 0) return '—';
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

function toggleExpanded(id) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

// Material CRUD
function openAddMaterial() {
  editingMaterial.value = null;
  showMaterialModal.value = true;
}

function openEditMaterial(material) {
  editingMaterial.value = material;
  showMaterialModal.value = true;
}

function closeMaterialModal() {
  showMaterialModal.value = false;
  editingMaterial.value = null;
}

async function handleMaterialSubmit(data) {
  isSubmittingMaterial.value = true;
  try {
    if (editingMaterial.value) {
      const result = props.isClient
        ? await materialStore.updateMaterialViaAPI(editingMaterial.value.id, data)
        : await materialStore.updateMaterial(editingMaterial.value.id, data);
      if (result.success) {
        useToast('success', 'Material actualizado');
        closeMaterialModal();
      } else {
        useToast('error', result.error || 'Error al actualizar');
      }
    } else {
      const result = props.isClient
        ? await materialStore.createMaterialViaAPI({ ...data, itemId: props.item.id })
        : await materialStore.createMaterial({
            ...data,
            itemId: props.item.id,
            projectId: props.item.projectId,
            providerId: props.item.providerId
          });
      if (result.success) {
        useToast('success', props.isClient ? 'Material sugerido' : 'Material agregado');
        // Auto-expand the new material so user can immediately add propuestas
        if (result.data?.id) {
          const next = new Set(expanded.value);
          next.add(result.data.id);
          expanded.value = next;
        }
        closeMaterialModal();
      } else {
        useToast('error', result.error || 'Error al agregar');
      }
    }
  } finally {
    isSubmittingMaterial.value = false;
  }
}

async function confirmDeleteMaterial(material) {
  const props_ = proposalsFor(material.id);
  const message = props_.length > 0
    ? `¿Eliminar el material "${material.name}" y sus ${props_.length} ${props_.length === 1 ? 'propuesta' : 'propuestas'}? Esta acción no se puede deshacer.`
    : `¿Eliminar el material "${material.name}"?`;
  if (!confirm(message)) return;
  busy.value = true;
  try {
    const ok = props.isClient
      ? await materialStore.deleteMaterialViaAPI(material.id)
      : await materialStore.deleteMaterial(material.id);
    if (ok) useToast('success', 'Material eliminado');
    else useToast('error', materialStore.error || 'Error al eliminar');
  } finally {
    busy.value = false;
  }
}

// Proposal CRUD
function openAddProposal(material) {
  proposalContextMaterial.value = material;
  editingProposal.value = null;
  showProposalModal.value = true;
}

function openEditProposal(material, proposal) {
  proposalContextMaterial.value = material;
  editingProposal.value = proposal;
  showProposalModal.value = true;
}

function closeProposalModal() {
  showProposalModal.value = false;
  editingProposal.value = null;
  proposalContextMaterial.value = null;
}

async function handleProposalSubmit(data) {
  isSubmittingProposal.value = true;
  const { imageFile, ...proposalData } = data;
  try {
    if (editingProposal.value) {
      // Edit mode: no image picker shown; imageFile will be null anyway
      const result = props.isClient
        ? await materialStore.updateProposalViaAPI(editingProposal.value.id, proposalData)
        : await materialStore.updateProposal(editingProposal.value.id, proposalData);
      if (result.success) {
        useToast('success', 'Propuesta actualizada');
        closeProposalModal();
      } else {
        useToast('error', result.error || 'Error al actualizar');
      }
    } else {
      const result = props.isClient
        ? await materialStore.createProposalViaAPI({
            ...proposalData,
            materialId: proposalContextMaterial.value.id
          })
        : await materialStore.createProposal({
            ...proposalData,
            materialId: proposalContextMaterial.value.id,
            itemId: props.item.id,
            projectId: props.item.projectId,
            providerId: props.item.providerId
          });
      if (result.success) {
        useToast('success', props.isClient ? 'Propuesta sugerida' : 'Propuesta agregada');
        if (imageFile && result.data?.id) {
          await uploadProposalImage(result.data.id, imageFile);
        }
        closeProposalModal();
      } else {
        useToast('error', result.error || 'Error al agregar');
      }
    }
  } finally {
    isSubmittingProposal.value = false;
  }
}

async function uploadProposalImage(proposalId, file) {
  try {
    const user = getCurrentUser();
    if (!user) return;
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${config.public.apiBase}/api/proposals/${proposalId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      useToast('error', data.error || 'La propuesta se creó pero la imagen no se pudo subir.');
      return;
    }
    materialStore.addImageToProposal(proposalId, data.image);
  } catch (error) {
    console.error('Image upload error after proposal creation:', error);
    useToast('error', 'La propuesta se creó pero la imagen no se pudo subir.');
  }
}

async function confirmDeleteProposal(proposal) {
  if (!confirm('¿Eliminar esta propuesta?')) return;
  busy.value = true;
  try {
    const ok = props.isClient
      ? await materialStore.deleteProposalViaAPI(proposal.id)
      : await materialStore.deleteProposal(proposal.id);
    if (ok) useToast('success', 'Propuesta eliminada');
    else useToast('error', materialStore.error || 'Error al eliminar');
  } finally {
    busy.value = false;
  }
}
</script>
