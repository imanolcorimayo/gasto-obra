<template>
  <div>
    <SettingsHeader subtitle="Destinatarios de pago — personas o empresas a las que realizás pagos frecuentes." />

    <div class="px-4 lg:px-5 py-4 lg:py-5">

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
  </div>
</template>

<script setup>
import MdiInformation from '~icons/mdi/information';
import { useRecipientStore } from '~/stores/recipient';

definePageMeta({
  layout: 'app',
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
