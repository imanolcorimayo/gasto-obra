<template>
  <div class="flex flex-col gap-2">
    <!-- Category rows -->
    <div
      v-for="(cat, idx) in categories"
      :key="idx"
      class="flex items-center gap-3 p-2.5 bg-go-bg rounded-go-md border border-go-border-subtle"
    >
      <input
        type="color"
        v-model="cat.color"
        class="w-6 h-6 rounded-go-sm cursor-pointer border border-go-border bg-transparent shrink-0"
      />
      <input
        v-model="cat.label"
        type="text"
        placeholder="Nombre"
        class="flex-1 bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        @input="autoGenerateValue(idx)"
      />
      <input
        v-model="cat.value"
        type="text"
        placeholder="valor"
        class="w-32 bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
      />
      <button
        type="button"
        @click="removeCategory(idx)"
        :disabled="categories.length <= 1"
        class="text-go-text-muted hover:text-go-danger transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <MdiClose class="text-base" />
      </button>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-2 mt-1">
      <button
        type="button"
        @click="addCategory"
        class="text-sm text-go-primary hover:text-go-primary/80 flex items-center gap-1"
      >
        <MdiPlus class="text-base" />
        Agregar categoria
      </button>
      <button
        type="button"
        @click="resetDefaults"
        class="text-sm text-go-text-tertiary hover:text-go-text flex items-center gap-1"
      >
        <MdiRestore class="text-base" />
        Restaurar por defecto
      </button>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiPlus from '~icons/mdi/plus';
import MdiRestore from '~icons/mdi/restore';
import { DEFAULT_EXPENSE_CATEGORIES } from '~/utils';

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue']);

const categories = ref([]);
let skipEmit = false;

// Random color palette for new categories
const colorPalette = ['#5A8FB8', '#D4793D', '#BFA63D', '#A86B5E', '#6B9B6B', '#8B847A', '#8B6BA3', '#5A9BBF'];

watch(() => props.modelValue, (val) => {
  skipEmit = true;
  if (val && val.length > 0) {
    categories.value = val.map(c => ({ ...c }));
  } else {
    categories.value = DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c }));
  }
  nextTick(() => { skipEmit = false; });
}, { immediate: true });

watch(categories, (val) => {
  if (!skipEmit) {
    emit('update:modelValue', val.map(c => ({ ...c })));
  }
}, { deep: true });

function autoGenerateValue(idx) {
  const cat = categories.value[idx];
  if (cat.label) {
    cat.value = cat.label.toLowerCase().trim();
  }
}

function addCategory() {
  const colorIdx = categories.value.length % colorPalette.length;
  categories.value.push({
    value: '',
    label: '',
    color: colorPalette[colorIdx]
  });
}

function removeCategory(idx) {
  if (categories.value.length > 1) {
    categories.value.splice(idx, 1);
  }
}

function resetDefaults() {
  categories.value = DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c }));
}
</script>
