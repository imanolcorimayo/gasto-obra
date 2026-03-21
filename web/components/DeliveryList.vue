<template>
  <div class="flex flex-col gap-4">
    <!-- Unassigned summary bar -->
    <button
      v-if="unassignedExpenses.length > 0"
      @click="$emit('viewUnassigned')"
      class="flex items-center gap-3 px-4 py-2.5 bg-go-surface border border-go-border rounded-go-md border-l-[3px] border-l-go-warning text-left hover:bg-go-surface-alt/50 transition-colors group"
    >
      <span class="text-sm text-go-text flex-1">
        {{ unassignedExpenses.length === 1 ? '1 gasto sin entrega' : `${unassignedExpenses.length} gastos sin entrega` }}
      </span>
      <span class="font-display font-semibold text-sm tabular-nums text-go-text">{{ formatPrice(unassignedTotal) }}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted group-hover:text-go-text transition-colors flex-shrink-0"><path d="m9 18 6-6-6-6"/></svg>
    </button>

    <!-- Empty state -->
    <div v-if="deliveries.length === 0 && unassignedExpenses.length === 0" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin entregas</h3>
      <p class="text-go-text-muted text-sm max-w-xs">Creá tu primera entrega para agrupar los gastos.</p>
    </div>

    <!-- Delivery cards -->
    <div v-for="delivery in sortedDeliveries" :key="delivery.id" class="bg-go-surface border border-go-border rounded-go-xl overflow-hidden">
      <!-- Delivery header -->
      <div
        class="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        @click="toggleExpanded(delivery.id)"
      >
        <MdiChevronDown
          class="text-go-text-muted transition-transform flex-shrink-0"
          :class="{ '-rotate-90': !expanded.has(delivery.id) }"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-display font-semibold text-go-text">{{ delivery.number }}° Entrega</h4>
            <span class="text-xs text-go-text-muted tabular-nums">{{ formatDeliveryDate(delivery.date) }}</span>
          </div>
          <p v-if="delivery.description" class="text-xs text-go-text-tertiary mt-0.5">{{ delivery.description }}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="font-display font-bold text-base tabular-nums text-go-primary">{{ formatPrice(getDeliveryTotal(delivery.id)) }}</span>
          <span class="text-xs text-go-text-muted block">{{ getDeliveryExpenseCount(delivery.id) }} gastos</span>
        </div>
      </div>

      <!-- Expanded content -->
      <div v-if="expanded.has(delivery.id)">
        <div class="border-t border-go-border-subtle">
          <!-- Assigned expenses -->
          <div v-if="getDeliveryExpenses(delivery.id).length > 0" class="divide-y divide-go-border-subtle">
            <div
              v-for="expense in getDeliveryExpenses(delivery.id)"
              :key="expense.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-go-surface-alt/50 transition-colors"
              :class="{ 'cursor-pointer': editable }"
              @click="editable && $emit('editExpense', expense)"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm text-go-text">{{ expense.title }}</span>
                <span class="text-xs text-go-text-muted ml-2 tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
              </div>
              <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">{{ formatPrice(expense.amount) }}</span>
            </div>
          </div>
          <div v-else class="px-5 py-4 text-sm text-go-text-muted text-center">
            No hay gastos asignados a esta entrega.
          </div>

          <!-- Actions -->
          <div v-if="editable" class="flex items-center gap-2 px-5 py-3 border-t border-go-border-subtle bg-go-bg/50">
            <button
              @click.stop="$emit('assign', delivery)"
              class="text-xs text-go-primary hover:text-go-primary/80 transition-colors flex items-center gap-1"
            >
              <MdiPlaylistPlus class="text-base" />
              Asignar gastos
            </button>
            <button
              @click.stop="$emit('edit', delivery)"
              class="text-xs text-go-text-muted hover:text-go-text transition-colors flex items-center gap-1 ml-auto"
            >
              <MdiPencil class="text-sm" />
              Editar
            </button>
            <button
              @click.stop="$emit('delete', delivery)"
              :disabled="isDeleting"
              class="text-xs text-go-text-muted hover:text-go-danger transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isDeleting" class="btn-spinner !w-3 !h-3 !mr-1"></span>
              <MdiDelete v-else class="text-sm" />
              {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiPlaylistPlus from '~icons/mdi/playlist-plus';
import { formatPrice } from '~/utils';

const props = defineProps({
  deliveries: { type: Array, default: () => [] },
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false }
});

defineEmits(['edit', 'delete', 'assign', 'editExpense', 'viewUnassigned']);

const expanded = ref(new Set());

// Reverse order: last delivery (highest number) shows first
const sortedDeliveries = computed(() =>
  [...props.deliveries].sort((a, b) => b.number - a.number)
);

// Only expand the latest delivery (highest number)
onMounted(() => {
  if (props.deliveries.length > 0) {
    const latest = props.deliveries.reduce((a, b) => a.number > b.number ? a : b);
    expanded.value = new Set([latest.id]);
  }
});

watch(() => props.deliveries, (deliveries, oldDeliveries) => {
  // Auto-expand newly added deliveries
  const oldIds = new Set((oldDeliveries || []).map(d => d.id));
  for (const d of deliveries) {
    if (!oldIds.has(d.id)) {
      expanded.value.add(d.id);
    }
  }
}, { deep: true });

function toggleExpanded(id) {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expanded.value = s;
}

const clientExpenses = computed(() =>
  props.expenses.filter(e => !e.type || e.type === 'expense')
);

function getDeliveryExpenses(deliveryId) {
  return clientExpenses.value.filter(e => e.deliveryId === deliveryId);
}

function getDeliveryTotal(deliveryId) {
  return getDeliveryExpenses(deliveryId).reduce((sum, e) => sum + (e.amount || 0), 0);
}

function getDeliveryExpenseCount(deliveryId) {
  return getDeliveryExpenses(deliveryId).length;
}

const unassignedExpenses = computed(() =>
  clientExpenses.value.filter(e => !e.deliveryId)
);

const unassignedTotal = computed(() =>
  unassignedExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

function formatDeliveryDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
</script>
