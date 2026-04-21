<template>
  <div>
    <SettingsHeader subtitle="Categorías globales — se aplican a todas tus obras. Podés sobreescribirlas por proyecto." />

    <div class="px-4 lg:px-5 py-4 lg:py-5">

    <!-- Loading State -->
    <div v-if="categoryStore.isLoading && !hasLoaded" class="bg-go-surface border border-go-border rounded-go-xl p-6">
      <div class="space-y-3">
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-3/4"></div>
      </div>
    </div>

    <!-- Category Editor -->
    <div v-else>
      <!-- Info Callout -->
      <div class="bg-go-surface border border-go-border rounded-go-xl p-3 mb-5 flex items-start gap-3">
        <svg class="w-4 h-4 text-go-info shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
        </svg>
        <p class="text-go-text-secondary text-sm">Estos son tus categorías predeterminadas. Para cambiar las de una obra específica, editá el proyecto.</p>
      </div>

      <CategoryManager v-model="editingCategories" />

      <button
        @click="handleSave"
        :disabled="isSaving || !isValid"
        class="mt-6 btn-primary w-full flex items-center justify-center gap-2"
      >
        <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        Guardar
      </button>
    </div>
    </div>
  </div>
</template>

<script setup>
import MdiInformation from '~icons/mdi/information';
import { useCategoryStore } from '~/stores/category';

definePageMeta({
  layout: 'app',
  middleware: ['auth']
});

useHead({
  title: 'Categorias de gastos'
});

const categoryStore = useCategoryStore();
const editingCategories = ref([]);
const isSaving = ref(false);
const hasLoaded = ref(false);

const isValid = computed(() => {
  return editingCategories.value.length > 0 &&
    editingCategories.value.every(c => c.value && c.label && c.color);
});

onMounted(async () => {
  await categoryStore.fetchGlobal();
  hasLoaded.value = true;

  if (categoryStore.globalCategories.length > 0) {
    editingCategories.value = categoryStore.globalCategories.map(c => ({ ...c }));
  }
});

async function handleSave() {
  if (!isValid.value) return;

  isSaving.value = true;
  try {
    const result = await categoryStore.saveGlobal(editingCategories.value);
    if (result.success) {
      useToast('success', 'Categorias guardadas');
    } else {
      useToast('error', result.error || 'Error al guardar');
    }
  } catch (error) {
    useToast('error', 'Error al guardar');
  } finally {
    isSaving.value = false;
  }
}
</script>
