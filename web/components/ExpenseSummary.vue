<template>
  <div class="bg-surface rounded-xl border border-gray-700 p-5">
    <h3 class="font-semibold mb-4">Resumen de gastos</h3>

    <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
      <span class="text-gray-400">Total</span>
      <span class="text-2xl font-bold text-primary">{{ formatPrice(total) }}</span>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="cat in categoryBreakdown"
        :key="cat.name"
        class="flex items-center justify-between text-sm"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span class="text-gray-300">{{ cat.label }}</span>
          <span class="text-gray-600 text-xs">({{ cat.count }})</span>
        </div>
        <span class="text-gray-300 font-medium">{{ formatPrice(cat.total) }}</span>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-500">
      {{ expenseCount }} gastos registrados
    </div>
  </div>
</template>

<script setup>
import { formatPrice, EXPENSE_CATEGORIES, getCategoryColor, getCategoryLabel } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] }
});

const total = computed(() =>
  props.expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const expenseCount = computed(() => props.expenses.length);

const categoryBreakdown = computed(() => {
  const grouped = {};
  props.expenses.forEach(e => {
    const cat = e.category || 'otros';
    if (!grouped[cat]) {
      grouped[cat] = { total: 0, count: 0 };
    }
    grouped[cat].total += e.amount || 0;
    grouped[cat].count++;
  });

  return Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      label: getCategoryLabel(name),
      color: getCategoryColor(name),
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
});
</script>
