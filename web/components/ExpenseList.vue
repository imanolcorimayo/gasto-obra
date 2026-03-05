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
        <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Estado</span>
        <select
          v-model="selectedPaymentStatus"
          class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
        >
          <option v-for="ps in paymentStatusFilters" :key="ps.value" :value="ps.value">
            {{ ps.label }}
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
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Categoria</th>
            <th v-if="hasAdditions" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Alcance</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 px-3">Estado</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Gasto</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Pago</th>
            <th v-if="hasProviderExpenses" class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Propio</th>
            <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Saldo</th>
            <th v-if="editable" class="pb-2 pl-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableRows"
            :key="row.id"
            class="border-b border-go-border-subtle hover:bg-go-surface/50 transition-colors group"
            :class="{ 'cursor-pointer': editable }"
            @click="editable && $emit('edit', row.expense)"
          >
            <td class="py-3 pr-3 text-go-text-muted text-xs tabular-nums whitespace-nowrap">{{ row.date }}</td>
            <td class="py-3 pr-3 text-go-text">
              <span>{{ row.title }}</span>
              <span v-if="row.items" class="text-go-text-muted text-xs ml-1">({{ row.items }} items)</span>
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
            <td class="py-3 px-3 whitespace-nowrap">
              <button
                v-if="editable && row.paymentStatus === 'pending' && !row.isPayment && !row.isProvider"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm bg-go-warning/15 text-go-warning hover:bg-go-warning/25 transition-colors"
                @click.stop="$emit('markPaid', row.expense)"
              >Pendiente</button>
              <button
                v-else-if="editable && row.paymentStatus === 'paid' && !row.isPayment && !row.isProvider && row.expense.linkedPaymentId"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm bg-go-success/15 text-go-success hover:bg-go-success/25 transition-colors"
                @click.stop="$emit('markPending', row.expense)"
              >Pagado</button>
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
            <td v-if="editable" class="py-3 pl-3 text-right">
              <MdiPencil class="text-sm text-go-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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
import { DEFAULT_EXPENSE_CATEGORIES, formatPrice, getScopeTypeStyles, getCategoryLabel } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

defineEmits(['edit', 'markPaid', 'markPending']);

const selectedCategory = ref('');
const selectedType = ref('');
const selectedPaymentStatus = ref('');
const selectedScopeType = ref('');

const typeFilters = [
  { value: '', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'payment', label: 'Pagos' },
  { value: 'provider_expense', label: 'Propios' }
];

const paymentStatusFilters = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pagados' },
  { value: 'pending', label: 'Pendientes' }
];

const scopeTypeFilters = [
  { value: '', label: 'Todos' },
  { value: 'original', label: 'Entrega' },
  { value: 'addition', label: 'Agregados' }
];

const allCategories = computed(() => [
  { value: '', label: 'Todas' },
  ...resolvedCategories.value
]);

const hasActiveFilters = computed(() =>
  selectedType.value || selectedPaymentStatus.value || selectedCategory.value || selectedScopeType.value
);

function clearFilters() {
  selectedType.value = '';
  selectedPaymentStatus.value = '';
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

  if (selectedPaymentStatus.value) {
    if (selectedPaymentStatus.value === 'paid') {
      result = result.filter(e => !e.paymentStatus || e.paymentStatus === 'paid');
    } else {
      result = result.filter(e => e.paymentStatus === selectedPaymentStatus.value);
    }
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

const tableRows = computed(() => {
  const sorted = [...filteredExpenses.value].sort((a, b) => getTimestamp(a) - getTimestamp(b));

  let balance = 0;
  const result = sorted.map(e => {
    const isPayment = e.type === 'payment';
    const isProvider = e.type === 'provider_expense';
    const amount = e.amount || 0;

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
      paymentStatus: e.paymentStatus,
      isPayment,
      isProvider,
      expenseAmount: (!isPayment && !isProvider) ? amount : null,
      paymentAmount: isPayment ? amount : null,
      providerAmount: isProvider ? amount : null,
      balance
    };
  });

  return result.reverse();
});
</script>
