<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h3 class="font-display font-semibold text-base text-go-text">Editar proyecto</h3>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <ProjectForm
          :initial-data="formData"
          submit-label="Guardar"
          :is-submitting="isSaving"
          :has-items="hasItems"
          @submit="handleSave"
          @cancel="$emit('close')"
        />

        <!-- Project Categories Section -->
        <div class="mt-6 pt-6 border-t border-go-border">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-go-text-muted/60 mb-3">Categorías del proyecto</h4>

          <div class="flex items-center gap-3 p-3 bg-go-surface rounded-go-md border border-go-border mb-4">
            <label class="flex items-center justify-between cursor-pointer flex-1">
              <div>
                <span class="text-sm text-go-text">Usar categorías específicas para este proyecto</span>
                <p class="text-xs text-go-text-muted mt-0.5">Si está desactivado, se usan tus categorías globales</p>
              </div>
              <button
                type="button"
                @click="useProjectCategories = !useProjectCategories"
                class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out"
                :class="useProjectCategories ? 'bg-go-primary' : 'bg-go-surface-alt'"
              >
                <span
                  class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out mt-0.5"
                  :class="useProjectCategories ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'"
                />
              </button>
            </label>
          </div>

          <div v-if="!useProjectCategories" class="text-sm text-go-text-tertiary">
            Se usan tus categorías globales.
            <NuxtLink to="/settings/categories" class="text-go-primary hover:text-go-primary/80">
              Configurar categorías globales
            </NuxtLink>
          </div>

          <div v-else>
            <CategoryManager v-model="projectCategories" />
            <button
              type="button"
              @click="handleSaveCategories"
              :disabled="isSavingCategories || !categoriesValid"
              class="mt-4 btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <span v-if="isSavingCategories" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Guardar categorías
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import { useCategoryStore } from '~/stores/category';
import { useProjectItemStore } from '~/stores/projectItem';

const props = defineProps({
  show: { type: Boolean, default: false },
  project: { type: Object, default: null }
});

const emit = defineEmits(['close', 'save']);
const isSaving = ref(false);

const categoryStore = useCategoryStore();
const itemStore = useProjectItemStore();
const useProjectCategories = ref(false);
const projectCategories = ref([]);
const isSavingCategories = ref(false);

const hasItems = computed(() => itemStore.items.length > 0);

const categoriesValid = computed(() => {
  return projectCategories.value.length > 0 &&
    projectCategories.value.every(c => c.value && c.label && c.color);
});

const formData = computed(() => {
  if (!props.project) return {};

  // Convert Firestore timestamp or Date to YYYY-MM-DD string for date input
  let startDate = '';
  if (props.project.startDate) {
    const date = props.project.startDate.toDate
      ? props.project.startDate.toDate()
      : new Date(props.project.startDate);
    startDate = date.toISOString().split('T')[0];
  }

  let estimatedEndDate = '';
  if (props.project.estimatedEndDate) {
    const date = props.project.estimatedEndDate.toDate
      ? props.project.estimatedEndDate.toDate()
      : new Date(props.project.estimatedEndDate);
    estimatedEndDate = date.toISOString().split('T')[0];
  }

  return {
    name: props.project.name || '',
    tag: props.project.tag || '',
    description: props.project.description || '',
    address: props.project.address || '',
    clientName: props.project.clientName || '',
    clientPhone: props.project.clientPhone || '',
    budget: props.project.budget || '',
    startDate,
    estimatedEndDate
  };
});

// Lock background scroll & load project categories when modal opens
watch(() => props.show, async (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show && props.project) {
    await categoryStore.fetchForProject(props.project.id);
    const projCats = categoryStore.projectCategoriesMap[props.project.id] || [];
    useProjectCategories.value = projCats.length > 0;
    if (projCats.length > 0) {
      projectCategories.value = projCats.map(c => ({ ...c }));
    } else {
      // Pre-fill with global categories as starting point
      projectCategories.value = categoryStore.getResolved().map(c => ({ ...c }));
    }
  }
});

async function handleSave(data) {
  isSaving.value = true;
  try {
    emit('save', data);
  } finally {
    isSaving.value = false;
  }
}

async function handleSaveCategories() {
  if (!props.project) return;

  isSavingCategories.value = true;
  try {
    if (useProjectCategories.value) {
      const result = await categoryStore.saveForProject(props.project.id, projectCategories.value);
      if (result.success) {
        useToast('success', 'Categorías del proyecto guardadas');
      } else {
        useToast('error', result.error || 'Error al guardar categorías');
      }
    } else {
      const result = await categoryStore.removeProjectOverride(props.project.id);
      if (result.success) {
        useToast('success', 'Se usarán las categorías globales');
      } else {
        useToast('error', result.error || 'Error al eliminar categorías');
      }
    }
  } finally {
    isSavingCategories.value = false;
  }
}

// When toggling off, remove project override
watch(useProjectCategories, async (val) => {
  if (!val && props.project) {
    const projCats = categoryStore.projectCategoriesMap[props.project.id] || [];
    if (projCats.length > 0) {
      await categoryStore.removeProjectOverride(props.project.id);
      useToast('success', 'Se usaran las categorias globales');
    }
  }
});
</script>
