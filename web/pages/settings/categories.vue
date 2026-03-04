<template>
  <div class="mb-8">
    <div class="flex flex-col gap-6">
      <!-- Settings Sub-Nav -->
      <div class="flex gap-2 border-b border-go-border pb-3">
        <NuxtLink to="/settings/whatsapp" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
          WhatsApp
        </NuxtLink>
        <NuxtLink to="/settings/categories" class="text-sm px-3 py-1.5 rounded-go-md transition-colors" :class="'bg-go-surface-alt text-go-text'">
          Categorias
        </NuxtLink>
        <NuxtLink to="/settings/recipients" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
          Destinatarios
        </NuxtLink>
      </div>

      <!-- Header -->
      <div>
        <h1 class="text-[28px] font-bold tracking-tight">Categorias de gastos</h1>
        <p class="text-go-text-tertiary text-sm mt-1">Estas categorias se aplican a todos tus proyectos. Podes agregar categorias especificas por proyecto desde la configuracion de cada proyecto.</p>
      </div>

      <!-- Loading State -->
      <div v-if="categoryStore.isLoading && !hasLoaded" class="flex flex-col gap-4 skeleton-shimmer">
        <div class="h-48 w-full bg-go-surface-alt rounded-go-xl"></div>
      </div>

      <!-- Category Editor -->
      <div v-else class="bg-go-surface rounded-go-xl border border-go-border p-6">
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

      <!-- Info -->
      <div class="bg-go-surface rounded-go-xl border border-go-border p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <MdiInformation class="text-go-primary" />
          Como funciona
        </h3>
        <ul class="space-y-2 text-go-text-tertiary text-sm">
          <li>Las categorias globales se usan en todos tus proyectos.</li>
          <li>Podes definir categorias especificas para un proyecto desde su configuracion.</li>
          <li>Si no configuras ninguna categoria, se usan las 6 categorias por defecto.</li>
          <li>Las categorias tambien se usan en WhatsApp con el prefijo <code class="bg-go-surface px-1.5 py-0.5 rounded-go-sm text-go-primary">c:nombre</code>.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiInformation from '~icons/mdi/information';
import { useCategoryStore } from '~/stores/category';

definePageMeta({
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
