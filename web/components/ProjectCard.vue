<template>
  <NuxtLink
    :to="`/projects/${project.id}`"
    class="block bg-go-surface border border-go-border rounded-go-xl p-5 hover:bg-go-surface-hover hover:border-go-border transition-all duration-200 cursor-pointer"
    :class="accentClass"
  >
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-baseline gap-2">
        <h3 class="font-display font-semibold text-go-text">{{ project.name }}</h3>
        <span class="text-go-text-muted text-xs font-mono">#{{ project.tag }}</span>
      </div>
      <span
        class="text-xs font-semibold px-2 py-0.5 rounded-go-sm shrink-0"
        :class="statusClasses"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="flex flex-col gap-1 mb-3">
      <div v-if="project.clientName" class="flex items-center gap-1.5 text-go-text-tertiary text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>{{ project.clientName }}</span>
      </div>
      <div v-if="project.address" class="flex items-center gap-1.5 text-go-text-tertiary text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>{{ project.address }}</span>
      </div>
    </div>

    <div class="pt-3 border-t border-go-border">
      <span class="text-go-text-muted text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Total gastado</span>
      <div class="flex items-end justify-between">
        <span class="font-display font-bold text-go-primary text-xl tabular-nums">{{ formatPrice(totalSpent) }}</span>
        <span class="text-go-text-muted text-xs">{{ expenseCount }} gastos</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
import { formatPrice } from '~/utils';

const props = defineProps({
  project: { type: Object, required: true },
  totalSpent: { type: Number, default: 0 },
  expenseCount: { type: Number, default: 0 }
});

const statusLabel = computed(() => {
  switch (props.project.status) {
    case 'active': return 'Activo';
    case 'paused': return 'Pausado';
    case 'completed': return 'Completado';
    default: return props.project.status;
  }
});

const statusClasses = computed(() => {
  switch (props.project.status) {
    case 'active': return 'bg-go-secondary/20 text-go-secondary';
    case 'paused': return 'bg-go-warning/20 text-go-warning';
    case 'completed': return 'bg-go-text-muted/20 text-go-text-muted';
    default: return 'bg-go-text-muted/20 text-go-text-muted';
  }
});

const accentClass = computed(() => {
  switch (props.project.status) {
    case 'active': return 'border-l-[3px] border-l-go-secondary';
    case 'paused': return 'border-l-[3px] border-l-go-warning';
    case 'completed': return 'border-l-[3px] border-l-go-text-muted';
    default: return 'border-l-[3px] border-l-go-text-muted';
  }
});
</script>
