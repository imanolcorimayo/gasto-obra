<template>
  <div class="bg-surface rounded-xl border border-gray-700 p-5">
    <h3 class="font-semibold mb-4">Resumen</h3>

    <!-- Balance card -->
    <div class="flex flex-col gap-2 mb-4 pb-4 border-b border-gray-700">
      <div class="flex items-center justify-between">
        <span class="text-gray-400">Gastos</span>
        <span class="text-lg font-bold text-primary">{{ formatPrice(totalExpenses) }}</span>
      </div>
      <div v-if="totalPayments > 0" class="flex items-center justify-between">
        <span class="text-gray-400">Pagos recibidos</span>
        <span class="text-lg font-bold text-green-400">{{ formatPrice(totalPayments) }}</span>
      </div>
      <div v-if="totalProviderExpenses > 0" class="flex items-center justify-between">
        <span class="text-gray-400">Gastos propios</span>
        <span class="text-lg font-bold text-gray-400">{{ formatPrice(totalProviderExpenses) }}</span>
      </div>
      <div v-if="totalPending > 0" class="flex items-center justify-between">
        <span class="text-gray-400">Pendiente de pago</span>
        <span class="text-lg font-bold text-red-400">{{ formatPrice(totalPending) }}</span>
      </div>
      <div v-if="totalPayments > 0" class="flex items-center justify-between pt-2 border-t border-gray-700">
        <span class="text-gray-300 font-medium">Saldo</span>
        <span
          class="text-lg font-bold"
          :class="balance >= 0 ? 'text-green-400' : 'text-red-400'"
        >
          {{ formatPrice(balance) }}
        </span>
      </div>
    </div>

    <!-- Budget progress -->
    <div v-if="budget" class="mb-4 pb-4 border-b border-gray-700">
      <div class="flex items-center justify-between text-sm mb-2">
        <span class="text-gray-400">Presupuesto</span>
        <span class="text-gray-300">{{ formatPrice(budget) }}</span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all"
          :class="budgetPercent > 100 ? 'bg-red-500' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-primary'"
          :style="{ width: Math.min(budgetPercent, 100) + '%' }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ budgetPercent.toFixed(0) }}% usado</p>
    </div>

    <!-- Category breakdown -->
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
      {{ expenseCount }} registros en total
    </div>
  </div>
</template>

<script setup>
import { formatPrice, getCategoryColor, getCategoryLabel } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  budget: { type: Number, default: null }
});

const clientExpenses = computed(() =>
  props.expenses.filter(e => !e.type || e.type === 'expense')
);

const payments = computed(() =>
  props.expenses.filter(e => e.type === 'payment')
);

const providerExpensesList = computed(() =>
  props.expenses.filter(e => e.type === 'provider_expense')
);

const totalExpenses = computed(() =>
  clientExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  payments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalProviderExpenses = computed(() =>
  providerExpensesList.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPending = computed(() =>
  props.expenses
    .filter(e => e.paymentStatus === 'pending')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

const budgetPercent = computed(() => {
  if (!props.budget || props.budget <= 0) return 0;
  return (totalExpenses.value / props.budget) * 100;
});

const expenseCount = computed(() => props.expenses.length);

const categoryBreakdown = computed(() => {
  const grouped = {};
  clientExpenses.value.forEach(e => {
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
