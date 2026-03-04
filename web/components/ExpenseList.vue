<template>
  <div class="flex flex-col gap-3">
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-1">
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Tipo</span>
        <select
          v-model="selectedType"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="t in typeFilters" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Estado</span>
        <select
          v-model="selectedPaymentStatus"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="ps in paymentStatusFilters" :key="ps.value" :value="ps.value">
            {{ ps.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Categoria</span>
        <select
          v-model="selectedCategory"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="cat in allCategories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>

      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-[11px] text-go-text-muted hover:text-go-text mt-3.5 transition-colors"
      >
        Limpiar filtros
      </button>
    </div>

    <!-- Empty state: no expenses at all -->
    <div v-if="filteredExpenses.length === 0 && !hasActiveFilters && expenses.length === 0" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin gastos todavia</h3>
      <p class="text-go-text-muted text-sm max-w-xs">Manda un mensaje por WhatsApp o usa el boton + para cargar.</p>
    </div>

    <!-- Empty state: filters active but no results -->
    <div v-else-if="filteredExpenses.length === 0 && hasActiveFilters" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin resultados</h3>
      <p class="text-go-text-muted text-sm mb-3">Proba cambiando los filtros.</p>
      <button @click="clearFilters" class="text-go-primary text-sm hover:underline transition-colors">Limpiar filtros</button>
    </div>

    <!-- Expense list -->
    <ExpenseCard
      v-for="expense in filteredExpenses"
      :key="expense.id"
      :expense="expense"
      :editable="editable"
      :categories="resolvedCategories"
      @view-image="$emit('viewImage', $event)"
      @edit="$emit('edit', $event)"
      @mark-paid="$emit('markPaid', $event)"
      @mark-pending="$emit('markPending', $event)"
    />
  </div>
</template>

<script setup>
import { DEFAULT_EXPENSE_CATEGORIES } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

defineEmits(['viewImage', 'edit', 'markPaid', 'markPending']);

const selectedCategory = ref('');
const selectedType = ref('');
const selectedPaymentStatus = ref('');

const typeFilters = [
  { value: '', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'payment', label: 'Pagos' },
  { value: 'provider_expense', label: 'Propios' }
];

const paymentStatusFilters = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pagados' },
  { value: 'pending', label: 'Pendientes' }
];

const allCategories = computed(() => [
  { value: '', label: 'Todas' },
  ...resolvedCategories.value
]);

const hasActiveFilters = computed(() =>
  selectedType.value || selectedPaymentStatus.value || selectedCategory.value
);

function clearFilters() {
  selectedType.value = '';
  selectedPaymentStatus.value = '';
  selectedCategory.value = '';
}

const filteredExpenses = computed(() => {
  let result = props.expenses;

  if (selectedType.value) {
    if (selectedType.value === 'expense') {
      result = result.filter(e => !e.type || e.type === 'expense');
    } else {
      result = result.filter(e => e.type === selectedType.value);
    }
  }

  if (selectedCategory.value) {
    result = result.filter(e => e.category === selectedCategory.value);
  }

  if (selectedPaymentStatus.value) {
    if (selectedPaymentStatus.value === 'paid') {
      result = result.filter(e => !e.paymentStatus || e.paymentStatus === 'paid');
    } else {
      result = result.filter(e => e.paymentStatus === selectedPaymentStatus.value);
    }
  }

  return result;
});
</script>
