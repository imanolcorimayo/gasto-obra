<template>
  <div class="flex flex-col gap-3">
    <!-- Category rows -->
    <div
      v-for="(cat, idx) in categories"
      :key="idx"
      class="flex items-center gap-2"
    >
      <input
        type="color"
        v-model="cat.color"
        class="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-transparent shrink-0"
      />
      <input
        v-model="cat.label"
        type="text"
        placeholder="Nombre"
        class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
        @input="autoGenerateValue(idx)"
      />
      <input
        v-model="cat.value"
        type="text"
        placeholder="valor"
        class="w-32 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
      />
      <button
        type="button"
        @click="removeCategory(idx)"
        :disabled="categories.length <= 1"
        class="text-gray-500 hover:text-red-400 p-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <MdiClose class="text-base" />
      </button>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-2 mt-1">
      <button
        type="button"
        @click="addCategory"
        class="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
      >
        <MdiPlus class="text-base" />
        Agregar categoria
      </button>
      <button
        type="button"
        @click="resetDefaults"
        class="text-sm text-gray-400 hover:text-white flex items-center gap-1"
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
const colorPalette = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];

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
