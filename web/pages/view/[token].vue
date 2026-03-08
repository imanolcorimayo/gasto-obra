<template>
  <div class="min-h-screen bg-go-bg">
    <!-- Branded mini-header -->
    <header class="bg-go-bg border-b border-go-border px-4 py-3 flex items-center justify-between">
      <span class="font-display font-bold text-go-text">gasto<span class="text-go-primary">obra</span></span>
      <div class="flex items-center gap-2">
        <button
          @click="toggleTheme"
          class="p-1.5 rounded-lg text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover transition-colors duration-200"
          :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <MdiSun v-if="isDark" class="text-base" />
          <MdiMoon v-else class="text-base" />
        </button>
        <span class="bg-go-surface border border-go-border rounded-go-sm px-2 py-1 text-[11px] text-go-text-muted">Vista de cliente</span>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <!-- Loading skeleton -->
      <template v-if="isLoading">
        <div class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
          <div class="h-7 w-48 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-3"></div>
          <div class="h-4 w-32 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3">
            <div class="h-3 w-16 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-2"></div>
            <div class="h-6 w-24 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
          </div>
          <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3">
            <div class="h-3 w-16 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-2"></div>
            <div class="h-6 w-24 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
          </div>
          <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3 hidden sm:block">
            <div class="h-3 w-16 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-2"></div>
            <div class="h-6 w-24 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
          </div>
        </div>
        <div class="space-y-2">
          <div v-for="i in 4" :key="i" class="bg-go-surface border border-go-border rounded-go-md h-20 skeleton-shimmer"></div>
        </div>
      </template>

      <!-- Not found -->
      <div v-else-if="!project" class="text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <p class="text-go-text-muted text-sm mt-1">El link puede ser invalido o el proyecto ya no esta disponible.</p>
      </div>

      <!-- Project view -->
      <template v-else>
        <!-- Project header card -->
        <div class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="font-display font-bold text-2xl text-go-text">{{ project.name }}</h1>
              <div class="flex items-center gap-2 mt-1">
                <span v-if="project.tag" class="font-mono text-sm text-go-text-muted">#{{ project.tag }}</span>
              </div>
            </div>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-go-sm shrink-0"
              :class="statusClasses"
            >
              {{ statusLabel }}
            </span>
          </div>
          <div v-if="project.address || project.clientName" class="flex flex-wrap items-center gap-3 mt-3 text-sm text-go-text-tertiary">
            <div v-if="project.address" class="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ project.address }}</span>
            </div>
            <div v-if="project.clientName" class="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{{ project.clientName }}</span>
            </div>
          </div>
        </div>

        <!-- Details + Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <!-- Left: financial overview -->
          <div class="flex flex-col gap-4">
            <!-- Financial summary strip -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Total gastado</span>
                <span class="font-display font-bold text-xl tabular-nums text-go-primary">{{ formatPrice(totalExpensesAmount) }}</span>
              </div>
              <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Total cobrado</span>
                <span class="font-display font-bold text-xl tabular-nums text-go-secondary">{{ formatPrice(totalPaymentsAmount) }}</span>
              </div>
              <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3 col-span-2 sm:col-span-1">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Saldo</span>
                <span
                  class="font-display font-bold text-xl tabular-nums"
                  :class="balanceAmount >= 0 ? 'text-go-success' : 'text-go-danger'"
                >{{ formatPrice(balanceAmount) }}</span>
              </div>
            </div>

            <!-- Budget & timeline info -->
            <div v-if="project.budget || project.startDate || project.estimatedEndDate" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
          </div>

          <!-- Right: summary -->
          <div>
            <ExpenseSummary :expenses="allClientExpenses" :budget="project.budget" :categories="resolvedCategories" />
          </div>
        </div>

        <!-- Expense history -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-display font-semibold text-go-text">Detalle de gastos</h3>
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
              <p class="font-display text-go-text-secondary">Sin gastos</p>
              <p class="text-go-text-muted text-sm mt-1">Todavia no hay gastos registrados en esta obra.</p>
            </div>
            <div v-else>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-3">Movimientos</p>
              <div class="space-y-2">
                <ClientExpenseCard
                  v-for="expense in filteredCards"
                  :key="expense.id"
                  :expense="expense"
                  :categories="resolvedCategories"
                  @view-detail="openDetailModal"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <ClientBalanceTable :expenses="filteredAll" @view-detail="openDetailModal" />
          </template>
        </div>
      </template>

      <!-- Detail expense modal -->
      <ExpenseDetailModal
        :show="showDetailModal"
        :expense="detailExpense"
        :expenses="expenses"
        :categories="resolvedCategories"
        :editable="false"
        @close="showDetailModal = false"
        @view-expense="handleDetailViewExpense"
      />

      <!-- Join as client button -->
      <div v-if="project" class="mt-2 mb-8 bg-go-surface rounded-go-xl border border-go-border p-5 text-center">
        <p class="text-go-text mb-3 font-ui">¿Sos el dueño de esta obra?</p>
        <NuxtLink
          :to="`/client/join?token=${route.params.token}`"
          class="btn-primary inline-flex items-center gap-2"
        >
          Unirme como cliente
        </NuxtLink>
      </div>
    </div>

    <!-- Footer -->
    <footer class="mt-12 py-6 border-t border-go-border-subtle text-center text-go-text-muted text-xs">
      Generado por <span class="font-display">gasto<span class="text-go-text-tertiary">obra</span></span> · Solo lectura
    </footer>
  </div>
</template>

<script setup>
import MdiViewAgenda from '~icons/mdi/view-agenda';
import MdiTable from '~icons/mdi/table';
import MdiSun from '~icons/mdi/white-balance-sunny';
import MdiMoon from '~icons/mdi/moon-waning-crescent';

const { isDark, toggle: toggleTheme } = useTheme();
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { formatPrice, formatDate } from '~/utils';

definePageMeta({
  layout: 'landing'
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();

const isLoading = ref(true);
const project = ref(null);
const expenses = ref([]);
const selectedType = ref('');
const viewMode = ref('cards');
const showDetailModal = ref(false);
const detailExpense = ref(null);

const resolvedCategories = computed(() => {
  if (!project.value) return [];
  return categoryStore.getResolved(project.value.id);
});

useHead({
  title: computed(() => project.value?.name || 'Vista de Proyecto')
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

// All client-relevant expenses (for summary + table)
const allClientExpenses = computed(() =>
  expenses.value.filter(e => e.type !== 'provider_expense')
);

// Financial calculations for the summary strip
const onlyExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.type || e.type === 'expense')
);

const onlyPayments = computed(() =>
  allClientExpenses.value.filter(e => e.type === 'payment')
);

const totalExpensesAmount = computed(() =>
  onlyExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPaymentsAmount = computed(() =>
  onlyPayments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balanceAmount = computed(() => totalPaymentsAmount.value - totalExpensesAmount.value);

// Card view hides auto-linked payments (shown as "Pagado" on expense card)
const cardExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.linkedExpenseId)
);

// Apply type filter to each view
const filteredCards = computed(() => applyTypeFilter(cardExpenses.value));
const filteredAll = computed(() => applyTypeFilter(allClientExpenses.value));

function openDetailModal(expense) {
  detailExpense.value = expense;
  showDetailModal.value = true;
}

function handleDetailViewExpense(expense) {
  detailExpense.value = expense;
}

function applyTypeFilter(list) {
  if (!selectedType.value) return list;
  if (selectedType.value === 'expense') {
    return list.filter(e => !e.type || e.type === 'expense');
  }
  return list.filter(e => e.type === selectedType.value);
}

onMounted(async () => {
  const token = route.params.token;

  const projectResult = await projectStore.fetchProjectByShareToken(token);
  project.value = projectResult;

  if (projectResult) {
    await Promise.all([
      expenseStore.fetchByProjectIdPublic(projectResult.id),
      categoryStore.fetchForProviderPublic(projectResult.providerId, projectResult.id)
    ]);
    expenses.value = expenseStore.expenses;
  }

  isLoading.value = false;
});
</script>
