<template>
  <div class="flex flex-col gap-3">
    <!-- Filters -->
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
      @view-image="$emit('viewImage', $event)"
    />
  </div>
</template>

<script setup>
import { EXPENSE_CATEGORIES } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] }
});

defineEmits(['viewImage']);

const selectedCategory = ref('');

const allCategories = computed(() => [
  { value: '', label: 'Todos' },
  ...EXPENSE_CATEGORIES
]);

function toggleCategory(value) {
  selectedCategory.value = selectedCategory.value === value ? '' : value;
}

const filteredExpenses = computed(() => {
  if (!selectedCategory.value) return props.expenses;
  return props.expenses.filter(e => e.category === selectedCategory.value);
});
</script>
