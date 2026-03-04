<template>
  <div
    class="bg-go-surface rounded-go-md border p-4"
    :class="isPayment ? 'border-go-success/50' : 'border-go-border'"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-medium">{{ expense.title }}</h4>
          <span
            v-if="isPayment"
            class="text-xs px-2 py-0.5 rounded-full font-semibold bg-go-success-muted text-go-success"
          >
            Pago
          </span>
        </div>
        <p v-if="expense.description" class="text-go-text-tertiary text-sm mt-1">{{ expense.description }}</p>
      </div>
      <span
        class="font-semibold text-lg ml-4 whitespace-nowrap"
        :class="isPayment ? 'text-go-success' : 'text-go-primary'"
      >
        {{ isPayment ? '+' : '' }}{{ formatPrice(expense.amount) }}
      </span>
    </div>

    <!-- Items breakdown -->
    <div v-if="expense.items && expense.items.length" class="mt-3 ml-1 pl-3 border-l-2 border-go-border/50">
      <div
        v-for="(item, idx) in expense.items"
        :key="idx"
        class="flex justify-between text-sm py-0.5"
      >
        <span class="text-go-text-tertiary">{{ item.name }}</span>
        <span v-if="item.amount" class="text-go-text ml-4">{{ formatPrice(item.amount) }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap items-center gap-3 mt-3 text-sm">
      <span
        class="px-2 py-0.5 rounded-full text-xs font-medium"
        :style="getCategoryStyles(expense.category, categories)"
      >
        {{ getCategoryLabel(expense.category, categories) }}
      </span>

      <span class="text-go-text-muted">
        {{ formatExpenseDate(expense.date || expense.createdAt) }}
      </span>

      <span v-if="expense.paymentMethod" class="text-go-text-muted text-xs">
        {{ getPaymentMethodLabel(expense.paymentMethod) }}
      </span>

      <span v-if="expense.recipientName" class="text-go-text-muted text-xs">
        → {{ expense.recipientName }}{{ expense.recipientPlatform ? ` (${expense.recipientPlatform})` : '' }}
      </span>

      <!-- Payment status for expenses (not for standalone payments) -->
      <span
        v-if="!isPayment && expense.linkedPaymentId"
        class="text-xs text-go-success ml-auto"
      >
        Pagado
      </span>
      <span
        v-else-if="!isPayment && expense.paymentStatus === 'pending'"
        class="text-xs text-go-danger ml-auto"
      >
        Pendiente
      </span>
    </div>
  </div>
</template>

<script setup>
import { formatPrice, getCategoryStyles, getCategoryLabel, getPaymentMethodLabel } from '~/utils';

const props = defineProps({
  expense: { type: Object, required: true },
  categories: { type: Array, default: () => [] }
});

const isPayment = computed(() => props.expense.type === 'payment');

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
