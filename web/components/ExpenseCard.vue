<template>
  <div
    class="bg-go-surface rounded-go-md border border-go-border p-4 transition-all duration-200"
    :class="accentClass"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-go-text">{{ expense.title }}</h4>
          <span
            v-if="expense.type === 'payment'"
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm bg-go-secondary/20 text-go-secondary"
          >
            Pago
          </span>
          <span
            v-else-if="expense.type === 'provider_expense'"
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm bg-go-text-muted/20 text-go-text-muted"
          >
            Propio
          </span>
          <span
            v-if="expense.paymentStatus === 'pending'"
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm bg-go-danger-muted text-go-danger"
          >
            Pendiente
          </span>
          <span
            v-if="expense.paymentStatus === 'paid' && expense.type === 'expense'"
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm bg-go-success-muted text-go-success"
          >
            Pagado
          </span>
        </div>
        <p v-if="expense.description" class="text-go-text-tertiary text-sm mt-1">{{ expense.description }}</p>
        <p v-if="expense.items && expense.items.length" class="text-go-text-muted text-xs mt-1">
          {{ expense.items.length }} items
        </p>
      </div>
      <div class="flex items-center gap-1 ml-4">
        <span
          class="font-display font-bold text-lg whitespace-nowrap tabular-nums"
          :class="amountColorClass"
        >
          {{ expense.type === 'payment' ? '+' : '' }}{{ formatPrice(expense.amount) }}
        </span>
        <button
          v-if="editable"
          @click="$emit('edit', expense)"
          class="text-go-text-muted hover:text-go-text transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt"
          title="Editar"
        >
          <MdiPencil class="text-base" />
        </button>
      </div>
    </div>

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

      <span v-if="expense.recipientName" class="text-go-text-tertiary text-xs">
        &rarr; {{ expense.recipientName }}
      </span>

      <span v-if="expense.source === 'whatsapp'" class="text-go-success text-xs">
        WhatsApp
      </span>

      <span v-if="expense.imageUrl" class="text-go-text-muted text-xs cursor-pointer hover:text-go-text transition-colors" @click="$emit('viewImage', expense.imageUrl)">
        Foto
      </span>

      <button
        v-if="canMarkPaid"
        @click="$emit('markPaid', expense)"
        class="ml-auto text-go-text-muted hover:text-go-success transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt flex items-center gap-1 text-xs"
      >
        <MdiCheck class="text-sm" />
        <span class="hidden sm:inline">Marcar pagado</span>
      </button>

      <button
        v-if="canMarkPending"
        @click="$emit('markPending', expense)"
        class="ml-auto text-go-text-muted hover:text-go-text transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt flex items-center gap-1 text-xs"
      >
        <MdiUndoVariant class="text-sm" />
        <span class="hidden sm:inline">Marcar pendiente</span>
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
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] }
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

const accentClass = computed(() => {
  if (props.expense.type === 'payment') return 'border-l-[3px] border-l-go-secondary';
  if (props.expense.type === 'provider_expense') return 'border-l-[3px] border-l-go-info';
  return 'border-l-[3px] border-l-go-primary';
});

const amountColorClass = computed(() => {
  if (props.expense.type === 'payment') return 'text-go-secondary';
  if (props.expense.type === 'provider_expense') return 'text-go-info';
  return 'text-go-primary';
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
