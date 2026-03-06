<template>
  <div class="flex flex-col">
    <!-- Empty State -->
    <div v-if="recipients.length === 0" class="text-center py-8">
      <svg class="w-10 h-10 text-go-text-muted/30 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
      </svg>
      <p class="font-display text-go-text-secondary">Sin destinatarios todavía</p>
      <p class="text-go-text-muted text-sm mt-1">Agregá personas o empresas a las que pagás seguido.</p>
      <button
        type="button"
        @click="addRecipient"
        class="btn-secondary text-sm mt-4 inline-flex items-center gap-1.5"
      >
        <MdiPlus class="text-base" />
        Agregar destinatario
      </button>
    </div>

    <!-- Recipient Rows -->
    <template v-else>
      <div
        v-for="(r, idx) in recipients"
        :key="idx"
        class="flex items-start gap-3 p-3 bg-go-surface border border-go-border rounded-go-md mb-2"
      >
        <!-- Avatar -->
        <div class="bg-go-surface border border-go-border rounded-full w-9 h-9 flex items-center justify-center text-go-text-secondary text-sm font-semibold flex-shrink-0 mt-0.5">
          {{ r.name ? r.name.charAt(0).toUpperCase() : '?' }}
        </div>

        <!-- Fields -->
        <div class="flex-1 min-w-0 space-y-2">
          <div class="grid grid-cols-2 gap-3">
            <input
              v-model="r.name"
              type="text"
              placeholder="Nombre / Titular"
              class="w-full bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
            <input
              v-model="r.platform"
              type="text"
              placeholder="Plataforma (ej: Mercado Pago)"
              class="w-full bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>
          <input
            v-model="r.bankInfo"
            type="text"
            placeholder="CBU / CVU / Alias"
            class="w-full bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          />
          <input
            v-model="r.cuit"
            type="text"
            placeholder="CUIT/CUIL (opcional)"
            class="w-full bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          />
        </div>

        <!-- Delete -->
        <button
          type="button"
          @click="removeRecipient(idx)"
          class="text-go-text-muted hover:text-go-danger transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt shrink-0"
        >
          <MdiDelete class="text-base" />
        </button>
      </div>

      <!-- Add Button -->
      <button
        type="button"
        @click="addRecipient"
        class="text-sm text-go-primary hover:text-go-primary/80 flex items-center gap-1 mt-1"
      >
        <MdiPlus class="text-base" />
        Agregar destinatario
      </button>
    </template>
  </div>
</template>

<script setup>
import MdiDelete from '~icons/mdi/delete';
import MdiPlus from '~icons/mdi/plus';

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue', 'delete']);

const recipients = ref([]);
let skipEmit = false;
let internalChange = false;

watch(() => props.modelValue, (val) => {
  if (internalChange) {
    internalChange = false;
    return;
  }
  skipEmit = true;
  if (val && val.length > 0) {
    recipients.value = val.map(r => ({ ...r }));
  } else {
    recipients.value = [];
  }
  nextTick(() => { skipEmit = false; });
}, { immediate: true });

watch(recipients, (val) => {
  if (!skipEmit) {
    internalChange = true;
    emit('update:modelValue', val.map(r => ({ ...r })));
  }
}, { deep: true });

function addRecipient() {
  recipients.value.push({
    name: '',
    bankInfo: '',
    platform: '',
    cuit: ''
  });
}

function removeRecipient(idx) {
  recipients.value.splice(idx, 1);
  emit('delete');
}
</script>
