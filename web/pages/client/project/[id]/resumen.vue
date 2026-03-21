<template>
  <div class="mb-8">
    <AppLoader v-if="isLoading" />

    <div v-else-if="!project" class="text-center py-16">
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
      <NuxtLink to="/client" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a mis obras</NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink
        :to="`/client/project/${route.params.id}`"
        class="text-go-text-muted text-sm hover:text-go-text inline-flex items-center gap-1 mb-4"
      >
        <MdiArrowLeft class="text-lg" />
        Volver al proyecto
      </NuxtLink>

      <h1 class="font-display font-bold text-2xl text-go-text mb-1">Resumen financiero</h1>
      <p class="text-sm text-go-text-muted mb-6">{{ project.name }}</p>

      <!-- ==================== 1. BUDGET CONSUMPTION TRACKER ==================== -->
      <section v-if="project.budget" class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Presupuesto</h3>

        <div class="flex items-end justify-between mb-2">
          <div>
            <span class="font-display font-bold text-2xl tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
            <span class="text-sm text-go-text-muted"> / {{ formatPrice(project.budget) }}</span>
          </div>
          <span
            class="text-sm font-semibold tabular-nums"
            :class="budgetSpentPercent > 100 ? 'text-go-danger' : budgetSpentPercent > 80 ? 'text-go-warning' : 'text-go-primary'"
          >{{ budgetSpentPercent.toFixed(0) }}%</span>
        </div>

        <!-- Budget bar -->
        <div class="w-full bg-go-surface-alt rounded-full h-3 mb-4">
          <div
            class="h-3 rounded-full transition-all duration-500"
            :class="budgetSpentPercent > 100 ? 'bg-go-danger' : budgetSpentPercent > 80 ? 'bg-go-warning' : 'bg-go-primary'"
            :style="{ width: Math.min(budgetSpentPercent, 100) + '%' }"
          ></div>
        </div>

        <!-- Projection -->
        <div v-if="projectedTotal" class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-go-border">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Promedio semanal</span>
            <span class="font-display font-bold text-lg tabular-nums text-go-text">{{ formatPrice(avgWeeklySpend) }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Proyección total</span>
            <span
              class="font-display font-bold text-lg tabular-nums"
              :class="projectedTotal > project.budget ? 'text-go-danger' : 'text-go-text'"
            >{{ formatPrice(projectedTotal) }}</span>
            <span
              v-if="projectedTotal > project.budget"
              class="text-xs text-go-danger block"
            >Supera el presupuesto en {{ formatPrice(projectedTotal - project.budget) }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Restante</span>
            <span
              class="font-display font-bold text-lg tabular-nums"
              :class="budgetRemaining >= 0 ? 'text-go-secondary' : 'text-go-danger'"
            >{{ formatPrice(Math.abs(budgetRemaining)) }}</span>
            <span class="text-xs text-go-text-muted block">{{ budgetRemaining >= 0 ? 'disponible' : 'excedido' }}</span>
          </div>
        </div>
      </section>

      <!-- ==================== 2. SPENDING OVER TIME ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-go-text">Gastos por semana</h3>
          <div class="flex gap-1">
            <button
              v-for="mode in ['weekly', 'daily']"
              :key="mode"
              @click="timeChartMode = mode"
              class="text-xs px-2.5 py-1 rounded-go-sm transition-colors"
              :class="timeChartMode === mode
                ? 'bg-go-primary text-go-primary-on'
                : 'text-go-text-muted hover:text-go-text hover:bg-go-surface-alt'"
            >{{ mode === 'weekly' ? 'Semanal' : 'Diario' }}</button>
          </div>
        </div>
        <div class="h-64">
          <ClientOnly>
            <ChartsBarChart :data="spendingOverTimeData" :options="spendingChartOptions" />
          </ClientOnly>
        </div>
      </section>

      <!-- ==================== 3. PAYMENTS VS EXPENSES ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-go-text">Pagos vs Gastos</h3>
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-go-primary"></span>
              <span class="text-go-text-muted">Gastos</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-go-secondary"></span>
              <span class="text-go-text-muted">Pagos</span>
            </div>
          </div>
        </div>
        <div class="h-64">
          <ClientOnly>
            <ChartsBarChart :data="paymentsVsExpensesData" :options="paymentsChartOptions" />
          </ClientOnly>
        </div>
        <!-- Running balance summary -->
        <div class="flex items-center justify-between pt-4 border-t border-go-border mt-4">
          <span class="text-sm text-go-text-muted">Balance acumulado</span>
          <span
            class="font-display font-bold text-lg tabular-nums"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ formatPrice(balance) }}</span>
        </div>
      </section>

      <!-- ==================== 4. CATEGORY BREAKDOWN ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Gastos por categoría</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <!-- Doughnut chart -->
          <div class="flex items-center justify-center">
            <div class="w-56 h-56 relative">
              <ClientOnly>
                <ChartsDoughnutChart :data="categoryDoughnutData" />
              </ClientOnly>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="text-center">
                  <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ categoryBreakdown.length }}</span>
                  <span class="text-xs text-go-text-muted block">categorías</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Category list -->
          <div class="flex flex-col justify-center gap-2.5">
            <div
              v-for="cat in categoryBreakdown"
              :key="cat.name"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: cat.color }"
                  ></span>
                  <span class="text-sm text-go-text">{{ cat.label }}</span>
                  <span class="text-xs text-go-text-muted">({{ cat.count }})</span>
                </div>
                <div class="text-right">
                  <span class="text-sm tabular-nums font-medium text-go-text-secondary">{{ formatPrice(cat.total) }}</span>
                  <span class="text-xs text-go-text-muted ml-1">{{ cat.percent }}%</span>
                </div>
              </div>
              <!-- Proportion bar -->
              <div class="w-full bg-go-surface-alt rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full transition-all"
                  :style="{ width: cat.percent + '%', backgroundColor: cat.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 5. SCOPE BREAKDOWN ==================== -->
      <section v-if="hasAdditions" class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Original vs Agregados</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <!-- Doughnut -->
          <div class="flex items-center justify-center">
            <div class="w-48 h-48 relative">
              <ClientOnly>
                <ChartsDoughnutChart :data="scopeDoughnutData" />
              </ClientOnly>
            </div>
          </div>

          <!-- Detail -->
          <div class="flex flex-col justify-center gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: '#5A8FB8' }"></span>
                <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Original</span>
              </div>
              <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ formatPrice(totalOriginal) }}</span>
              <span class="text-xs text-go-text-muted ml-2">{{ originalCount }} gastos</span>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: '#D4793D' }"></span>
                <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Agregados</span>
              </div>
              <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ formatPrice(totalAddition) }}</span>
              <span class="text-xs text-go-text-muted ml-2">{{ additionCount }} gastos</span>
            </div>
            <div class="pt-3 border-t border-go-border">
              <span class="text-xs text-go-text-muted">Los agregados representan el </span>
              <span class="text-sm font-semibold tabular-nums" :style="{ color: '#D4793D' }">{{ additionPercent }}%</span>
              <span class="text-xs text-go-text-muted"> del gasto total</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 6. MANAGEMENT FEE ==================== -->
      <section v-if="totalManagementFee > 0" class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Gastos de gestión</h3>
        <div class="flex items-end justify-between">
          <div>
            <span class="font-display font-bold text-xl tabular-nums text-go-text-secondary">{{ formatPrice(Math.round(totalManagementFee)) }}</span>
            <span class="text-xs text-go-text-muted block mt-1">incluido en el total de gastos</span>
          </div>
          <span class="text-sm tabular-nums text-go-text-muted">{{ managementFeePercent }}% del total</span>
        </div>
      </section>

      <!-- ==================== 7. DETAILED CATEGORY TABLE ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5">
        <h3 class="font-display font-semibold text-go-text mb-4">Detalle por categoría</h3>

        <div class="space-y-2">
          <div
            v-for="cat in categoryBreakdown"
            :key="cat.name"
            class="border border-go-border rounded-go-md overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between px-4 py-3 hover:bg-go-surface-alt/50 transition-colors cursor-pointer"
              @click="toggleCategory(cat.name)"
            >
              <div class="flex items-center gap-2">
                <MdiChevronDown
                  class="text-base text-go-text-muted transition-transform"
                  :class="expandedCategories.has(cat.name) ? '' : '-rotate-90'"
                />
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: cat.color }"
                ></span>
                <span class="text-sm font-medium text-go-text">{{ cat.label }}</span>
                <span class="text-xs text-go-text-muted">({{ cat.count }})</span>
              </div>
              <span class="font-display font-bold text-sm tabular-nums text-go-text-secondary">{{ formatPrice(cat.total) }}</span>
            </button>
            <div v-show="expandedCategories.has(cat.name)" class="border-t border-go-border">
              <div
                v-for="expense in cat.expenses"
                :key="expense.id"
                class="flex items-center justify-between px-4 py-2 text-sm border-b border-go-border-subtle last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <span class="text-go-text truncate block">{{ expense.title }}</span>
                  <span class="text-xs text-go-text-muted tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
                </div>
                <span class="font-display font-medium tabular-nums text-go-text-secondary ml-3">{{ formatPrice(expense.amount) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-go-border flex items-center justify-between text-sm text-go-text-muted">
          <span>{{ expenseCount }} gastos en total</span>
          <span class="font-display font-bold tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiChevronDown from '~icons/mdi/chevron-down';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { formatPrice, formatDate, getCategoryLabel, getCategoryColor, getManagementFeeAmount } from '~/utils';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();

const isLoading = ref(true);
const project = ref(null);
const timeChartMode = ref('weekly');
const expandedCategories = ref(new Set());

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

useHead({
  title: computed(() => project.value ? `Resumen · ${project.value.name}` : 'Resumen')
});

// --- Data slices ---

const allClientExpenses = computed(() =>
  expenseStore.expenses.filter(e => e.type !== 'provider_expense')
);

const onlyExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.type || e.type === 'expense')
);

const onlyPayments = computed(() =>
  allClientExpenses.value.filter(e => e.type === 'payment')
);

// --- Financial KPIs ---

const totalExpenses = computed(() =>
  onlyExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  onlyPayments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

const budgetSpentPercent = computed(() => {
  if (!project.value?.budget || project.value.budget <= 0) return 0;
  return (totalExpenses.value / project.value.budget) * 100;
});

const budgetRemaining = computed(() => {
  if (!project.value?.budget) return 0;
  return project.value.budget - totalExpenses.value;
});

// --- Scope breakdown ---

const originalExpenses = computed(() =>
  onlyExpenses.value.filter(e => !e.scopeType || e.scopeType === 'original')
);

const additionExpenses = computed(() =>
  onlyExpenses.value.filter(e => e.scopeType === 'addition')
);

const totalOriginal = computed(() =>
  originalExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalAddition = computed(() =>
  additionExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const originalCount = computed(() => originalExpenses.value.length);
const additionCount = computed(() => additionExpenses.value.length);
const hasAdditions = computed(() => totalAddition.value > 0);

const additionPercent = computed(() => {
  if (totalExpenses.value === 0) return 0;
  return Math.round((totalAddition.value / totalExpenses.value) * 100);
});

// --- Management fee ---

const totalManagementFee = computed(() =>
  onlyExpenses.value
    .filter(e => e.managementFeePercent)
    .reduce((sum, e) => sum + getManagementFeeAmount(e), 0)
);

const managementFeePercent = computed(() => {
  if (totalExpenses.value === 0) return 0;
  return Math.round((totalManagementFee.value / totalExpenses.value) * 100);
});

// --- Weekly average & projection ---

function toDate(raw) {
  if (!raw) return null;
  return raw.toDate ? raw.toDate() : new Date(raw);
}

function getExpenseDate(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return new Date(0);
  return raw.toDate ? raw.toDate() : new Date(raw);
}

const weeksElapsed = computed(() => {
  if (onlyExpenses.value.length === 0) return 0;
  const dates = onlyExpenses.value.map(e => getExpenseDate(e).getTime());
  const earliest = Math.min(...dates);
  const diffMs = Date.now() - earliest;
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
});

const avgWeeklySpend = computed(() => {
  if (weeksElapsed.value === 0) return 0;
  return Math.round(totalExpenses.value / weeksElapsed.value);
});

const projectedTotal = computed(() => {
  const end = toDate(project.value?.estimatedEndDate);
  const start = toDate(project.value?.startDate);
  if (!end || !start || avgWeeklySpend.value === 0) return null;
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  return avgWeeklySpend.value * totalWeeks;
});

// --- Counts ---

const expenseCount = computed(() => onlyExpenses.value.length);

// --- Time-based grouping helpers ---

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(date) {
  return getWeekStart(date).toISOString().slice(0, 10);
}

function formatWeekLabel(weekStartStr) {
  const start = new Date(weekStartStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const e = end.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  return `${s}`;
}

function formatDayLabel(dayStr) {
  const d = new Date(dayStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// --- Build time series for spending chart ---

const spendingTimeSeries = computed(() => {
  const expenses = onlyExpenses.value;
  if (expenses.length === 0) return { labels: [], data: [] };

  const isWeekly = timeChartMode.value === 'weekly';
  const grouped = {};

  for (const e of expenses) {
    const d = getExpenseDate(e);
    const key = isWeekly ? getWeekKey(d) : getDayKey(d);
    grouped[key] = (grouped[key] || 0) + (e.amount || 0);
  }

  const sortedKeys = Object.keys(grouped).sort();
  return {
    labels: sortedKeys.map(k => isWeekly ? formatWeekLabel(k) : formatDayLabel(k)),
    data: sortedKeys.map(k => grouped[k])
  };
});

const spendingOverTimeData = computed(() => ({
  labels: spendingTimeSeries.value.labels,
  datasets: [{
    data: spendingTimeSeries.value.data,
    backgroundColor: '#A35C0D33',
    borderColor: '#A35C0D',
    borderWidth: 2,
    borderRadius: 4,
    barPercentage: 0.7
  }]
}));

const spendingChartOptions = {
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => formatPrice(ctx.raw)
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (v) => formatPrice(v)
      }
    }
  }
};

// --- Payments vs Expenses chart ---

const paymentsVsExpensesTimeSeries = computed(() => {
  const allItems = allClientExpenses.value;
  if (allItems.length === 0) return { labels: [], expenses: [], payments: [] };

  const expenseGrouped = {};
  const paymentGrouped = {};

  for (const e of allItems) {
    const d = getExpenseDate(e);
    const key = getWeekKey(d);
    if (e.type === 'payment') {
      paymentGrouped[key] = (paymentGrouped[key] || 0) + (e.amount || 0);
    } else {
      expenseGrouped[key] = (expenseGrouped[key] || 0) + (e.amount || 0);
    }
  }

  const allKeys = [...new Set([...Object.keys(expenseGrouped), ...Object.keys(paymentGrouped)])].sort();

  return {
    labels: allKeys.map(k => formatWeekLabel(k)),
    expenses: allKeys.map(k => expenseGrouped[k] || 0),
    payments: allKeys.map(k => paymentGrouped[k] || 0)
  };
});

const paymentsVsExpensesData = computed(() => ({
  labels: paymentsVsExpensesTimeSeries.value.labels,
  datasets: [
    {
      label: 'Gastos',
      data: paymentsVsExpensesTimeSeries.value.expenses,
      backgroundColor: '#A35C0D33',
      borderColor: '#A35C0D',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    },
    {
      label: 'Pagos',
      data: paymentsVsExpensesTimeSeries.value.payments,
      backgroundColor: '#3D6B4533',
      borderColor: '#3D6B45',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    }
  ]
}));

const paymentsChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatPrice(ctx.raw)}`
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (v) => formatPrice(v)
      }
    }
  }
};

// --- Category breakdown ---

const categoryBreakdown = computed(() => {
  const grouped = {};
  for (const e of onlyExpenses.value) {
    const cat = e.category || 'otros';
    if (!grouped[cat]) {
      grouped[cat] = { total: 0, count: 0, expenses: [] };
    }
    grouped[cat].total += e.amount || 0;
    grouped[cat].count++;
    grouped[cat].expenses.push(e);
  }

  return Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      label: getCategoryLabel(name, resolvedCategories.value),
      color: getCategoryColor(name, resolvedCategories.value),
      total: data.total,
      count: data.count,
      percent: totalExpenses.value > 0 ? Math.round((data.total / totalExpenses.value) * 100) : 0,
      expenses: [...data.expenses].sort((a, b) => getExpenseDate(b) - getExpenseDate(a))
    }))
    .sort((a, b) => b.total - a.total);
});

const categoryDoughnutData = computed(() => ({
  labels: categoryBreakdown.value.map(c => c.label),
  datasets: [{
    data: categoryBreakdown.value.map(c => c.total),
    backgroundColor: categoryBreakdown.value.map(c => c.color),
    borderWidth: 0,
    hoverOffset: 6
  }]
}));

// --- Scope doughnut ---

const scopeDoughnutData = computed(() => ({
  labels: ['Original', 'Agregados'],
  datasets: [{
    data: [totalOriginal.value, totalAddition.value],
    backgroundColor: ['#5A8FB8', '#D4793D'],
    borderWidth: 0,
    hoverOffset: 6
  }]
}));

// --- Expandable category table ---

function toggleCategory(name) {
  const next = new Set(expandedCategories.value);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  expandedCategories.value = next;
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// --- Data loading ---

onMounted(async () => {
  const id = route.params.id;
  const user = await getCurrentUserAsync();

  if (!user) {
    isLoading.value = false;
    return;
  }

  const result = await projectStore.fetchProject(id);

  if (result && result.clientUserId === user.uid) {
    project.value = result;
    await Promise.all([
      expenseStore.fetchByProjectIdPublic(id),
      categoryStore.fetchForProjectFromAPI(id)
    ]);
  }

  isLoading.value = false;
});
</script>
