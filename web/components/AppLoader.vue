<template>
  <div class="flex flex-col items-center justify-center py-12">
    <div class="w-8 h-8 rounded-full border-2 border-go-border border-t-go-primary animate-spin"></div>
    <p v-if="text" class="text-go-text-muted text-sm mt-3 font-ui">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: 'Cargando...' }
});
</script>
