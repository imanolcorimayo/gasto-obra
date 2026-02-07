<template>
  <div class="flex flex-col gap-3">
    <!-- Type filter tabs -->
    <div class="flex flex-wrap items-center gap-2 mb-1">
      <button
        v-for="typeFilter in typeFilters"
        :key="typeFilter.value"
        @click="toggleType(typeFilter.value)"
        class="text-xs px-3 py-1 rounded-full border transition-colors"
        :class="selectedType === typeFilter.value
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-gray-600 text-gray-400 hover:border-gray-500'"
      >
        {{ typeFilter.label }}
      </button>
    </div>

    <!-- Category filters -->
    <div class="flex flex-wrap items-center gap-2 mb-2">
      <button
        v-for="cat in allCategories"
        :key="cat.value"
        @click="toggleCategory(cat.value)"
        class="text-xs px-3 py-1 rounded-full border transition-colors"
        :class="selectedCategory === cat.value
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-gray-600 text-gray-400 hover:border-gray-500'"
      >
        {{ cat.label }}
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
    />
  </div>
</template>

<script setup>
import { EXPENSE_CATEGORIES } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
});

defineEmits(['viewImage', 'edit']);

const selectedCategory = ref('');
const selectedType = ref('');

const typeFilters = [
  { value: '', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'payment', label: 'Pagos' },
  { value: 'provider_expense', label: 'Propios' }
];

const allCategories = computed(() => [
  { value: '', label: 'Todas' },
  ...EXPENSE_CATEGORIES
]);

function toggleCategory(value) {
  selectedCategory.value = selectedCategory.value === value ? '' : value;
}

function toggleType(value) {
  selectedType.value = selectedType.value === value ? '' : value;
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

  return result;
});
</script>
