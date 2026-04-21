<template>
  <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle">
    <div class="px-4 lg:px-5 pt-3 pb-2">
      <h1 class="font-display font-bold text-lg text-go-text">Configuración</h1>
      <p v-if="subtitle" class="text-[11px] text-go-text-muted mt-0.5">{{ subtitle }}</p>
    </div>
    <nav class="flex gap-1 px-4 lg:px-5 overflow-x-auto no-scrollbar">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="shrink-0 py-2 px-3 text-[12.5px] font-semibold border-b-2 whitespace-nowrap transition-colors"
        :class="route.path === tab.to ? 'border-go-primary text-go-primary' : 'border-transparent text-go-text-muted hover:text-go-text'"
      >
        {{ tab.label }}
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup>
defineProps({
  subtitle: { type: String, default: '' }
});

const route = useRoute();

const tabs = [
  { to: '/settings/general',    label: 'General' },
  { to: '/settings/categories', label: 'Categorías' },
  { to: '/settings/recipients', label: 'Destinatarios' },
  { to: '/settings/vendors',    label: 'Comercios' }
];
</script>
