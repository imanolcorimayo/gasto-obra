<template>
  <NuxtLink :to="`/projects/${project.id}`" class="block bg-go-surface rounded-go-xl border border-go-border p-5 hover:border-go-primary/50 transition-colors">
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="text-base font-semibold">{{ project.name }}</h3>
        <p class="text-go-text-tertiary text-sm mt-1">#{{ project.tag }}</p>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full font-semibold"
        :class="statusClasses"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div v-if="project.clientName" class="text-go-text-tertiary text-sm mb-2">
      <span>Cliente: {{ project.clientName }}</span>
    </div>

    <div v-if="project.address" class="text-go-text-muted text-sm mb-3">
      {{ project.address }}
    </div>

    <div class="flex items-center justify-between pt-3 border-t border-go-border">
      <span class="text-go-primary font-semibold text-lg tabular-nums">{{ formatPrice(totalSpent) }}</span>
      <span class="text-go-text-muted text-sm">{{ expenseCount }} gastos</span>
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
    case 'active': return 'bg-go-success-muted text-go-success';
    case 'paused': return 'bg-go-warning-muted text-go-warning';
    case 'completed': return 'bg-go-surface-alt text-go-text-tertiary';
    default: return 'bg-go-surface-alt text-go-text-tertiary';
  }
});
</script>
