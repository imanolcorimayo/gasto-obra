<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">Asignar gastos</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ item?.name }}</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="assignableExpenses.length === 0" class="text-center py-8">
          <p class="text-go-text-muted text-sm">No hay gastos disponibles para asignar.</p>
          <p class="text-go-text-muted/70 text-xs mt-1">Cargá un gasto desde "Nuevo movimiento" para empezar.</p>
        </div>

        <div v-else class="flex flex-col gap-1">
          <label
            v-for="expense in assignableExpenses"
            :key="expense.id"
            class="flex items-center gap-3 p-3 rounded-go-md border transition-colors cursor-pointer"
            :class="selected.has(expense.id)
              ? 'border-go-primary bg-go-primary/5'
              : 'border-go-border hover:border-go-text-muted'"
          >
            <input
              type="checkbox"
              :checked="selected.has(expense.id)"
              @change="toggleExpense(expense.id)"
              class="accent-go-primary w-4 h-4 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm text-go-text">{{ expense.title }}</span>
                <span
                  v-if="expense.itemId && expense.itemId !== item?.id"
                  class="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-go-sm bg-go-warning/15 text-go-warning whitespace-nowrap"
                  :title="`Hoy asignado a: ${otherItemName(expense.itemId)}`"
                >
                  En otro item
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs text-go-text-muted mt-0.5">
                <span class="tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
                <span v-if="expense.category">·</span>
                <span v-if="expense.category">{{ getCategoryLabel(expense.category) }}</span>
              </div>
            </div>
            <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">
              {{ formatPrice(expense.amount) }}
            </span>
          </label>
        </div>
      </div>

      <div class="modal-footer flex-col sm:flex-row">
        <div class="flex-1 text-sm text-go-text-muted order-3 sm:order-1 tabular-nums">
          {{ selected.size }} seleccionados · {{ formatPrice(selectedTotal) }}
        </div>
        <button type="button" @click="$emit('close')" class="btn-secondary order-2">
          Cancelar
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="isSaving"
          class="btn-primary flex items-center justify-center gap-2 order-1 sm:order-3"
        >
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Guardar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import { formatPrice, getCategoryLabel } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  expenses: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'save']);

const selected = ref(new Set());
const isSaving = ref(false);

// Show all client expenses (already-assigned to other items can be reassigned)
const assignableExpenses = computed(() => {
  if (!props.item) return [];
  return props.expenses
    .filter(e => !e.type || e.type === 'expense')
    .slice()
    .sort((a, b) => {
      const aDate = a.date?.toDate?.()?.getTime?.() ?? new Date(a.date || a.createdAt || 0).getTime();
      const bDate = b.date?.toDate?.()?.getTime?.() ?? new Date(b.date || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
});

const selectedTotal = computed(() => {
  let total = 0;
  for (const e of assignableExpenses.value) {
    if (selected.value.has(e.id)) total += e.amount || 0;
  }
  return total;
});

function otherItemName(id) {
  return props.items.find(i => i.id === id)?.name || '';
}

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show && props.item) {
    isSaving.value = false;
    selected.value = new Set(
      props.expenses
        .filter(e => e.itemId === props.item.id)
        .map(e => e.id)
    );
  }
});

function toggleExpense(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selected.value = s;
}

function handleSave() {
  isSaving.value = true;
  emit('save', {
    itemId: props.item.id,
    expenseIds: [...selected.value]
  });
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
</script>
