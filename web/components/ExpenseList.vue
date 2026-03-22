<template>
  <div>
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
        <option v-for="t in typeFilters" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>

      <!-- Category filter -->
      <select
        v-model="selectedCategory"
        class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
      >
        <option v-for="cat in allCategories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>

      <!-- Scope filter -->
      <select
        v-if="hasAdditions"
        v-model="selectedScopeType"
        class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
      >
        <option v-for="s in scopeTypeFilters" :key="s.value" :value="s.value">
          {{ s.label }}
        </option>
      </select>

      <!-- Clear -->
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
    <div v-if="hasActiveFilters && filteredExpenses.length !== expenses.length" class="mb-3">
      <span class="text-[11px] text-go-text-muted">{{ filteredExpenses.length }} de {{ expenses.length }} movimientos</span>
    </div>

    <!-- Loading state -->
    <AppLoader v-if="loading" text="Cargando movimientos..." />

    <!-- Empty state: no expenses at all -->
    <div v-else-if="filteredExpenses.length === 0 && !hasActiveFilters && expenses.length === 0" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin gastos todavía</h3>
      <p class="text-go-text-muted text-sm max-w-xs">Mandá un mensaje por WhatsApp o usá el botón + para cargar.</p>
    </div>

    <!-- Empty state: filters active but no results -->
    <div v-else-if="filteredExpenses.length === 0 && hasActiveFilters" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin resultados</h3>
      <p class="text-go-text-muted text-sm mb-3">Probá cambiando los filtros.</p>
      <button @click="clearFilters" class="text-go-primary text-sm hover:underline transition-colors">Limpiar filtros</button>
    </div>

    <!-- Balance table -->
    <div v-else class="bg-go-surface border border-go-border rounded-go-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display font-semibold text-go-text">Movimientos</h3>
        <span class="text-xs text-go-text-muted tabular-nums">{{ allRows.length }} registros</span>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-go-border">
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-2 w-10"></th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Fecha</th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Concepto</th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Tipo</th>
            <th v-if="hasInstallments" class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-center pb-2 px-3">Pagado</th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Categoría</th>
            <th v-if="hasAdditions" class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Alcance</th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Monto</th>
            <th class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Saldo</th>
            <th v-if="editable" class="text-xs font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in visibleWeekGroups" :key="group.key">
            <!-- Week separator row -->
            <tr
              class="cursor-pointer group"
              @click="toggleWeek(group.key)"
            >
              <td :colspan="tableColspan" class="py-2.5 px-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <MdiChevronDown
                      class="text-base text-go-text-muted group-hover:text-go-text transition-all"
                      :class="collapsedWeeks.has(group.key) ? '-rotate-90' : ''"
                    />
                    <span class="text-xs font-semibold uppercase tracking-wider text-go-text-secondary">{{ group.label }}</span>
                    <span class="text-[11px] text-go-text-muted">{{ group.rows.length }} mov.</span>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Expense rows for this week -->
            <template v-if="!collapsedWeeks.has(group.key)">
              <tr
                v-for="row in group.rows"
                :key="row.id"
                class="border-b border-go-border-subtle hover:bg-go-surface-alt/40 transition-colors cursor-pointer"
                :class="row.hasItemsMismatch ? 'bg-amber-500/8' : ''"
                @click="$emit('viewDetail', row.expense)"
              >
                <!-- Media preview -->
                <td class="py-2.5 pr-2">
                  <div class="w-9 h-9 rounded-go-sm overflow-hidden flex-shrink-0">
                    <img
                      v-if="row.expense.imageUrl"
                      :src="row.expense.imageUrl"
                      alt=""
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else-if="row.expense.fileUrl"
                      class="w-full h-full bg-red-500/10 flex items-center justify-center"
                    >
                      <MdiFilePdfBox class="text-base text-red-500" />
                    </div>
                    <div
                      v-else-if="row.expense.audioUrl"
                      class="w-full h-full bg-violet-500/10 flex items-center justify-center"
                    >
                      <MdiMicrophone class="text-base text-violet-500" />
                    </div>
                    <div
                      v-else
                      class="w-full h-full bg-go-surface-alt flex items-center justify-center"
                    >
                      <MdiTextBox class="text-base text-go-text-muted/50" />
                    </div>
                  </div>
                </td>

                <!-- Date -->
                <td class="py-2.5 pr-3 text-go-text-muted text-xs tabular-nums whitespace-nowrap">{{ row.date }}</td>

                <!-- Concepto -->
                <td class="py-2.5 pr-3 text-go-text max-w-[200px]">
                  <span class="truncate block">{{ row.title }}</span>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span v-if="row.vendor" class="text-go-text-muted text-[11px] truncate">{{ row.vendor }}</span>
                    <span v-if="row.items > 1" class="text-go-text-muted text-[11px]">({{ row.items }} items)</span>
                    <MdiAlertCircle v-if="row.hasItemsMismatch" class="text-amber-500 text-xs" title="La suma de items no coincide con el total" />
                  </div>
                </td>

                <!-- Type -->
                <td class="py-2.5 px-3 whitespace-nowrap">
                  <span
                    v-if="row.isPayment"
                    class="text-[11px] font-semibold px-1.5 py-0.5 rounded-go-sm bg-go-secondary/15 text-go-secondary"
                  >Cobro</span>
                  <span
                    v-else-if="row.isProvider"
                    class="text-[11px] font-semibold px-1.5 py-0.5 rounded-go-sm bg-go-text-muted/10 text-go-text-muted"
                  >Propio</span>
                  <span
                    v-else
                    class="text-[11px] font-semibold px-1.5 py-0.5 rounded-go-sm bg-go-primary/10 text-go-primary"
                  >Gasto</span>
                </td>

                <!-- Installment -->
                <td v-if="hasInstallments" class="py-2.5 px-3">
                  <template v-if="!row.isPayment && !row.isProvider && row.installmentPercent != null">
                    <span
                      v-if="(row.groupPercent ?? row.installmentPercent) === 0"
                      class="text-xs text-go-text-muted leading-tight inline-block w-20"
                    >Desc. balance</span>
                    <div v-else class="w-16">
                      <div class="flex items-baseline gap-0.5 mb-0.5">
                        <span class="text-xs tabular-nums font-semibold"
                          :class="(row.groupPercent || row.installmentPercent) >= 100 ? 'text-go-success' : 'text-go-text'"
                        >{{ row.groupPercent != null ? row.groupPercent : row.installmentPercent }}%</span>
                        <span v-if="row.groupPercent != null && row.groupPercent !== row.installmentPercent" class="text-[9px] tabular-nums text-go-text-muted">
                          (+{{ row.installmentPercent }})
                        </span>
                      </div>
                      <div class="w-full h-1 rounded-full bg-go-surface-alt overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all"
                          :class="(row.groupPercent || row.installmentPercent) >= 100 ? 'bg-go-success' : (row.groupPercent || row.installmentPercent) > 0 ? 'bg-go-primary' : ''"
                          :style="{ width: Math.min(row.groupPercent != null ? row.groupPercent : row.installmentPercent, 100) + '%' }"
                        ></div>
                      </div>
                    </div>
                  </template>
                </td>

                <!-- Category -->
                <td class="py-2.5 px-3 whitespace-nowrap">
                  <span v-if="row.categoryLabel && !row.isPayment" class="text-xs text-go-text-muted">{{ row.categoryLabel }}</span>
                </td>

                <!-- Scope -->
                <td v-if="hasAdditions" class="py-2.5 px-3 whitespace-nowrap">
                  <span
                    v-if="row.scopeType === 'addition'"
                    class="text-xs font-medium px-1.5 py-0.5 rounded-go-sm"
                    :style="getScopeTypeStyles('addition')"
                  >Agregado</span>
                </td>

                <!-- Amount -->
                <td class="py-2.5 pl-3 text-right whitespace-nowrap">
                  <span
                    class="tabular-nums font-medium"
                    :class="row.isPayment ? 'text-go-secondary' : row.isProvider ? 'text-go-text-tertiary' : 'text-go-primary'"
                  >{{ row.isPayment ? '+' : '' }}{{ formatPrice(row.expense.amount) }}</span>
                </td>

                <!-- Balance -->
                <td
                  class="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums font-semibold"
                  :class="row.balance >= 0 ? 'text-go-success' : 'text-go-danger'"
                >
                  {{ formatPrice(row.balance) }}
                </td>

                <!-- Actions -->
                <td v-if="editable" class="py-2.5 pl-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      v-if="row.canAddInstallment"
                      class="p-1.5 rounded-go-sm border border-go-primary text-go-primary hover:bg-go-primary-muted transition-colors cursor-pointer"
                      title="Agregar pago"
                      @click.stop="$emit('addInstallment', row.expense)"
                    ><MdiCashPlus class="text-base pointer-events-none" /></button>
                    <button
                      class="p-1.5 rounded-go-sm border border-go-border text-go-text-muted hover:bg-go-surface-alt hover:text-go-text transition-colors cursor-pointer"
                      title="Editar"
                      @click.stop="$emit('edit', row.expense)"
                    ><MdiPencil class="text-base pointer-events-none" /></button>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center pt-4 border-t border-go-border-subtle mt-2">
        <button
          @click="loadMore"
          class="text-sm text-go-primary hover:text-go-primary-hover font-medium px-6 py-2 rounded-go-md border border-go-border hover:border-go-primary transition-colors cursor-pointer"
        >
          Mostrar más ({{ remainingCount }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiCashPlus from '~icons/mdi/cash-plus';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiMagnify from '~icons/mdi/magnify';
import MdiCloseCircle from '~icons/mdi/close-circle';
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiMicrophone from '~icons/mdi/microphone';
import MdiTextBox from '~icons/mdi/text-box-outline';
import { DEFAULT_EXPENSE_CATEGORIES, formatPrice, getScopeTypeStyles, getCategoryLabel } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

defineEmits(['edit', 'addInstallment', 'viewDetail']);

const searchQuery = ref('');
const selectedCategory = ref('');
const selectedType = ref('');
const selectedScopeType = ref('');
const collapsedWeeks = ref(new Set());
const visibleCount = ref(20);

const PAGE_SIZE = 20;

const typeFilters = [
  { value: '', label: 'Todos los tipos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'payment', label: 'Cobros' },
  { value: 'provider_expense', label: 'Propios' }
];

const scopeTypeFilters = [
  { value: '', label: 'Todos' },
  { value: 'original', label: 'Original' },
  { value: 'addition', label: 'Agregados' }
];

const allCategories = computed(() => [
  { value: '', label: 'Todas las categorías' },
  ...resolvedCategories.value
]);

const hasActiveFilters = computed(() =>
  selectedType.value || selectedCategory.value || selectedScopeType.value || searchQuery.value.trim()
);

const hasAdditions = computed(() =>
  props.expenses.some(e => e.scopeType === 'addition')
);

const hasInstallments = computed(() =>
  filteredExpenses.value.some(e => (!e.type || e.type === 'expense') && e.installmentPercent != null && e.installmentPercent < 100)
);

// Dynamic colspan for week separator row
const tableColspan = computed(() => {
  let cols = 8; // preview, date, concepto, type, category, amount, balance, actions
  if (hasInstallments.value) cols++;
  if (hasAdditions.value) cols++;
  if (!props.editable) cols--;
  return cols;
});

function clearFilters() {
  selectedType.value = '';
  selectedCategory.value = '';
  selectedScopeType.value = '';
  searchQuery.value = '';
}

// Reset visible count when filters change
watch([searchQuery, selectedType, selectedCategory, selectedScopeType], () => {
  visibleCount.value = PAGE_SIZE;
});

const filteredExpenses = computed(() => {
  let result = props.expenses;

  if (selectedType.value) {
    if (selectedType.value === 'expense') {
      result = result.filter(e => !e.type || e.type === 'expense');
    } else {
      result = result.filter(e => e.type === selectedType.value);
    }
  }

  if (selectedCategory.value) {
    result = result.filter(e => e.category === selectedCategory.value);
  }

  if (selectedScopeType.value) {
    if (selectedScopeType.value === 'original') {
      result = result.filter(e => !e.scopeType || e.scopeType === 'original');
    } else {
      result = result.filter(e => e.scopeType === selectedScopeType.value);
    }
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(e =>
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.vendor && e.vendor.toLowerCase().includes(q))
    );
  }

  return result;
});

function getExpenseDate(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return new Date(0);
  return raw.toDate ? raw.toDate() : new Date(raw);
}

function formatDateShort(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return '';
  const date = raw.toDate ? raw.toDate() : new Date(raw);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const groupPercents = computed(() => {
  const groups = {};
  for (const e of props.expenses) {
    if (e.installmentGroupId) {
      groups[e.installmentGroupId] = (groups[e.installmentGroupId] || 0) + (e.installmentPercent || 0);
    }
  }
  return groups;
});

// Build rows with running balance
const allRows = computed(() => {
  const sorted = [...filteredExpenses.value].sort((a, b) => getExpenseDate(a) - getExpenseDate(b));

  let balance = 0;
  const result = sorted.map(e => {
    const isPayment = e.type === 'payment';
    const isProvider = e.type === 'provider_expense';
    const amount = e.amount || 0;
    const groupTotal = e.installmentGroupId ? (groupPercents.value[e.installmentGroupId] || 0) : null;

    if (isPayment) balance += amount;
    else if (!isProvider) balance -= amount;

    let hasItemsMismatch = false;
    if (e.items && e.items.length > 1) {
      const itemsSum = e.items.reduce((sum, i) => sum + (i.amount || 0), 0);
      const total = e.amountBase || amount;
      if (itemsSum > 0 && Math.abs(total - itemsSum) > 1) hasItemsMismatch = true;
    }

    return {
      id: e.id,
      expense: e,
      date: formatDateShort(e),
      title: e.title,
      vendor: e.vendor || null,
      items: e.items?.length || 0,
      hasItemsMismatch,
      scopeType: e.scopeType || 'original',
      categoryLabel: getCategoryLabel(e.category || 'otros', resolvedCategories.value),
      isPayment,
      isProvider,
      balance,
      installmentPercent: e.installmentPercent ?? null,
      groupPercent: groupTotal,
      canAddInstallment: !isPayment && !isProvider && groupTotal != null && groupTotal < 100
    };
  });

  return result.reverse();
});

// Paginated rows
const visibleRows = computed(() => allRows.value.slice(0, visibleCount.value));

// Group visible rows by week
const visibleWeekGroups = computed(() => {
  const groups = new Map();

  for (const row of visibleRows.value) {
    const date = getExpenseDate(row.expense);
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
        rows: [],
        totalExpenses: 0,
        totalPayments: 0,
        totalProviderExpenses: 0
      });
    }

    const group = groups.get(key);
    group.rows.push(row);
    if (row.isPayment) {
      group.totalPayments += row.expense.amount || 0;
    } else if (row.isProvider) {
      group.totalProviderExpenses += row.expense.amount || 0;
    } else {
      group.totalExpenses += row.expense.amount || 0;
    }
  }

  return Array.from(groups.values());
});

const hasMore = computed(() => visibleCount.value < allRows.value.length);
const remainingCount = computed(() => allRows.value.length - visibleCount.value);

function loadMore() {
  visibleCount.value += PAGE_SIZE;
}

// Auto-collapse all weeks except the most recent on first load
const hasInitCollapsed = ref(false);
watch(visibleWeekGroups, (groups) => {
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
</script>
