<template>
  <div class="mb-8">
    <!-- Loading -->
    <AppLoader v-if="isLoading" />

    <!-- Not found / unauthorized -->
    <div v-else-if="!project" class="text-center py-16">
      <h2 class="text-xl font-semibold text-go-text-tertiary">Proyecto no encontrado</h2>
      <NuxtLink to="/client" class="text-go-primary mt-4 inline-block">Volver a mis obras</NuxtLink>
    </div>

    <!-- Project view -->
    <template v-else>
      <div class="mb-6">
        <NuxtLink to="/client" class="text-go-text-tertiary hover:text-go-text text-sm mb-2 inline-flex items-center gap-1">
          <MdiArrowLeft class="text-lg" />
          Volver a mis obras
        </NuxtLink>

        <h1 class="text-[28px] font-bold tracking-tight mt-2">{{ project.name }}</h1>
        <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-go-text-tertiary">
          <span v-if="project.address">{{ project.address }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full font-semibold"
            :class="project.status === 'active' ? 'bg-go-success-muted text-go-success' : 'bg-go-surface-alt text-go-text-tertiary'"
          >
            {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
          </span>
        </div>
      </div>

      <!-- Budget & timeline info -->
      <div v-if="project.budget || project.startDate || project.estimatedEndDate" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
        <div v-if="project.budget" class="bg-go-surface rounded-go-md border border-go-border p-3">
          <span class="text-go-text-muted">Presupuesto:</span>
          <span class="text-go-text ml-2">{{ formatPrice(project.budget) }}</span>
        </div>
        <div v-if="project.startDate || project.estimatedEndDate" class="bg-go-surface rounded-go-md border border-go-border p-3">
          <span class="text-go-text-muted">Cronograma:</span>
          <span class="text-go-text ml-2">
            {{ project.startDate ? formatDate(project.startDate) : '—' }}
            →
            {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}
          </span>
        </div>
      </div>

      <!-- Financial summary -->
      <div class="bg-go-surface rounded-go-xl border border-go-border p-5 mb-6">
        <h3 class="font-semibold mb-4">Resumen financiero</h3>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-go-text-tertiary">Total de gastos</span>
            <span class="text-xl font-bold tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-go-text-tertiary">Pagos realizados</span>
            <span class="text-xl font-bold tabular-nums text-go-success">{{ formatPrice(totalPayments) }}</span>
          </div>

          <div v-if="totalPending > 0" class="flex items-center justify-between">
            <span class="text-go-text-tertiary">Pendiente de pago</span>
            <span class="text-xl font-bold tabular-nums text-go-danger">{{ formatPrice(totalPending) }}</span>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-go-border">
            <span class="text-go-text font-medium">Saldo</span>
            <span
              class="text-xl font-bold tabular-nums"
              :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
            >
              {{ formatPrice(balance) }}
            </span>
          </div>
        </div>

        <!-- Budget progress -->
        <div v-if="project.budget" class="mt-4 pt-4 border-t border-go-border">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-go-text-tertiary">Presupuesto</span>
            <span class="text-go-text">{{ budgetPercent.toFixed(0) }}% usado</span>
          </div>
          <div class="w-full bg-go-surface-alt rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="budgetPercent > 100 ? 'bg-go-danger' : budgetPercent > 80 ? 'bg-go-warning' : 'bg-go-primary'"
              :style="{ width: Math.min(budgetPercent, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="bg-go-surface rounded-go-xl border border-go-border p-5 mb-6">
        <h3 class="font-semibold mb-4">Desglose por categoria</h3>

        <div v-if="categoryBreakdown.length === 0" class="text-go-text-muted text-sm">
          No hay gastos registrados todavia.
        </div>

        <div v-else class="flex flex-col gap-2">
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
              <span class="text-go-text">{{ cat.label }}</span>
              <span class="text-go-text-muted text-xs">({{ cat.count }})</span>
            </div>
            <span class="text-go-text font-medium tabular-nums">{{ formatPrice(cat.total) }} <span class="text-go-text-muted">({{ (cat.total / totalExpenses * 100).toFixed(0) }}%)</span></span>
          </div>
        </div>
      </div>

      <!-- Expense & payment history -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold">Historial</h3>
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Tipo</span>
            <select
              v-model="selectedType"
              class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
            >
              <option value="">Todos</option>
              <option value="expense">Gastos</option>
              <option value="payment">Pagos</option>
            </select>
          </div>
        </div>
        <div class="flex rounded-go-md border border-go-border overflow-hidden w-fit mb-4">
          <button
            @click="viewMode = 'cards'"
            class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
            :class="viewMode === 'cards' ? 'bg-go-surface-alt text-go-text' : 'text-go-text-tertiary hover:text-go-text'"
          >
            <MdiViewAgenda class="text-sm" />
            Tarjetas
          </button>
          <button
            @click="viewMode = 'table'"
            class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
            :class="viewMode === 'table' ? 'bg-go-surface-alt text-go-text' : 'text-go-text-tertiary hover:text-go-text'"
          >
            <MdiTable class="text-sm" />
            Balance
          </button>
        </div>

        <template v-if="viewMode === 'cards'">
          <div v-if="filteredCards.length === 0" class="text-center text-go-text-muted py-8">
            No hay registros todavia.
          </div>
          <div v-else class="flex flex-col gap-3">
            <ClientExpenseCard
              v-for="expense in filteredCards"
              :key="expense.id"
              :expense="expense"
              :categories="resolvedCategories"
            />
          </div>
        </template>

        <template v-else>
          <ClientBalanceTable :expenses="filteredAll" />
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiViewAgenda from '~icons/mdi/view-agenda';
import MdiTable from '~icons/mdi/table';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { formatPrice, formatDate, getCategoryColor, getCategoryLabel } from '~/utils';
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
const selectedType = ref('');
const viewMode = ref('cards');

const resolvedCategories = computed(() => {
  const id = route.params.id;
  return categoryStore.getResolved(id);
});

useHead({
  title: computed(() => project.value?.name || 'Proyecto')
});

// All client-relevant expenses (for summary, table, and financial calculations)
const allClientExpenses = computed(() =>
  expenseStore.expenses.filter(e => e.type !== 'provider_expense')
);

// Card view hides auto-linked payments (shown as "Pagado" on expense card)
const cardExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.linkedExpenseId)
);

// Financial calculations use the full list
const onlyExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.type || e.type === 'expense')
);

const onlyPayments = computed(() =>
  allClientExpenses.value.filter(e => e.type === 'payment')
);

const totalExpenses = computed(() =>
  onlyExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  onlyPayments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPending = computed(() =>
  onlyExpenses.value
    .filter(e => e.paymentStatus === 'pending')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

const budgetPercent = computed(() => {
  if (!project.value?.budget || project.value.budget <= 0) return 0;
  return (totalExpenses.value / project.value.budget) * 100;
});

const categoryBreakdown = computed(() => {
  const grouped = {};
  onlyExpenses.value.forEach(e => {
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
      label: getCategoryLabel(name, resolvedCategories.value),
      color: getCategoryColor(name, resolvedCategories.value),
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
});

// Apply type filter to each view
const filteredCards = computed(() => applyTypeFilter(cardExpenses.value));
const filteredAll = computed(() => applyTypeFilter(allClientExpenses.value));

function applyTypeFilter(list) {
  if (!selectedType.value) return list;
  if (selectedType.value === 'expense') {
    return list.filter(e => !e.type || e.type === 'expense');
  }
  return list.filter(e => e.type === selectedType.value);
}

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
      categoryStore.fetchForProviderPublic(result.providerId, id)
    ]);
  }

  isLoading.value = false;
});
</script>
