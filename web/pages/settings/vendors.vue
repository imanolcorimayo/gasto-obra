<template>
  <div>
    <SettingsHeader subtitle="Comercios frecuentes — se usan para sugerir al cargar gastos." />

    <div class="px-4 lg:px-5 py-4 lg:py-5">

    <!-- Loading State -->
    <div v-if="vendorStore.isLoading && !hasLoaded" class="bg-go-surface border border-go-border rounded-go-xl p-6">
      <div class="space-y-3">
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-1/3"></div>
      </div>
    </div>

    <!-- Vendor Editor -->
    <div v-else>
      <VendorManager v-model="editingVendors" @delete="handleSave" />

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
import { useVendorStore } from '~/stores/vendor';

definePageMeta({
  layout: 'app',
  middleware: ['auth']
});

useHead({
  title: 'Comercios frecuentes'
});

const vendorStore = useVendorStore();
const editingVendors = ref([]);
const isSaving = ref(false);
const hasLoaded = ref(false);

const isValid = computed(() => {
  return editingVendors.value.length === 0 ||
    editingVendors.value.every(v => v.name.trim());
});

onMounted(async () => {
  await vendorStore.fetchAll();
  hasLoaded.value = true;

  if (vendorStore.vendors.length > 0) {
    editingVendors.value = vendorStore.vendors.map(name => ({ name }));
  } else {
    editingVendors.value = [{ name: '' }];
  }
});

async function handleSave() {
  if (!isValid.value) return;

  isSaving.value = true;
  try {
    const toSave = editingVendors.value.filter(v => v.name.trim()).map(v => v.name.trim());
    const result = await vendorStore.saveAll(toSave);
    if (result.success) {
      useToast('success', toSave.length > 0 ? 'Comercios guardados' : 'Comercios eliminados');
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
