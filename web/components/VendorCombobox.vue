<template>
  <div class="relative" ref="wrapper">
    <input
      v-model="search"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      @focus="open = true"
      @keydown.down.prevent="moveDown"
      @keydown.up.prevent="moveUp"
      @keydown.enter.prevent="selectHighlighted"
      @keydown.escape="open = false"
      class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    />
    <ul
      v-if="open && filtered.length > 0"
      class="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto bg-go-surface border border-go-border rounded-go-md shadow-lg"
    >
      <li
        v-for="(v, i) in filtered"
        :key="v"
        @mousedown.prevent="select(v)"
        class="px-3 py-2 text-sm cursor-pointer transition-colors"
        :class="i === highlightIdx ? 'bg-go-primary/10 text-go-text' : 'text-go-text-secondary hover:bg-go-surface-alt'"
      >
        {{ v }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core';

const props = defineProps({
  modelValue: { type: String, default: '' },
  vendors: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Ej: Sodimac, Easy...' },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const wrapper = ref(null);
const open = ref(false);
const highlightIdx = ref(-1);

const search = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const filtered = computed(() => {
  if (!search.value) return props.vendors;
  const q = search.value.toLowerCase();
  return props.vendors.filter(v => v.toLowerCase().includes(q));
});

watch(search, () => { highlightIdx.value = -1; });

function moveDown() {
  if (!open.value) { open.value = true; return; }
  if (highlightIdx.value < filtered.value.length - 1) highlightIdx.value++;
}

function moveUp() {
  if (highlightIdx.value > 0) highlightIdx.value--;
}

function selectHighlighted() {
  if (highlightIdx.value >= 0 && highlightIdx.value < filtered.value.length) {
    select(filtered.value[highlightIdx.value]);
  } else {
    open.value = false;
  }
}

function select(val) {
  emit('update:modelValue', val);
  open.value = false;
  highlightIdx.value = -1;
}

onClickOutside(wrapper, () => { open.value = false; });
</script>
