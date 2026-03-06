<template>
  <div class="flex flex-col gap-3">
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-1">
      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Tipo</span>
        <select
          v-model="selectedType"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="t in typeFilters" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Alcance</span>
        <select
          v-model="selectedScopeType"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="s in scopeTypeFilters" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Categoria</span>
        <select
          v-model="selectedCategory"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="cat in allCategories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>

      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-[11px] text-go-text-muted hover:text-go-text mt-3.5 transition-colors"
      >
        Limpiar filtros
      </button>
    </div>

    <!-- Empty state: no expenses at all -->
    <div v-if="filteredExpenses.length === 0 && !hasActiveFilters && expenses.length === 0" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin gastos todavia</h3>
      <p class="text-go-text-muted text-sm max-w-xs">Manda un mensaje por WhatsApp o usa el boton + para cargar.</p>
    </div>

    <!-- Empty state: filters active but no results -->
    <div v-else-if="filteredExpenses.length === 0 && hasActiveFilters" class="flex flex-col items-center justify-center text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <h3 class="font-display text-go-text-secondary text-base mb-1">Sin resultados</h3>
      <p class="text-go-text-muted text-sm mb-3">Proba cambiando los filtros.</p>
      <button @click="clearFilters" class="text-go-primary text-sm hover:underline transition-colors">Limpiar filtros</button>
    </div>

    <!-- Balance table -->
    <div v-else class="bg-go-surface border border-go-border rounded-go-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display font-semibold text-go-text">Movimientos</h3>
        <span class="text-xs text-go-text-muted tabular-nums">{{ tableRows.length }} registros</span>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-go-border">
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Fecha</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Concepto</th>
            <th v-if="hasInstallments" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-center pb-2 px-3">Pagado</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Categoria</th>
            <th v-if="hasAdditions" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Alcance</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Gasto</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Pago</th>
            <th v-if="hasProviderExpenses" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Propio</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Saldo</th>
            <th v-if="editable" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableRows"
            :key="row.id"
            class="border-b border-go-border-subtle hover:bg-go-surface/50 transition-colors"
          >
            <td class="py-3 pr-3 text-go-text-muted text-xs tabular-nums whitespace-nowrap">{{ row.date }}</td>
            <td class="py-3 pr-3 text-go-text">
              <span>{{ row.title }}</span>
              <span v-if="row.items" class="text-go-text-muted text-xs ml-1">({{ row.items }} items)</span>
            </td>
            <td v-if="hasInstallments" class="py-3 px-3 whitespace-nowrap">
              <div
                v-if="!row.isPayment && !row.isProvider && row.installmentPercent != null"
                class="w-16"
              >
                <div class="flex items-baseline gap-0.5 mb-0.5">
                  <span class="text-[10px] tabular-nums font-semibold"
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
            </td>
            <td class="py-3 px-3 whitespace-nowrap">
              <span v-if="row.categoryLabel" class="text-xs text-go-text-muted">{{ row.categoryLabel }}</span>
            </td>
            <td v-if="hasAdditions" class="py-3 px-3 whitespace-nowrap">
              <span
                v-if="row.scopeType === 'addition'"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm"
                :style="getScopeTypeStyles('addition')"
              >Agregado</span>
            </td>
            <td class="py-3 pl-3 text-right whitespace-nowrap">
              <span v-if="row.expenseAmount" class="tabular-nums font-medium text-go-primary">{{ formatPrice(row.expenseAmount) }}</span>
            </td>
            <td class="py-3 pl-3 text-right whitespace-nowrap">
              <span v-if="row.paymentAmount" class="tabular-nums font-medium text-go-secondary">{{ formatPrice(row.paymentAmount) }}</span>
            </td>
            <td v-if="hasProviderExpenses" class="py-3 pl-3 text-right whitespace-nowrap">
              <span v-if="row.providerAmount" class="tabular-nums font-medium text-go-text-tertiary">{{ formatPrice(row.providerAmount) }}</span>
            </td>
            <td
              class="py-3 pl-3 text-right whitespace-nowrap tabular-nums font-semibold"
              :class="row.balance >= 0 ? 'text-go-success' : 'text-go-danger'"
            >
              {{ formatPrice(row.balance) }}
            </td>
            <td v-if="editable" class="py-3 pl-3 text-right whitespace-nowrap">
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
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiCashPlus from '~icons/mdi/cash-plus';
import { DEFAULT_EXPENSE_CATEGORIES, formatPrice, getScopeTypeStyles, getCategoryLabel } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

defineEmits(['edit', 'addInstallment']);

const selectedCategory = ref('');
const selectedType = ref('');
const selectedScopeType = ref('');

const typeFilters = [
  { value: '', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'payment', label: 'Pagos' },
  { value: 'provider_expense', label: 'Propios' }
];

const scopeTypeFilters = [
  { value: '', label: 'Todos' },
  { value: 'original', label: 'Original' },
  { value: 'addition', label: 'Agregados' }
];

const allCategories = computed(() => [
  { value: '', label: 'Todas' },
  ...resolvedCategories.value
]);

const hasActiveFilters = computed(() =>
  selectedType.value || selectedCategory.value || selectedScopeType.value
);

function clearFilters() {
  selectedType.value = '';
  selectedCategory.value = '';
  selectedScopeType.value = '';
}

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

  return result;
});

function getTimestamp(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return 0;
  if (raw.toDate) return raw.toDate().getTime();
  return new Date(raw).getTime();
}

function formatDateShort(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return '';
  const date = raw.toDate ? raw.toDate() : new Date(raw);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

const hasProviderExpenses = computed(() =>
  filteredExpenses.value.some(e => e.type === 'provider_expense')
);

const hasAdditions = computed(() =>
  filteredExpenses.value.some(e => e.scopeType === 'addition')
);

const hasInstallments = computed(() =>
  filteredExpenses.value.some(e => (!e.type || e.type === 'expense') && e.installmentPercent != null && e.installmentPercent < 100)
);

const groupPercents = computed(() => {
  const groups = {};
  for (const e of props.expenses) {
    if (e.installmentGroupId) {
      groups[e.installmentGroupId] = (groups[e.installmentGroupId] || 0) + (e.installmentPercent || 0);
    }
  }
  return groups;
});

const tableRows = computed(() => {
  const sorted = [...filteredExpenses.value].sort((a, b) => getTimestamp(a) - getTimestamp(b));

  let balance = 0;
  const result = sorted.map(e => {
    const isPayment = e.type === 'payment';
    const isProvider = e.type === 'provider_expense';
    const amount = e.amount || 0;
    const groupTotal = e.installmentGroupId ? (groupPercents.value[e.installmentGroupId] || 0) : null;

    if (isPayment) balance += amount;
    else if (!isProvider) balance -= amount;

    return {
      id: e.id,
      expense: e,
      date: formatDateShort(e),
      title: e.title,
      items: e.items?.length || 0,
      scopeType: e.scopeType || 'original',
      categoryLabel: getCategoryLabel(e.category || 'otros', resolvedCategories.value),
      isPayment,
      isProvider,
      expenseAmount: (!isPayment && !isProvider) ? amount : null,
      paymentAmount: isPayment ? amount : null,
      providerAmount: isProvider ? amount : null,
      balance,
      installmentPercent: e.installmentPercent ?? null,
      groupPercent: groupTotal,
      canAddInstallment: !isPayment && !isProvider && groupTotal != null && groupTotal < 100
    };
  });

  return result.reverse();
});
</script>
