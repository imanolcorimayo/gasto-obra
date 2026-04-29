<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="font-display font-bold text-lg text-go-text truncate">Gastos</h1>
        <p v-if="project" class="text-[11px] text-go-text-muted mt-0.5 truncate">
          {{ project.name }} · <span class="font-mono">#{{ project.tag }}</span>
          <template v-if="cardExpenses.length">
            · {{ cardExpenses.length }} {{ cardExpenses.length === 1 ? 'movimiento' : 'movimientos' }}
          </template>
        </p>
      </div>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <AppLoader v-if="isLoading" text="Cargando gastos..." />

      <div v-else-if="!project" class="text-center py-16">
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <NuxtLink to="/client" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a mis obras</NuxtLink>
      </div>

      <template v-else>
        <!-- Financial KPI strip -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Gastado</span>
            <span class="font-display font-bold text-lg tabular-nums text-go-primary block leading-tight">{{ formatPrice(totalExpenses) }}</span>
          </div>
          <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Pagado</span>
            <span class="font-display font-bold text-lg tabular-nums text-go-secondary block leading-tight">{{ formatPrice(totalPayments) }}</span>
          </div>
          <div
            class="border rounded-go-xl px-3.5 py-3"
            :class="balance >= 0 ? 'bg-go-success-muted border-go-success/30' : 'bg-go-danger-muted border-go-danger/30'"
          >
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Saldo</span>
            <span
              class="font-display font-bold text-lg tabular-nums block leading-tight"
              :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
            >{{ formatPrice(Math.abs(balance)) }}</span>
            <span
              class="text-xs font-medium"
              :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
            >{{ balance >= 0 ? 'Al día' : 'A pagar' }}</span>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative flex-1 min-w-[180px] max-w-xs">
            <MdiMagnify class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-go-text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar..."
              class="w-full bg-go-surface border border-go-border rounded-go-md pl-8 pr-3 py-1.5 text-xs text-go-text placeholder:text-go-text-muted focus:outline-none focus:border-go-primary"
            />
          </div>
          <select
            v-model="selectedType"
            class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
          >
            <option value="">Todos los tipos</option>
            <option value="expense">Gastos</option>
            <option value="payment">Pagos</option>
          </select>
          <select
            v-model="selectedCategory"
            class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            <option v-for="cat in usedCategories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="text-[11px] text-go-text-muted hover:text-go-text transition-colors flex items-center gap-1"
          >
            <MdiCloseCircle class="text-sm" />
            Limpiar
          </button>
        </div>

        <div v-if="hasActiveFilters && filteredCards.length !== cardExpenses.length" class="mb-3">
          <span class="text-[11px] text-go-text-muted">{{ filteredCards.length }} de {{ cardExpenses.length }} movimientos</span>
        </div>

        <div v-if="filteredCards.length === 0" class="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p class="font-display text-go-text-secondary">{{ hasActiveFilters ? 'Sin resultados' : 'Sin gastos' }}</p>
          <p class="text-go-text-muted text-sm mt-1">{{ hasActiveFilters ? 'Probá ajustar los filtros.' : 'Todavía no hay gastos registrados en esta obra.' }}</p>
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between py-2.5 px-3 rounded-go-md bg-go-surface-alt border border-go-border-subtle">
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">{{ hasActiveFilters ? 'Total filtrado' : 'Total' }}</span>
            <div class="flex items-center gap-3">
              <span v-if="filteredTotalPayments > 0" class="text-sm tabular-nums text-go-secondary font-medium">+{{ formatPrice(filteredTotalPayments) }}</span>
              <span class="font-display font-bold text-lg tabular-nums text-go-primary">{{ formatPrice(filteredTotalExpenses) }}</span>
            </div>
          </div>

          <div v-for="group in weekGroups" :key="group.key">
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
      </template>
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
  </div>
</template>

<script setup>
import MdiMagnify from '~icons/mdi/magnify';
import MdiCloseCircle from '~icons/mdi/close-circle';
import MdiChevronDown from '~icons/mdi/chevron-down';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useProjectItemStore } from '~/stores/projectItem';
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { formatPrice, getCategoryLabel } from '~/utils';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  layout: 'client-project',
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

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

useHead({ title: computed(() => project.value ? `Gastos · ${project.value.name}` : 'Gastos') });

const allClientExpenses = computed(() =>
  expenseStore.expenses.filter(e => e.type !== 'provider_expense')
);

const cardExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.linkedExpenseId)
);

const totalExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.type || e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0)
);
const totalPayments = computed(() =>
  allClientExpenses.value.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0)
);
const balance = computed(() => totalPayments.value - totalExpenses.value);

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

const filteredTotalExpenses = computed(() =>
  filteredCards.value
    .filter(e => !e.type || e.type === 'expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

const filteredTotalPayments = computed(() =>
  filteredCards.value
    .filter(e => e.type === 'payment')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
);

function getExpenseDate(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return new Date(0);
  return raw.toDate ? raw.toDate() : new Date(raw);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
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
    if (expense.type === 'payment') group.totalPayments += expense.amount || 0;
    else group.totalExpenses += expense.amount || 0;
  }
  return Array.from(groups.values());
});

const hasInitCollapsed = ref(false);
watch(weekGroups, (groups) => {
  if (hasInitCollapsed.value || groups.length <= 1) return;
  hasInitCollapsed.value = true;
  collapsedWeeks.value = new Set(groups.slice(1).map(g => g.key));
});

function toggleWeek(key) {
  const next = new Set(collapsedWeeks.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
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
