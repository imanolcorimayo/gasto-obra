<template>
  <div class="flex flex-col">
    <!-- Empty State -->
    <div v-if="vendors.length === 0" class="text-center py-8">
      <svg class="w-10 h-10 text-go-text-muted/30 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.36 9L18.96 12H5.04L5.64 9H18.36M20 4H4V6H20V4M20 7H4L3 12V14H4V20H14V14H18V20H20V14H21V12L20 7M6 18V14H12V18H6Z" />
      </svg>
      <p class="font-display text-go-text-secondary">Sin comercios todavía</p>
      <p class="text-go-text-muted text-sm mt-1">Agrega comercios o proveedores donde compras seguido.</p>
      <button
        type="button"
        @click="addVendor"
        class="btn-secondary text-sm mt-4 inline-flex items-center gap-1.5"
      >
        <MdiPlus class="text-base" />
        Agregar comercio
      </button>
    </div>

    <!-- Vendor Rows -->
    <template v-else>
      <div
        v-for="(v, idx) in vendors"
        :key="idx"
        class="flex items-center gap-3 p-3 bg-go-surface border border-go-border rounded-go-md mb-2"
      >
        <div class="bg-go-surface border border-go-border rounded-full w-9 h-9 flex items-center justify-center text-go-text-secondary text-sm font-semibold flex-shrink-0">
          {{ typeof v.name === 'string' && v.name ? v.name.charAt(0).toUpperCase() : '?' }}
        </div>

        <input
          v-model="v.name"
          type="text"
          placeholder="Nombre del comercio"
          class="flex-1 bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        />

        <button
          type="button"
          @click="removeVendor(idx)"
          class="text-go-text-muted hover:text-go-danger transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt shrink-0"
        >
          <MdiDelete class="text-base" />
        </button>
      </div>

      <!-- Add Button -->
      <button
        type="button"
        @click="addVendor"
        class="text-sm text-go-primary hover:text-go-primary/80 flex items-center gap-1 mt-1"
      >
        <MdiPlus class="text-base" />
        Agregar comercio
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

const vendors = ref([]);
let skipEmit = false;
let internalChange = false;

watch(() => props.modelValue, (val) => {
  if (internalChange) {
    internalChange = false;
    return;
  }
  skipEmit = true;
  if (val && val.length > 0) {
    vendors.value = val.map(v => ({ name: typeof v === 'string' ? v : (typeof v.name === 'string' ? v.name : '') }));
  } else {
    vendors.value = [];
  }
  nextTick(() => { skipEmit = false; });
}, { immediate: true });

watch(vendors, (val) => {
  if (!skipEmit) {
    internalChange = true;
    emit('update:modelValue', val.map(v => ({ ...v })));
  }
}, { deep: true });

function addVendor() {
  vendors.value.push({ name: '' });
}

function removeVendor(idx) {
  vendors.value.splice(idx, 1);
  emit('delete');
}
</script>
