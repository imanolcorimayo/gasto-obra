<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-2.5 mb-3">
      <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted whitespace-nowrap">
        Materiales{{ materials.length > 0 ? ` · ${materials.length}` : '' }}
      </span>
      <span class="flex-1 h-px bg-go-border-subtle"></span>
      <span v-if="materials.length > 0" class="text-[10.5px] tabular-nums text-go-text-muted">{{ totalLabel }}</span>
    </div>

    <!-- Material rows -->
    <div v-if="materials.length > 0" class="divide-y divide-go-border-subtle border-b border-go-border-subtle">
      <button
        v-for="material in materials"
        :key="material.id"
        type="button"
        class="w-full flex items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-go-surface-hover -mx-1 px-1 rounded-go-sm"
        @click="$emit('openMaterial', material.id)"
      >
        <span class="flex-1 min-w-0">
          <span class="block text-[13px] font-medium text-go-text truncate">{{ material.name }}</span>
          <span class="block text-[10.5px] text-go-text-muted mt-0.5">
            {{ proposalCountLabel(material.id) }}
          </span>
        </span>
        <span
          class="text-[12.5px] font-display tabular-nums whitespace-nowrap"
          :class="proposalCountFor(material.id) === 0 ? 'text-go-text-muted italic' : 'text-go-text font-semibold'"
        >
          {{ priceLabel(material.id) }}
        </span>
        <MdiChevronRight class="text-[16px] text-go-text-muted shrink-0" />
      </button>
    </div>

    <!-- Add material button -->
    <button
      v-if="!readonly"
      type="button"
      @click="openAddMaterial"
      class="text-[11.5px] font-semibold text-go-primary hover:text-go-primary-hover transition-colors inline-flex items-center gap-1 mt-3"
    >
      <MdiPlus class="text-[14px]" />
      {{ isClient ? 'Sugerir material' : 'Agregar material' }}
    </button>

    <!-- Material modal (create only — edit lives in drawer) -->
    <ProjectMaterialModal
      :show="showMaterialModal"
      :material="null"
      :is-submitting="isSubmittingMaterial"
      @close="showMaterialModal = false"
      @submit="handleMaterialSubmit"
    />
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiChevronRight from '~icons/mdi/chevron-right';
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { formatPrice } from '~/utils';

const props = defineProps({
  item: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

const emit = defineEmits(['openMaterial']);

const materialStore = useProjectMaterialStore();

const showMaterialModal = ref(false);
const isSubmittingMaterial = ref(false);

const materials = computed(() => materialStore.materialsForItem(props.item.id));

const totalLabel = computed(() => {
  const budget = materialStore.itemMaterialsBudget(props.item.id);
  if (!budget.hasMaterials) return '';
  if (budget.min === budget.max) return formatPrice(budget.min);
  return `${formatPrice(budget.min)} – ${formatPrice(budget.max)}`;
});

function proposalCountFor(materialId) {
  return materialStore.proposalsForMaterial(materialId).length;
}

function proposalCountLabel(materialId) {
  const n = proposalCountFor(materialId);
  if (n === 0) return 'sin propuestas';
  if (n === 1) return '1 propuesta';
  return `${n} propuestas`;
}

function priceLabel(materialId) {
  const { min, max, count } = materialStore.materialMinMax(materialId);
  if (count === 0) return '—';
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

function openAddMaterial() {
  showMaterialModal.value = true;
}

async function handleMaterialSubmit(data) {
  isSubmittingMaterial.value = true;
  try {
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
      showMaterialModal.value = false;
      if (result.data?.id) emit('openMaterial', result.data.id);
    } else {
      useToast('error', result.error || 'Error al agregar');
    }
  } finally {
    isSubmittingMaterial.value = false;
  }
}
</script>
