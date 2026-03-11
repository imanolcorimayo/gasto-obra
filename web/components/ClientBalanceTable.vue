<template>
  <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-display font-semibold text-go-text">Movimientos</h3>
      <span v-if="rows.length" class="text-xs text-go-text-muted tabular-nums">{{ rows.length }} registros</span>
    </div>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-go-border">
          <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Fecha</th>
          <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-left pb-2 pr-3">Concepto</th>
          <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Gasto</th>
          <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Pago</th>
          <th class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted text-right pb-2 pl-3">Saldo</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="idx"
          class="border-b border-go-border-subtle hover:bg-go-surface/50 transition-colors cursor-pointer"
          @click="$emit('viewDetail', row.rawExpense)"
        >
          <td class="py-3 pr-3 text-go-text-muted text-xs tabular-nums whitespace-nowrap">{{ row.date }}</td>
          <td class="py-3 pr-3 text-go-text">
            <span>{{ row.title }}</span>
            <span v-if="row.items" class="text-go-text-muted text-xs ml-1">({{ row.items }} items)</span>
            <span
              v-if="row.scopeType === 'addition'"
              class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm ml-1.5 align-middle"
              :style="getScopeTypeStyles('addition')"
            >Agregado</span>
          </td>
          <td class="py-3 pl-3 text-right whitespace-nowrap">
            <span v-if="row.expense" class="tabular-nums font-medium text-go-primary">{{ formatPrice(row.expense) }}</span>
          </td>
          <td class="py-3 pl-3 text-right whitespace-nowrap">
            <span v-if="row.payment" class="tabular-nums font-medium text-go-secondary">{{ formatPrice(row.payment) }}</span>
          </td>
          <td
            class="py-3 pl-3 text-right whitespace-nowrap tabular-nums font-semibold"
            :class="row.balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >
            {{ formatPrice(row.balance) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="rows.length === 0" class="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <p class="font-display text-go-text-secondary">Sin registros</p>
      <p class="text-go-text-muted text-sm mt-1">No hay registros todavía.</p>
    </div>
    </div>
  </div>
</template>

<script setup>
import { formatPrice, getScopeTypeStyles } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] }
});

defineEmits(['viewDetail']);

function getTimestamp(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return 0;
  if (raw.toDate) return raw.toDate().getTime();
  return new Date(raw).getTime();
}

function formatDate(timestamp) {
  const raw = timestamp.date || timestamp.createdAt;
  if (!raw) return '';
  const date = raw.toDate ? raw.toDate() : new Date(raw);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit'
  });
}

const rows = computed(() => {
  // Calculate balance chronologically (oldest first), then reverse for display
  const sorted = [...props.expenses].sort((a, b) => getTimestamp(a) - getTimestamp(b));

  let balance = 0;
  const result = sorted.map(e => {
    const isPayment = e.type === 'payment';
    const amount = e.amount || 0;

    if (isPayment) {
      balance += amount;
    } else {
      balance -= amount;
    }

    return {
      date: formatDate(e),
      title: e.title,
      items: e.items?.length || 0,
      scopeType: e.scopeType || 'original',
      expense: isPayment ? null : amount,
      payment: isPayment ? amount : null,
      balance,
      rawExpense: e
    };
  });

  return result.reverse();
});
</script>
