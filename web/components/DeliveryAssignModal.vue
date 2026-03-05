<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">Asignar gastos</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ delivery?.number }}° Entrega</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="assignableExpenses.length === 0" class="text-center py-8">
          <p class="text-go-text-muted text-sm">No hay gastos disponibles para asignar.</p>
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
              <span class="text-sm text-go-text">{{ expense.title }}</span>
              <span class="text-xs text-go-text-muted ml-2">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
            </div>
            <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">
              {{ formatPrice(expense.amount) }}
            </span>
          </label>
        </div>
      </div>

      <div class="modal-footer flex-col sm:flex-row">
        <div class="flex-1 text-sm text-go-text-muted order-3 sm:order-1">
          {{ selected.size }} seleccionados
        </div>
        <button type="button" @click="$emit('close')" class="btn-secondary order-2">
          Cancelar
        </button>
        <button type="button" @click="handleSave" :disabled="isSaving" class="btn-primary flex items-center justify-center gap-2 order-1 sm:order-3">
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Guardar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import { formatPrice } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  delivery: { type: Object, default: null },
  expenses: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'save']);

const selected = ref(new Set());
const isSaving = ref(false);

// Show unassigned expenses + expenses already assigned to this delivery
const assignableExpenses = computed(() => {
  if (!props.delivery) return [];
  return props.expenses.filter(e =>
    e.type !== 'payment' && e.type !== 'provider_expense' &&
    (!e.deliveryId || e.deliveryId === props.delivery.id)
  );
});

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show && props.delivery) {
    isSaving.value = false;
    selected.value = new Set(
      props.expenses
        .filter(e => e.deliveryId === props.delivery.id)
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
    deliveryId: props.delivery.id,
    expenseIds: [...selected.value]
  });
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
</script>
