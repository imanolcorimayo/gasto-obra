<template>
  <div class="flex flex-col items-center justify-center py-12 gap-4">
    <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p v-if="text" class="text-gray-400 text-sm">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: 'Cargando...' }
});
</script>
