<template>
  <div class="mb-8">
    <div class="flex flex-col gap-6">
      <!-- Settings Sub-Nav -->
      <div class="flex gap-2 border-b border-gray-700 pb-3">
        <NuxtLink to="/settings/whatsapp" class="text-sm px-3 py-1.5 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-700/50">
          WhatsApp
        </NuxtLink>
        <NuxtLink to="/settings/categories" class="text-sm px-3 py-1.5 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-700/50">
          Categorias
        </NuxtLink>
        <NuxtLink to="/settings/recipients" class="text-sm px-3 py-1.5 rounded-lg transition-colors" :class="'bg-gray-700 text-white'">
          Destinatarios
        </NuxtLink>
      </div>

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold">Destinatarios de pago</h1>
        <p class="text-gray-400 text-sm mt-1">Configura los destinatarios frecuentes para tus pagos. Aparecen como opciones rapidas al registrar gastos y cobros.</p>
      </div>

      <!-- Loading State -->
      <div v-if="recipientStore.isLoading && !hasLoaded" class="flex flex-col gap-4 skeleton-shimmer">
        <div class="h-48 w-full bg-gray-700 rounded-xl"></div>
      </div>

      <!-- Recipient Editor -->
      <div v-else class="bg-surface rounded-xl border border-gray-700 p-6">
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

      <!-- Info -->
      <div class="bg-surface rounded-xl border border-gray-700 p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <MdiInformation class="text-primary" />
          Como funciona
        </h3>
        <ul class="space-y-2 text-gray-400 text-sm">
          <li>Los destinatarios se muestran como opciones al crear o editar un gasto o cobro.</li>
          <li>Al seleccionar un destinatario, se completan automaticamente los datos de pago.</li>
          <li>Podes agregar tantos destinatarios como necesites.</li>
        </ul>
      </div>
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
