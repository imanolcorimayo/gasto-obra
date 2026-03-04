<template>
  <div class="mb-8">
    <!-- Loading -->
    <AppLoader v-if="isLoading" />

    <!-- Not found / unauthorized -->
    <div v-else-if="!project" class="text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
      <NuxtLink to="/client" class="text-go-primary text-sm mt-4 inline-block hover:underline">← Volver a mis obras</NuxtLink>
    </div>

    <!-- Project view -->
    <template v-else>
      <!-- Two-column layout -->
      <div class="lg:flex lg:gap-6">
        <!-- Left column: summary (sticky on desktop) -->
        <div class="lg:w-[340px] lg:shrink-0 mb-6 lg:mb-0">
          <div class="lg:sticky lg:top-6 space-y-4">
            <!-- Back link + header -->
            <div>
              <NuxtLink to="/client" class="text-go-text-muted text-sm hover:text-go-text inline-flex items-center gap-1 mb-3">
                <MdiArrowLeft class="text-lg" />
                Mis Obras
              </NuxtLink>

              <h1 class="font-display font-bold text-3xl text-go-text">{{ project.name }}</h1>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span v-if="project.tag" class="font-mono text-sm text-go-text-muted">#{{ project.tag }}</span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-go-sm"
                  :class="statusClasses"
                >
                  {{ statusLabel }}
                </span>
              </div>
            </div>

            <!-- Metadata chips -->
            <div v-if="project.address || project.clientName || project.startDate || project.estimatedEndDate" class="flex flex-wrap gap-2">
              <div v-if="project.address" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2 flex items-center gap-1.5 text-sm text-go-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ project.address }}
              </div>
              <div v-if="project.clientName" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2 flex items-center gap-1.5 text-sm text-go-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ project.clientName }}
              </div>
              <div v-if="project.startDate || project.estimatedEndDate" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2 flex items-center gap-1.5 text-sm text-go-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ project.startDate ? formatDate(project.startDate) : '—' }} → {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}
              </div>
            </div>

            <!-- Financial summary panel -->
            <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
              <h3 class="font-display font-semibold text-go-text mb-4">Resumen financiero</h3>

              <!-- Balance (prominent) -->
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-go-border">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted">Saldo</span>
                <span
                  class="font-display font-bold text-2xl tabular-nums"
                  :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
                >
                  {{ formatPrice(balance) }}
                </span>
              </div>

              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-go-text-tertiary text-sm">Total de gastos</span>
                  <span class="font-display font-bold text-lg tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-go-text-tertiary text-sm">Pagos realizados</span>
                  <span class="font-display font-bold text-lg tabular-nums text-go-secondary">{{ formatPrice(totalPayments) }}</span>
                </div>

                <div v-if="totalPending > 0" class="flex items-center justify-between">
                  <span class="text-go-text-tertiary text-sm">Pendiente de pago</span>
                  <span class="font-display font-bold text-lg tabular-nums text-go-danger">{{ formatPrice(totalPending) }}</span>
                </div>
              </div>

              <!-- Budget progress -->
              <div v-if="project.budget" class="mt-4 pt-4 border-t border-go-border">
                <div class="flex items-center justify-between text-sm mb-2">
                  <span class="text-go-text-tertiary">Presupuesto</span>
                  <span class="text-go-text tabular-nums">{{ budgetPercent.toFixed(0) }}% usado</span>
                </div>
                <div class="w-full bg-go-surface-alt rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all"
                    :class="budgetPercent > 100 ? 'bg-go-danger' : budgetPercent > 80 ? 'bg-go-warning' : 'bg-go-primary'"
                    :style="{ width: Math.min(budgetPercent, 100) + '%' }"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-xs text-go-text-muted mt-1">
                  <span>{{ formatPrice(totalExpenses) }}</span>
                  <span>{{ formatPrice(project.budget) }}</span>
                </div>
              </div>
            </div>

            <!-- Category breakdown -->
            <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
              <h3 class="font-display font-semibold text-go-text mb-4">Desglose por categoria</h3>

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
                      class="w-3 h-3 rounded-full shrink-0"
                      :style="{ backgroundColor: cat.color }"
                    ></span>
                    <span class="text-go-text">{{ cat.label }}</span>
                    <span class="text-go-text-muted text-xs">({{ cat.count }})</span>
                  </div>
                  <span class="text-go-text font-medium tabular-nums">{{ formatPrice(cat.total) }} <span class="text-go-text-muted">({{ (cat.total / totalExpenses * 100).toFixed(0) }}%)</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column: expense history -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-display font-semibold text-go-text">Historial</h3>
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
            <div v-if="filteredCards.length === 0" class="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <p class="font-display text-go-text-secondary">Sin registros</p>
              <p class="text-go-text-muted text-sm mt-1">No hay registros todavia.</p>
            </div>
            <div v-else>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-3">Movimientos</p>
              <div class="space-y-2">
                <ClientExpenseCard
                  v-for="expense in filteredCards"
                  :key="expense.id"
                  :expense="expense"
                  :categories="resolvedCategories"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <ClientBalanceTable :expenses="filteredAll" />
          </template>
        </div>
      </div>

      <!-- Powered by footer -->
      <div class="mt-12 pt-6 border-t border-go-border-subtle flex items-center justify-center gap-2 text-go-text-muted text-xs">
        <span class="font-display text-go-text-tertiary">gasto<span class="text-go-primary/50">obra</span></span>
        <span>·</span>
        <span>Powered by gastoobra</span>
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

const statusLabel = computed(() => {
  if (!project.value) return '';
  switch (project.value.status) {
    case 'active': return 'Activo';
    case 'paused': return 'Pausado';
    case 'completed': return 'Completado';
    default: return project.value.status;
  }
});

const statusClasses = computed(() => {
  if (!project.value) return '';
  switch (project.value.status) {
    case 'active': return 'bg-go-secondary/20 text-go-secondary';
    case 'paused': return 'bg-go-warning/20 text-go-warning';
    case 'completed': return 'bg-go-text-muted/20 text-go-text-muted';
    default: return 'bg-go-text-muted/20 text-go-text-muted';
  }
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
