<template>
  <NuxtLink :to="`/projects/${project.id}`" class="block bg-surface rounded-xl border border-gray-700 p-5 hover:border-primary/50 transition-colors">
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="font-semibold text-lg">{{ project.name }}</h3>
        <p class="text-gray-400 text-sm mt-1">#{{ project.tag }}</p>
      </div>
      <span
        class="text-xs px-2 py-1 rounded-full font-medium"
        :class="statusClasses"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div v-if="project.clientName" class="text-gray-400 text-sm mb-2">
      <span>Cliente: {{ project.clientName }}</span>
    </div>

    <div v-if="project.address" class="text-gray-500 text-sm mb-3">
      {{ project.address }}
    </div>

    <div class="flex items-center justify-between pt-3 border-t border-gray-700">
      <span class="text-primary font-semibold text-lg">{{ formatPrice(totalSpent) }}</span>
      <span class="text-gray-500 text-sm">{{ expenseCount }} gastos</span>
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
    case 'active': return 'bg-green-500/20 text-green-400';
    case 'paused': return 'bg-yellow-500/20 text-yellow-400';
    case 'completed': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
});
</script>
