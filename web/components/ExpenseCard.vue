<template>
  <div
    class="bg-surface rounded-lg border p-4"
    :class="cardBorderClass"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-medium">{{ expense.title }}</h4>
          <span
            v-if="expense.type === 'payment'"
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-400"
          >
            Pago
          </span>
          <span
            v-else-if="expense.type === 'provider_expense'"
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-500/20 text-gray-400"
          >
            Propio
          </span>
          <span
            v-if="expense.paymentStatus === 'pending'"
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400"
          >
            Pendiente
          </span>
        </div>
        <p v-if="expense.description" class="text-gray-400 text-sm mt-1">{{ expense.description }}</p>
        <p v-if="expense.items && expense.items.length" class="text-gray-500 text-xs mt-1">
          {{ expense.items.length }} items
        </p>
      </div>
      <div class="flex items-center gap-2 ml-4">
        <span
          class="font-semibold text-lg whitespace-nowrap"
          :class="amountColorClass"
        >
          {{ expense.type === 'payment' ? '+' : '' }}{{ formatPrice(expense.amount) }}
        </span>
        <button
          v-if="editable"
          @click="$emit('edit', expense)"
          class="text-gray-500 hover:text-white p-1 transition-colors"
          title="Editar"
        >
          <MdiPencil class="text-base" />
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 mt-3 text-sm">
      <span
        class="px-2 py-0.5 rounded-full text-xs font-medium"
        :style="getCategoryStyles(expense.category)"
      >
        {{ getCategoryLabel(expense.category) }}
      </span>

      <span class="text-gray-500">
        {{ formatExpenseDate(expense.date || expense.createdAt) }}
      </span>

      <span v-if="expense.paymentMethod" class="text-gray-400 text-xs">
        {{ getPaymentMethodLabel(expense.paymentMethod) }}
      </span>

      <span v-if="expense.source === 'whatsapp'" class="text-green-500 text-xs">
        WhatsApp
      </span>

      <span v-if="expense.imageUrl" class="text-gray-500 text-xs cursor-pointer hover:text-white" @click="$emit('viewImage', expense.imageUrl)">
        Foto
      </span>

      <button
        v-if="canMarkPaid"
        @click="$emit('markPaid', expense)"
        class="ml-auto text-xs px-2 py-0.5 rounded-full border border-green-600 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1"
      >
        <MdiCheck class="text-sm" />
        Marcar pagado
      </button>

      <button
        v-if="canMarkPending"
        @click="$emit('markPending', expense)"
        class="ml-auto text-xs px-2 py-0.5 rounded-full border border-gray-600 text-gray-400 hover:bg-gray-500/20 transition-colors flex items-center gap-1"
      >
        <MdiUndoVariant class="text-sm" />
        Marcar pendiente
      </button>
    </div>
  </div>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiCheck from '~icons/mdi/check';
import MdiUndoVariant from '~icons/mdi/undo-variant';
import { formatPrice, getCategoryStyles, getCategoryLabel, getPaymentMethodLabel } from '~/utils';

const props = defineProps({
  expense: { type: Object, required: true },
  editable: { type: Boolean, default: false }
});

defineEmits(['viewImage', 'edit', 'markPaid', 'markPending']);

const canMarkPaid = computed(() =>
  props.editable
  && props.expense.type === 'expense'
  && props.expense.paymentStatus === 'pending'
);

const canMarkPending = computed(() =>
  props.editable
  && props.expense.type === 'expense'
  && props.expense.paymentStatus === 'paid'
  && props.expense.linkedPaymentId
);

const cardBorderClass = computed(() => {
  if (props.expense.type === 'payment') return 'border-green-700/50';
  if (props.expense.type === 'provider_expense') return 'border-gray-600';
  return 'border-gray-700';
});

const amountColorClass = computed(() => {
  if (props.expense.type === 'payment') return 'text-green-400';
  if (props.expense.type === 'provider_expense') return 'text-gray-400';
  return 'text-primary';
});

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit'
  });
}
</script>
