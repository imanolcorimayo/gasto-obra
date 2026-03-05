<template>
  <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
    <h3 class="font-display font-semibold text-go-text mb-4">Resumen</h3>

    <!-- Balance card -->
    <div class="flex flex-col gap-3 mb-4 pb-4 border-b border-go-border">
      <div>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Gastos</span>
        <span class="font-display font-bold text-2xl tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
      </div>
      <div v-if="totalAddition > 0" class="flex gap-4 pl-3 border-l-2 border-go-border-subtle">
        <div class="flex-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Entrega</span>
          <span class="font-display font-bold text-base tabular-nums" :style="{ color: getScopeTypeColor('original') }">{{ formatPrice(totalOriginal) }}</span>
        </div>
        <div class="flex-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Agregados</span>
          <span class="font-display font-bold text-base tabular-nums" :style="{ color: getScopeTypeColor('addition') }">{{ formatPrice(totalAddition) }}</span>
        </div>
      </div>
      <div v-if="totalPayments > 0">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Pagos recibidos</span>
        <span class="font-display font-bold text-xl tabular-nums text-go-secondary">{{ formatPrice(totalPayments) }}</span>
      </div>
      <div v-if="totalProviderExpenses > 0">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Gastos propios</span>
        <span class="font-display font-bold text-xl tabular-nums text-go-text-tertiary">{{ formatPrice(totalProviderExpenses) }}</span>
      </div>
      <div v-if="totalPending > 0">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Pendiente de pago</span>
        <span class="font-display font-bold text-xl tabular-nums text-go-danger">{{ formatPrice(totalPending) }}</span>
      </div>
      <div v-if="totalPayments > 0" class="pt-3 border-t border-go-border">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Saldo</span>
        <span
          class="font-display font-bold text-xl tabular-nums"
          :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
        >
          {{ formatPrice(balance) }}
        </span>
      </div>
    </div>

    <!-- Budget progress -->
    <div v-if="budget" class="mb-4 pb-4 border-b border-go-border">
      <div class="flex items-center justify-between text-sm mb-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted">Presupuesto</span>
        <span class="text-go-text tabular-nums">{{ formatPrice(budget) }}</span>
      </div>
      <div class="w-full bg-go-surface-alt rounded-full h-1.5">
        <div
          class="h-1.5 rounded-full transition-all duration-500"
          :class="budgetPercent > 100 ? 'bg-go-danger' : budgetPercent > 80 ? 'bg-go-warning' : 'bg-go-primary'"
          :style="{ width: Math.min(budgetPercent, 100) + '%' }"
        ></div>
      </div>
      <p class="text-xs text-go-text-muted mt-1 tabular-nums">{{ budgetPercent.toFixed(0) }}% usado</p>
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
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span class="text-go-text">{{ cat.label }}</span>
          <span class="text-go-text-muted text-xs">({{ cat.count }})</span>
        </div>
        <span class="tabular-nums text-go-text-secondary">{{ formatPrice(cat.total) }} <span class="text-go-text-muted">({{ (cat.total / totalExpenses * 100).toFixed(0) }}%)</span></span>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-go-border text-sm text-go-text-muted">
      {{ expenseCount }} registros en total
    </div>
  </div>
</template>

<script setup>
import { formatPrice, getCategoryColor, getCategoryLabel, getScopeTypeColor } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  budget: { type: Number, default: null },
  categories: { type: Array, default: () => [] }
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

const totalOriginal = computed(() =>
  clientExpenses.value
    .filter(e => !e.scopeType || e.scopeType === 'original')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalAddition = computed(() =>
  clientExpenses.value
    .filter(e => e.scopeType === 'addition')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

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
      label: getCategoryLabel(name, props.categories),
      color: getCategoryColor(name, props.categories),
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
});
</script>
