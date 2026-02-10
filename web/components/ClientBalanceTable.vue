<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-gray-500 border-b border-gray-700">
          <th class="pb-2 pr-3 font-medium">Fecha</th>
          <th class="pb-2 pr-3 font-medium">Concepto</th>
          <th class="pb-2 pl-3 font-medium text-right">Gasto</th>
          <th class="pb-2 pl-3 font-medium text-right">Pago</th>
          <th class="pb-2 pl-3 font-medium text-right">Saldo</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="idx"
          class="border-b border-gray-800"
        >
          <td class="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{{ row.date }}</td>
          <td class="py-2.5 pr-3 text-gray-300">
            <span>{{ row.title }}</span>
            <span v-if="row.items" class="text-gray-600 text-xs ml-1">({{ row.items }} items)</span>
          </td>
          <td class="py-2.5 pl-3 text-right whitespace-nowrap">
            <span v-if="row.expense" class="text-primary">{{ formatPrice(row.expense) }}</span>
          </td>
          <td class="py-2.5 pl-3 text-right whitespace-nowrap">
            <span v-if="row.payment" class="text-green-400">{{ formatPrice(row.payment) }}</span>
          </td>
          <td
            class="py-2.5 pl-3 text-right font-medium whitespace-nowrap"
            :class="row.balance >= 0 ? 'text-green-400' : 'text-red-400'"
          >
            {{ formatPrice(row.balance) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="rows.length === 0" class="text-center text-gray-500 py-8">
      No hay registros todavia.
    </div>
  </div>
</template>

<script setup>
import { formatPrice } from '~/utils';

const props = defineProps({
  expenses: { type: Array, default: () => [] }
});

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
      expense: isPayment ? null : amount,
      payment: isPayment ? amount : null,
      balance
    };
  });

  return result.reverse();
});
</script>
