<template>
  <NuxtLink
    :to="`${basePath}/${project.id}`"
    class="block bg-go-surface border border-go-border rounded-go-xl overflow-hidden hover:border-go-border hover:shadow-sm transition-all duration-200 cursor-pointer relative"
  >
    <!-- Left accent bar -->
    <div class="absolute left-0 top-0 bottom-0 w-1" :style="{ background: accentColor }" />

    <!-- Top band (gradient) -->
    <div
      class="relative border-b border-go-border-subtle px-4 py-3 pl-5"
      :style="{ background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}07 70%)` }"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="text-[10px] text-go-text-muted font-mono tracking-wide">#{{ project.tag }}</div>
          <h3 class="font-display font-bold text-[15px] text-go-text mt-0.5 leading-tight truncate">{{ project.name }}</h3>
        </div>
        <span
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap"
          :class="statusPillClasses"
        >
          <span class="w-1.5 h-1.5 rounded-full" :style="{ background: accentColor }" />
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 pb-3.5 pt-3 pl-5">
      <div v-if="project.address" class="flex items-center gap-1.5 text-[11px] text-go-text-muted mb-3">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 13 6 13s6-8.5 6-13a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>
        <span class="truncate">{{ project.address }}</span>
      </div>

      <!-- With budget (or still loading): progress + 2-column -->
      <template v-if="isLoading || hasBudget">
        <div class="flex items-baseline justify-between mb-1.5">
          <span class="text-[10.5px] font-bold text-go-text-muted tracking-wider uppercase">Avance</span>
          <span v-if="isLoading" class="skeleton-shimmer bg-go-surface-alt rounded w-10 h-3"></span>
          <span v-else class="text-[11.5px] font-bold text-go-text tabular-nums">{{ progressPercent }}%</span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-go-surface-alt overflow-hidden">
          <div
            v-if="!isLoading"
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: progressPercent + '%', background: accentColor }"
          />
        </div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <div>
            <div class="text-[10px] font-semibold text-go-text-muted">Presupuesto</div>
            <div v-if="isLoading" class="skeleton-shimmer bg-go-surface-alt rounded h-5 w-20 mt-1"></div>
            <div v-else class="font-display font-bold text-[15px] text-go-text tabular-nums mt-0.5">{{ formatPrice(totalBudget) }}</div>
          </div>
          <div>
            <div class="text-[10px] font-semibold text-go-text-muted">Gastado</div>
            <div v-if="isLoading" class="skeleton-shimmer bg-go-surface-alt rounded h-5 w-20 mt-1"></div>
            <div v-else class="font-display font-bold text-[15px] text-go-primary tabular-nums mt-0.5">{{ formatPrice(totalSpent) }}</div>
          </div>
        </div>
      </template>

      <!-- No budget: single "Gastado" -->
      <template v-else>
        <div class="flex items-end justify-between">
          <div>
            <div class="text-[10px] font-semibold text-go-text-muted tracking-wider uppercase">Total gastado</div>
            <div v-if="isLoading" class="skeleton-shimmer bg-go-surface-alt rounded h-6 w-24 mt-1"></div>
            <div v-else class="font-display font-bold text-[19px] text-go-primary tabular-nums mt-0.5">{{ formatPrice(totalSpent) }}</div>
          </div>
          <div v-if="isLoading" class="skeleton-shimmer bg-go-surface-alt rounded h-3 w-14"></div>
          <div v-else class="text-[11px] text-go-text-muted">{{ expenseCount }} {{ expenseCount === 1 ? 'gasto' : 'gastos' }}</div>
        </div>
      </template>
    </div>
  </NuxtLink>
</template>

<script setup>
import { formatPrice } from '~/utils';

const props = defineProps({
  project: { type: Object, required: true },
  totalSpent: { type: Number, default: 0 },
  expenseCount: { type: Number, default: 0 },
  totalBudget: { type: Number, default: 0 },
  isLoading: { type: Boolean, default: false },
  basePath: { type: String, default: '/projects' }
});

const statusLabel = computed(() => {
  switch (props.project.status) {
    case 'active': return 'Activa';
    case 'paused': return 'En pausa';
    case 'completed': return 'Terminada';
    default: return props.project.status;
  }
});

// Direct color values so we can tint borders, bars and gradients with the same token.
const accentColor = computed(() => {
  switch (props.project.status) {
    case 'active':    return '#3D6B45';
    case 'paused':    return '#8C6818';
    case 'completed': return '#2D6A8A';
    default:          return '#635B54';
  }
});

const statusPillClasses = computed(() => {
  switch (props.project.status) {
    case 'active':    return 'bg-go-success-muted text-go-success';
    case 'paused':    return 'bg-go-warning-muted text-go-warning';
    case 'completed': return 'bg-go-info-muted text-go-info';
    default:          return 'bg-go-surface-alt text-go-text-tertiary';
  }
});

const hasBudget = computed(() => props.totalBudget > 0);

const progressPercent = computed(() => {
  if (!hasBudget.value) return 0;
  const pct = Math.round((props.totalSpent / props.totalBudget) * 100);
  return Math.max(0, Math.min(100, pct));
});
</script>

<style scoped>
.skeleton-shimmer {
  display: inline-block;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.85; }
}
</style>
