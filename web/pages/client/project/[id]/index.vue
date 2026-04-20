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
      <!-- Back link + header -->
      <NuxtLink to="/client" class="text-go-text-muted text-sm hover:text-go-text inline-flex items-center gap-1 mb-3">
        <MdiArrowLeft class="text-lg" />
        Mis Obras
      </NuxtLink>

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

      <!-- KPIs -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-display font-semibold text-go-text">Resumen</h2>
        <NuxtLink
          :to="`/client/project/${route.params.id}/resumen`"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-go-md bg-go-primary text-white text-sm font-medium hover:bg-go-primary-hover transition-colors"
        >
          <MdiChartBox class="text-base" />
          Ver resumen
        </NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <!-- Total gastado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-primary/15 flex items-center justify-center">
              <MdiTrendingUp class="text-sm text-go-primary" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Gastado</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-primary block leading-tight">{{ formatPrice(totalExpenses) }}</span>
          <span v-if="effectiveBudget > 0" class="text-xs text-go-text-muted tabular-nums">{{ budgetSpentPercent.toFixed(0) }}% del presupuesto</span>
        </div>

        <!-- Total cobrado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-secondary/15 flex items-center justify-center">
              <MdiCashCheck class="text-sm text-go-secondary" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Cobrado</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-secondary block leading-tight">{{ formatPrice(totalPayments) }}</span>
          <span v-if="effectiveBudget > 0" class="text-xs text-go-text-muted tabular-nums">{{ budgetCollectedPercent.toFixed(0) }}% del presupuesto</span>
        </div>

        <!-- Saldo pendiente -->
        <div
          class="border rounded-go-xl px-3.5 py-3"
          :class="balance >= 0 ? 'bg-go-success-muted border-go-success/30' : 'bg-go-danger-muted border-go-danger/30'"
        >
          <div class="flex items-center gap-2 mb-1.5">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center"
              :class="balance >= 0 ? 'bg-go-success/15' : 'bg-go-danger/15'"
            >
              <MdiCheckCircle v-if="balance >= 0" class="text-sm text-go-success" />
              <MdiAlertCircle v-else class="text-sm text-go-danger" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Saldo</span>
          </div>
          <span
            class="font-display font-bold text-lg tabular-nums block leading-tight"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ formatPrice(Math.abs(balance)) }}</span>
          <span
            class="text-xs font-medium"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ balance >= 0 ? 'Al día' : 'Falta abonar' }}</span>
        </div>

        <!-- Cronograma -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-info/15 flex items-center justify-center">
              <MdiCalendarClock class="text-sm text-go-info" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Plazo</span>
          </div>
          <template v-if="timelinePercent != null">
            <span
              class="font-display font-bold text-lg tabular-nums block leading-tight"
              :class="timelinePercent > 100 ? 'text-go-danger' : 'text-go-info'"
            >{{ Math.min(Math.round(timelinePercent), 100) }}%</span>
            <div class="w-full bg-go-surface-alt rounded-full h-1.5 my-1.5">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="timelinePercent > 100 ? 'bg-go-danger' : timelinePercent > 80 ? 'bg-go-warning' : 'bg-go-info'"
                :style="{ width: Math.min(timelinePercent, 100) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-go-text-muted">{{ daysRemaining >= 0 ? `${daysRemaining} días restantes` : `${Math.abs(daysRemaining)}d de atraso` }}</span>
          </template>
          <span v-else class="font-display font-bold text-lg text-go-text-muted block leading-tight">—</span>
        </div>

        <!-- Promedio semanal -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-warning/15 flex items-center justify-center">
              <MdiChartLine class="text-sm text-go-warning" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Prom. semanal</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-text block leading-tight">{{ formatPrice(avgWeeklySpend) }}</span>
          <span class="text-xs text-go-text-muted">en {{ weeksElapsed }} {{ weeksElapsed === 1 ? 'semana' : 'semanas' }}</span>
        </div>

        <!-- Cantidad -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-primary/10 flex items-center justify-center">
              <MdiReceiptText class="text-sm text-go-text-secondary" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Gastos</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-text block leading-tight">{{ expenseCount }}</span>
          <span class="text-xs text-go-text-muted">{{ paymentCount }} {{ paymentCount === 1 ? 'pago' : 'pagos' }}</span>
        </div>
      </div>

      <!-- Items -->
      <ProjectItemsSection
        v-if="project.id && project.providerId"
        :project-id="project.id"
        :provider-id="project.providerId"
        :readonly="false"
        :is-client="true"
      />

      <!-- Expense history -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-display font-semibold text-go-text">Detalle de gastos</h3>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <!-- Search -->
          <div class="relative flex-1 min-w-[180px] max-w-xs">
            <MdiMagnify class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-go-text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar..."
              class="w-full bg-go-surface border border-go-border rounded-go-md pl-8 pr-3 py-1.5 text-xs text-go-text placeholder:text-go-text-muted focus:outline-none focus:border-go-primary"
            />
          </div>

          <!-- Type filter -->
          <select
            v-model="selectedType"
            class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
          >
            <option value="">Todos los tipos</option>
            <option value="expense">Gastos</option>
            <option value="payment">Pagos</option>
          </select>

          <!-- Category filter -->
          <select
            v-model="selectedCategory"
            class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            <option v-for="cat in usedCategories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>

          <!-- Clear filters -->
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="text-[11px] text-go-text-muted hover:text-go-text transition-colors flex items-center gap-1"
          >
            <MdiCloseCircle class="text-sm" />
            Limpiar
          </button>
        </div>

        <!-- Results count -->
        <div v-if="hasActiveFilters && filteredCards.length !== cardExpenses.length" class="mb-3">
          <span class="text-[11px] text-go-text-muted">{{ filteredCards.length }} de {{ cardExpenses.length }} movimientos</span>
        </div>

        <!-- Grouped cards -->
        <div v-if="filteredCards.length === 0" class="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p class="font-display text-go-text-secondary">{{ hasActiveFilters ? 'Sin resultados' : 'Sin gastos' }}</p>
          <p class="text-go-text-muted text-sm mt-1">{{ hasActiveFilters ? 'Probá ajustar los filtros.' : 'Todavía no hay gastos registrados en esta obra.' }}</p>
        </div>
        <div v-else class="space-y-3">
          <div v-for="(group, groupIdx) in weekGroups" :key="group.key">
            <!-- Week header -->
            <button
              class="w-full flex items-center justify-between py-2 cursor-pointer group"
              @click="toggleWeek(group.key)"
            >
              <div class="flex items-center gap-2">
                <MdiChevronDown
                  class="text-base text-go-text-muted group-hover:text-go-text transition-all"
                  :class="collapsedWeeks.has(group.key) ? '-rotate-90' : ''"
                />
                <span class="text-base font-semibold text-go-text">{{ group.label }}</span>
                <span class="text-xs text-go-text-muted">· {{ group.expenses.length }} {{ group.expenses.length === 1 ? 'mov.' : 'movs.' }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="group.totalPayments > 0" class="text-sm tabular-nums text-go-secondary font-medium">+{{ formatPrice(group.totalPayments) }}</span>
                <span class="font-display font-bold text-lg tabular-nums text-go-primary">{{ formatPrice(group.totalExpenses) }}</span>
              </div>
            </button>
            <div class="h-px bg-go-border-subtle mb-2"></div>

            <!-- Week expenses -->
            <div v-show="!collapsedWeeks.has(group.key)" class="space-y-1.5 mt-2">
              <ClientExpenseCard
                v-for="expense in group.expenses"
                :key="expense.id"
                :expense="expense"
                :categories="resolvedCategories"
                :items="itemStore.items"
                @view-detail="openDetailModal"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Detail expense modal -->
      <ExpenseDetailModal
        :show="showDetailModal"
        :expense="detailExpense"
        :expenses="allClientExpenses"
        :categories="resolvedCategories"
        :items="itemStore.items"
        :editable="false"
        @close="showDetailModal = false"
        @view-expense="handleDetailViewExpense"
      />
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiArrowRight from '~icons/mdi/arrow-right';
import MdiTrendingUp from '~icons/mdi/trending-up';
import MdiCashCheck from '~icons/mdi/cash-check';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiCalendarClock from '~icons/mdi/calendar-clock';
import MdiChartLine from '~icons/mdi/chart-line';
import MdiReceiptText from '~icons/mdi/receipt-text';
import MdiMagnify from '~icons/mdi/magnify';
import MdiCloseCircle from '~icons/mdi/close-circle';
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiChartBox from '~icons/mdi/chart-box';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useProjectItemStore } from '~/stores/projectItem';
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { formatPrice, getCategoryLabel } from '~/utils';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();
const itemStore = useProjectItemStore();
const materialStore = useProjectMaterialStore();

const isLoading = ref(true);
const project = ref(null);
const selectedType = ref('');
const selectedCategory = ref('');
const searchQuery = ref('');
const showDetailModal = ref(false);
const detailExpense = ref(null);
const collapsedWeeks = ref(new Set());

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

// All client-relevant expenses (exclude provider_expense)
const allClientExpenses = computed(() =>
  expenseStore.expenses.filter(e => e.type !== 'provider_expense')
);

// Financial calculations
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

const balance = computed(() => totalPayments.value - totalExpenses.value);

// When the project has items, the effective budget is the sum of item budgets.
// Otherwise fall back to the legacy project-level budget field.
const effectiveBudget = computed(() => {
  if (itemStore.items.length > 0) {
    return itemStore.items.reduce(
      (sum, item) => sum + effectiveItemBudget(item, materialStore).totalMidpoint,
      0
    );
  }
  return project.value?.budget || 0;
});

const budgetSpentPercent = computed(() => {
  if (effectiveBudget.value <= 0) return 0;
  return (totalExpenses.value / effectiveBudget.value) * 100;
});

const budgetCollectedPercent = computed(() => {
  if (effectiveBudget.value <= 0) return 0;
  return (totalPayments.value / effectiveBudget.value) * 100;
});

// Timeline KPI
function toDate(raw) {
  if (!raw) return null;
  return raw.toDate ? raw.toDate() : new Date(raw);
}

const timelinePercent = computed(() => {
  const start = toDate(project.value?.startDate);
  const end = toDate(project.value?.estimatedEndDate);
  if (!start || !end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  return ((Date.now() - start.getTime()) / total) * 100;
});

const daysRemaining = computed(() => {
  const end = toDate(project.value?.estimatedEndDate);
  if (!end) return 0;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

// Weekly average KPI — count distinct weeks with expenses
const weeksElapsed = computed(() => {
  if (onlyExpenses.value.length === 0) return 0;
  const weekKeys = new Set();
  for (const e of onlyExpenses.value) {
    const raw = e.date || e.createdAt;
    if (!raw) continue;
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    // Monday-based week key: YYYY-WW
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(monday.getDate() - diff);
    weekKeys.add(`${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`);
  }
  return Math.max(1, weekKeys.size);
});

const avgWeeklySpend = computed(() => {
  if (weeksElapsed.value === 0) return 0;
  return Math.round(totalExpenses.value / weeksElapsed.value);
});

// Counts
const expenseCount = computed(() => onlyExpenses.value.length);
const paymentCount = computed(() => onlyPayments.value.length);

// Card view hides auto-linked payments
const cardExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.linkedExpenseId)
);

// Categories derived from actual expense data, merged with resolved definitions
const usedCategories = computed(() => {
  const seen = new Set();
  const result = [];
  for (const e of cardExpenses.value) {
    if (e.category && !seen.has(e.category)) {
      seen.add(e.category);
      const resolved = resolvedCategories.value.find(c => c.value === e.category);
      result.push({
        value: e.category,
        label: resolved ? resolved.label : getCategoryLabel(e.category, resolvedCategories.value)
      });
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
});

const hasActiveFilters = computed(() =>
  selectedType.value || selectedCategory.value || searchQuery.value.trim()
);

// Apply all filters
const filteredCards = computed(() => {
  let list = cardExpenses.value;

  if (selectedType.value) {
    if (selectedType.value === 'expense') {
      list = list.filter(e => !e.type || e.type === 'expense');
    } else {
      list = list.filter(e => e.type === selectedType.value);
    }
  }

  if (selectedCategory.value) {
    list = list.filter(e => e.category === selectedCategory.value);
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(e =>
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.vendor && e.vendor.toLowerCase().includes(q)) ||
      (e.recipientName && e.recipientName.toLowerCase().includes(q))
    );
  }

  return list;
});

// Group filtered expenses by week (Monday-based)
function getExpenseDate(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return new Date(0);
  return raw.toDate ? raw.toDate() : new Date(raw);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekGroups = computed(() => {
  const sorted = [...filteredCards.value].sort((a, b) => getExpenseDate(b) - getExpenseDate(a));

  const groups = new Map();
  for (const expense of sorted) {
    const date = getExpenseDate(expense);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString().slice(0, 10);

    if (!groups.has(key)) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startStr = weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      const endStr = weekEnd.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

      groups.set(key, {
        key,
        label: `${startStr} — ${endStr}`,
        expenses: [],
        totalExpenses: 0,
        totalPayments: 0
      });
    }

    const group = groups.get(key);
    group.expenses.push(expense);
    if (expense.type === 'payment') {
      group.totalPayments += expense.amount || 0;
    } else {
      group.totalExpenses += expense.amount || 0;
    }
  }

  return Array.from(groups.values());
});

// Auto-collapse all weeks except the most recent on first load
const hasInitCollapsed = ref(false);
watch(weekGroups, (groups) => {
  if (hasInitCollapsed.value || groups.length <= 1) return;
  hasInitCollapsed.value = true;
  collapsedWeeks.value = new Set(groups.slice(1).map(g => g.key));
});

function toggleWeek(key) {
  const next = new Set(collapsedWeeks.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  collapsedWeeks.value = next;
}

function clearFilters() {
  selectedType.value = '';
  selectedCategory.value = '';
  searchQuery.value = '';
}

function openDetailModal(expense) {
  detailExpense.value = expense;
  showDetailModal.value = true;
}

function handleDetailViewExpense(expense) {
  detailExpense.value = expense;
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
      categoryStore.fetchForProjectFromAPI(id),
      itemStore.fetchByProjectIdPublic(id),
      materialStore.fetchByProjectIdPublic(id)
    ]);
  }

  isLoading.value = false;
});
</script>
