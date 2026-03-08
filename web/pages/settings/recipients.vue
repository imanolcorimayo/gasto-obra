<template>
  <div>
    <!-- Settings Sub-Nav -->
    <div class="flex gap-2 border-b border-go-border pb-3 mb-8">
      <NuxtLink to="/settings/general" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        General
      </NuxtLink>
      <NuxtLink to="/settings/categories" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        Categorías
      </NuxtLink>
      <NuxtLink to="/settings/recipients" class="text-sm px-3 py-1.5 rounded-go-md transition-colors bg-go-surface-alt text-go-text">
        Destinatarios
      </NuxtLink>
      <NuxtLink to="/settings/vendors" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        Comercios
      </NuxtLink>
    </div>

    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="font-display font-bold text-2xl text-go-text">Destinatarios de pago</h1>
      <p class="text-go-text-muted text-sm mt-1">Personas o empresas a las que realizás pagos frecuentes.</p>
    </div>

    <!-- Loading State -->
    <div v-if="recipientStore.isLoading && !hasLoaded" class="bg-go-surface border border-go-border rounded-go-xl p-6">
      <div class="space-y-3">
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-14 w-full"></div>
        <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-10 w-1/3"></div>
      </div>
    </div>

    <!-- Recipient Editor -->
    <div v-else>
      <RecipientManager v-model="editingRecipients" @delete="handleSave" />

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
</template>

<script setup>
import MdiInformation from '~icons/mdi/information';
import { useRecipientStore } from '~/stores/recipient';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'Destinatarios de pago'
});

const recipientStore = useRecipientStore();
const editingRecipients = ref([]);
const isSaving = ref(false);
const hasLoaded = ref(false);

const isValid = computed(() => {
  return editingRecipients.value.length === 0 ||
    editingRecipients.value.every(r => r.name.trim());
});

onMounted(async () => {
  await recipientStore.fetchAll();
  hasLoaded.value = true;

  if (recipientStore.recipients.length > 0) {
    editingRecipients.value = recipientStore.recipients.map(r => ({ ...r }));
  } else {
    editingRecipients.value = [{ name: '', bankInfo: '', platform: '', cuit: '' }];
  }
});

async function handleSave() {
  if (!isValid.value) return;

  isSaving.value = true;
  try {
    // Filter out empty (untouched) recipients before saving
    const toSave = editingRecipients.value.filter(r => r.name.trim());
    const result = await recipientStore.saveAll(toSave);
    if (result.success) {
      useToast('success', toSave.length > 0 ? 'Destinatarios guardados' : 'Destinatarios eliminados');
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
