<template>
  <div
    class="bg-go-surface rounded-go-md border border-go-border p-4 cursor-pointer"
    :class="isPayment ? 'border-l-[3px] border-l-go-secondary' : 'border-l-[3px] border-l-go-primary'"
    @click="$emit('viewDetail', expense)"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-go-text">{{ expense.title }}</h4>
          <span
            v-if="isPayment"
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm bg-go-secondary/20 text-go-secondary"
          >
            Pago
          </span>
          <span
            v-if="expense.scopeType === 'addition'"
            class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm"
            :style="getScopeTypeStyles('addition')"
          >
            Agregado
          </span>
          <span
            v-if="!isPayment && expense.installmentPercent != null && expense.installmentPercent < 100"
            class="text-[11px] font-semibold px-2 py-0.5 rounded-go-sm"
            :class="expense.installmentPercent === 0 ? 'bg-go-danger-muted text-go-danger' : 'bg-go-info/15 text-go-info tabular-nums'"
          >
            {{ expense.installmentPercent === 0 ? 'Descontado del balance' : `${expense.installmentPercent}%` }}
          </span>
        </div>
        <p v-if="expense.description" class="text-go-text-tertiary text-sm mt-1">{{ expense.description }}</p>
      </div>
      <span
        class="font-display font-bold text-lg ml-4 whitespace-nowrap tabular-nums"
        :class="isPayment ? 'text-go-secondary' : 'text-go-primary'"
      >
        {{ isPayment ? '+' : '' }}{{ formatPrice(expense.amount) }}
      </span>
    </div>

    <!-- Items breakdown -->
    <div v-if="expense.items && expense.items.length">
      <div class="mt-3 ml-1 pl-3 border-l-2 border-go-border/50">
        <div
          v-for="(item, idx) in expense.items"
          :key="idx"
          class="flex justify-between text-sm py-0.5"
        >
          <span class="text-go-text-tertiary">{{ item.name }}</span>
          <span v-if="item.amount" class="text-go-text ml-4 tabular-nums">{{ formatPrice(item.amount) }}</span>
        </div>
      </div>
      <div v-if="itemsTotalMismatch" class="flex items-start gap-2 mt-3 p-2.5 rounded-go-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
        <MdiAlertCircleOutline class="text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div class="text-xs text-amber-800 dark:text-amber-300">
          <span class="font-semibold">La suma de items no coincide con el total</span>
          <p class="mt-0.5 text-amber-700 dark:text-amber-400">Items: {{ formatPrice(itemsTotalMismatch.itemsSum) }} · Total: {{ formatPrice(itemsTotalMismatch.total) }} · Diferencia: {{ formatPrice(itemsTotalMismatch.diff) }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center gap-3 mt-3 text-sm flex-wrap">
      <span
        class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm"
        :style="getCategoryStyles(expense.category, categories)"
      >
        {{ getCategoryLabel(expense.category, categories) }}
      </span>

      <span class="text-go-text-muted text-xs tabular-nums">
        {{ formatExpenseDate(expense.date || expense.createdAt) }}
      </span>

      <span v-if="expense.paymentMethod" class="text-go-text-tertiary text-xs">
        {{ getPaymentMethodLabel(expense.paymentMethod) }}
      </span>

      <span v-if="expense.vendor" class="text-go-text-tertiary text-xs">
        {{ expense.vendor }}
      </span>

      <span v-if="expense.recipientName" class="text-go-text-tertiary text-xs">
        &rarr; {{ expense.recipientName }}{{ expense.recipientPlatform ? ` (${expense.recipientPlatform})` : '' }}
      </span>

      <span v-if="expense.managementFeePercent" class="text-go-text-muted text-xs">
        incl. {{ expense.managementFeePercent }}% gestión
      </span>
    </div>
  </div>
</template>

<script setup>
import MdiAlertCircleOutline from '~icons/mdi/alert-circle-outline';
import { formatPrice, getCategoryStyles, getCategoryLabel, getPaymentMethodLabel, getScopeTypeStyles } from '~/utils';

const props = defineProps({
  expense: { type: Object, required: true },
  categories: { type: Array, default: () => [] }
});

defineEmits(['viewDetail']);

const isPayment = computed(() => props.expense.type === 'payment');

const itemsTotalMismatch = computed(() => {
  const e = props.expense;
  if (!e?.items || e.items.length <= 1) return null;
  const itemsSum = e.items.reduce((sum, i) => sum + (i.amount || 0), 0);
  if (itemsSum === 0) return null;
  const total = e.amountBase || e.amount;
  const diff = Math.abs(total - itemsSum);
  if (diff <= 1) return null;
  return { itemsSum, total, diff };
});

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
</script>
