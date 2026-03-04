<template>
  <div class="flex flex-col gap-3">
    <!-- Recipient cards -->
    <div
      v-for="(r, idx) in recipients"
      :key="idx"
      class="bg-go-surface border border-go-border rounded-go-md p-3 flex flex-col gap-2"
    >
      <div class="flex items-center gap-2">
        <input
          v-model="r.name"
          type="text"
          placeholder="Nombre / Titular"
          class="flex-1 bg-go-surface border border-go-border rounded-go-sm px-2.5 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
        />
        <button
          type="button"
          @click="removeRecipient(idx)"
          class="text-go-text-muted hover:text-go-danger p-1 transition-colors shrink-0"
        >
          <MdiDelete class="text-base" />
        </button>
      </div>
      <input
        v-model="r.bankInfo"
        type="text"
        placeholder="CBU / CVU / Alias"
        class="w-full bg-go-surface border border-go-border rounded-go-sm px-2.5 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
      />
      <div class="grid grid-cols-2 gap-2">
        <input
          v-model="r.platform"
          type="text"
          placeholder="Plataforma (ej: Mercado Pago)"
          class="w-full bg-go-surface border border-go-border rounded-go-sm px-2.5 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
        />
        <input
          v-model="r.cuit"
          type="text"
          placeholder="CUIT/CUIL (opcional)"
          class="w-full bg-go-surface border border-go-border rounded-go-sm px-2.5 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-2 mt-1">
      <button
        type="button"
        @click="addRecipient"
        class="text-sm text-go-primary hover:text-go-primary/80 flex items-center gap-1"
      >
        <MdiPlus class="text-base" />
        Agregar destinatario
      </button>
    </div>
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
