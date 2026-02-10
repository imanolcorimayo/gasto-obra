<template>
  <div class="flex flex-col gap-3">
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-1">
      <div class="flex flex-col gap-0.5">
        <span class="text-[10px] text-gray-500 uppercase tracking-wider">Tipo</span>
        <select
          v-model="selectedType"
          class="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
        >
          <option v-for="t in typeFilters" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[10px] text-gray-500 uppercase tracking-wider">Estado</span>
        <select
          v-model="selectedPaymentStatus"
          class="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
        >
          <option v-for="ps in paymentStatusFilters" :key="ps.value" :value="ps.value">
            {{ ps.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[10px] text-gray-500 uppercase tracking-wider">Categoria</span>
        <select
          v-model="selectedCategory"
          class="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
        >
          <option v-for="cat in allCategories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>

      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-[10px] text-gray-500 hover:text-white mt-3.5 transition-colors"
      >
        Limpiar filtros
      </button>
    </div>

    <!-- Expense list -->
    <div v-if="filteredExpenses.length === 0" class="text-center text-gray-500 py-8">
      No hay gastos registrados
    </div>

    <ExpenseCard
      v-for="expense in filteredExpenses"
      :key="expense.id"
      :expense="expense"
      :editable="editable"
      @view-image="$emit('viewImage', $event)"
      @edit="$emit('edit', $event)"
      @mark-paid="$emit('markPaid', $event)"
      @mark-pending="$emit('markPending', $event)"
    />
  </div>
</template>

<script setup>
import { EXPENSE_CATEGORIES } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
});

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
  ...EXPENSE_CATEGORIES
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
