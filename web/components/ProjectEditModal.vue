<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-go-surface rounded-go-xl border border-go-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="text-base font-semibold mb-4">Editar proyecto</h3>

      <ProjectForm
        :initial-data="formData"
        submit-label="Guardar"
        :is-submitting="isSaving"
        @submit="handleSave"
        @cancel="$emit('close')"
      />

      <!-- Project Categories Section -->
      <div class="mt-6 pt-6 border-t border-go-border">
        <h4 class="font-medium mb-3">Categorias del proyecto</h4>

        <label class="flex items-center justify-between cursor-pointer mb-4">
          <div>
            <span class="text-sm font-medium text-go-text">Usar categorias especificas para este proyecto</span>
            <p class="text-xs text-go-text-muted mt-0.5">Si esta desactivado, se usan tus categorias globales</p>
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

        <div v-if="!useProjectCategories" class="text-sm text-go-text-tertiary">
          Se usan tus categorias globales.
          <NuxtLink to="/settings/categories" class="text-go-primary hover:text-go-primary/80">
            Configurar categorias globales
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
            Guardar categorias
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCategoryStore } from '~/stores/category';

const props = defineProps({
  show: { type: Boolean, default: false },
  project: { type: Object, default: null }
});

const emit = defineEmits(['close', 'save']);
const isSaving = ref(false);

const categoryStore = useCategoryStore();
const useProjectCategories = ref(false);
const projectCategories = ref([]);
const isSavingCategories = ref(false);

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

// Load project categories when modal opens
watch(() => props.show, async (show) => {
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
        useToast('success', 'Categorias del proyecto guardadas');
      } else {
        useToast('error', result.error || 'Error al guardar categorias');
      }
    } else {
      const result = await categoryStore.removeProjectOverride(props.project.id);
      if (result.success) {
        useToast('success', 'Se usaran las categorias globales');
      } else {
        useToast('error', result.error || 'Error al eliminar categorias');
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
