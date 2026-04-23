<template>
  <div v-if="material" class="px-5 py-5 space-y-5">
    <!-- Material notes -->
    <section>
      <h3 class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5">Notas</h3>
      <p v-if="material.notes" class="text-[13px] text-go-text-secondary leading-snug whitespace-pre-wrap">{{ material.notes }}</p>
      <p v-else class="text-[12.5px] text-go-text-muted italic">Sin notas.</p>
    </section>

    <!-- Price summary -->
    <section class="bg-go-surface border border-go-border-subtle rounded-go-md px-4 py-3">
      <div class="flex items-baseline justify-between">
        <span class="text-[11.5px] text-go-text-secondary">
          {{ proposalCount === 0 ? 'Sin propuestas' : proposalCount === 1 ? '1 propuesta' : `${proposalCount} propuestas` }}
        </span>
        <span
          class="font-display font-semibold text-[15px] tabular-nums"
          :class="proposalCount === 0 ? 'text-go-text-muted italic' : 'text-go-text'"
        >
          {{ priceLabel }}
        </span>
      </div>
    </section>

    <!-- Proposals -->
    <section>
      <div class="flex items-center justify-between mb-2.5">
        <h3 class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted">Propuestas</h3>
        <button
          v-if="!readonly"
          type="button"
          @click="openAddProposal"
          class="text-[11.5px] font-semibold text-go-primary hover:text-go-primary-hover transition-colors inline-flex items-center gap-1"
        >
          <MdiPlus class="text-[14px]" />
          {{ isClient ? 'Sugerir' : 'Agregar' }}
        </button>
      </div>

      <p v-if="sortedProposals.length === 0" class="text-[12px] text-go-text-muted italic">
        Sin propuestas todavía. Agregá precios de distintos comercios.
      </p>

      <div v-else class="space-y-3">
        <div
          v-for="prop in sortedProposals"
          :key="prop.id"
          class="border border-go-border-subtle rounded-go-md p-3 bg-go-surface"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[13px] font-medium text-go-text truncate">{{ prop.vendor || 'Sin comercio' }}</span>
                <span
                  v-if="isBestProposal(prop.id)"
                  class="text-[9px] uppercase font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-full bg-go-success-muted text-go-success"
                  title="Mejor precio"
                >Mejor</span>
                <span
                  v-if="prop.addedBy === 'client'"
                  class="text-[9px] uppercase font-semibold tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-go-info-muted text-go-info"
                >Cliente</span>
              </div>
              <div v-if="prop.notes" class="text-[11.5px] text-go-text-muted mt-1 leading-snug whitespace-pre-wrap">{{ prop.notes }}</div>
            </div>
            <div class="flex items-start gap-1 shrink-0">
              <span class="font-display font-bold text-[14.5px] tabular-nums text-go-primary whitespace-nowrap">{{ formatPrice(prop.amount) }}</span>
            </div>
          </div>

          <!-- Images -->
          <div v-if="(prop.images && prop.images.length > 0) || !readonly" class="mt-2.5">
            <ProjectImageGallery
              :images="prop.images || []"
              :endpoint-base="`/api/proposals/${prop.id}`"
              :readonly="readonly"
              @uploaded="(img) => materialStore.addImageToProposal(prop.id, img)"
              @deleted="(id) => materialStore.removeImageFromProposal(prop.id, id)"
            />
          </div>

          <!-- Actions -->
          <div v-if="!readonly && canModifyProposal(prop)" class="flex items-center gap-1 mt-2.5 pt-2 border-t border-dashed border-go-border-subtle">
            <button
              type="button"
              @click="openEditProposal(prop)"
              class="text-[11.5px] text-go-text-secondary hover:text-go-text inline-flex items-center gap-1 px-1.5 py-1 rounded-go-sm hover:bg-go-surface-hover transition-colors"
            >
              <MdiPencil class="text-[13px]" />
              Editar
            </button>
            <button
              type="button"
              @click="confirmDeleteProposal(prop)"
              :disabled="busy"
              class="text-[11.5px] text-go-text-muted hover:text-go-danger inline-flex items-center gap-1 px-1.5 py-1 rounded-go-sm hover:bg-go-danger/10 transition-colors disabled:opacity-50"
            >
              <MdiDelete class="text-[13px]" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Material actions -->
    <section v-if="!readonly && canModifyMaterial" class="pt-4 border-t border-go-border-subtle flex items-center justify-between">
      <button
        type="button"
        @click="openEditMaterial"
        class="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-go-text-secondary hover:text-go-text px-2.5 py-1.5 rounded-go-md hover:bg-go-surface-hover transition-colors"
      >
        <MdiPencil class="text-[14px]" />
        Editar material
      </button>
      <button
        type="button"
        @click="confirmDeleteMaterial"
        :disabled="busy"
        class="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-go-danger px-2.5 py-1.5 rounded-go-md hover:bg-go-danger/10 transition-colors disabled:opacity-50"
      >
        <MdiDelete class="text-[14px]" />
        Eliminar material
      </button>
    </section>

    <!-- Modals -->
    <ProjectMaterialModal
      :show="showMaterialModal"
      :material="material"
      :is-submitting="isSubmittingMaterial"
      @close="showMaterialModal = false"
      @submit="handleMaterialSubmit"
    />

    <ProjectMaterialProposalModal
      :show="showProposalModal"
      :proposal="editingProposal"
      :material-name="material.name"
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
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { formatPrice } from '~/utils';
import { getCurrentUser } from '~/utils/firebase';

const props = defineProps({
  materialId: { type: String, required: true },
  item: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

const emit = defineEmits(['deleted']);

const materialStore = useProjectMaterialStore();
const config = useRuntimeConfig();

const material = computed(() => materialStore.materials.find(m => m.id === props.materialId) || null);
const proposals = computed(() => materialStore.proposalsForMaterial(props.materialId));
const sortedProposals = computed(() => proposals.value.slice().sort((a, b) => (a.amount || 0) - (b.amount || 0)));
const proposalCount = computed(() => proposals.value.length);

const priceLabel = computed(() => {
  const { min, max, count } = materialStore.materialMinMax(props.materialId);
  if (count === 0) return '—';
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
});

function isBestProposal(proposalId) {
  if (proposals.value.length < 2) return false;
  const cheapest = Math.min(...proposals.value.map(p => p.amount || 0));
  const p = proposals.value.find(p => p.id === proposalId);
  return p && (p.amount || 0) === cheapest;
}

const canModifyMaterial = computed(() => {
  if (!material.value) return false;
  return !props.isClient || material.value.addedBy === 'client';
});

function canModifyProposal(proposal) {
  return !props.isClient || proposal.addedBy === 'client';
}

const busy = ref(false);

const showMaterialModal = ref(false);
const isSubmittingMaterial = ref(false);

const showProposalModal = ref(false);
const editingProposal = ref(null);
const isSubmittingProposal = ref(false);

function openEditMaterial() { showMaterialModal.value = true; }

async function handleMaterialSubmit(data) {
  if (!material.value) return;
  isSubmittingMaterial.value = true;
  try {
    const result = props.isClient
      ? await materialStore.updateMaterialViaAPI(material.value.id, data)
      : await materialStore.updateMaterial(material.value.id, data);
    if (result.success) {
      useToast('success', 'Material actualizado');
      showMaterialModal.value = false;
    } else {
      useToast('error', result.error || 'Error al actualizar');
    }
  } finally {
    isSubmittingMaterial.value = false;
  }
}

async function confirmDeleteMaterial() {
  if (!material.value) return;
  const ps = proposals.value;
  const message = ps.length > 0
    ? `¿Eliminar el material "${material.value.name}" y sus ${ps.length} ${ps.length === 1 ? 'propuesta' : 'propuestas'}? Esta acción no se puede deshacer.`
    : `¿Eliminar el material "${material.value.name}"?`;
  if (!confirm(message)) return;
  busy.value = true;
  try {
    const ok = props.isClient
      ? await materialStore.deleteMaterialViaAPI(material.value.id)
      : await materialStore.deleteMaterial(material.value.id);
    if (ok) {
      useToast('success', 'Material eliminado');
      emit('deleted');
    } else {
      useToast('error', materialStore.error || 'Error al eliminar');
    }
  } finally {
    busy.value = false;
  }
}

function openAddProposal() {
  editingProposal.value = null;
  showProposalModal.value = true;
}

function openEditProposal(proposal) {
  editingProposal.value = proposal;
  showProposalModal.value = true;
}

function closeProposalModal() {
  showProposalModal.value = false;
  editingProposal.value = null;
}

async function handleProposalSubmit(data) {
  if (!material.value) return;
  isSubmittingProposal.value = true;
  const { imageFile, ...proposalData } = data;
  try {
    if (editingProposal.value) {
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
            materialId: material.value.id
          })
        : await materialStore.createProposal({
            ...proposalData,
            materialId: material.value.id,
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
