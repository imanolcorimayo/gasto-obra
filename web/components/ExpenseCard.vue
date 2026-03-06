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
            v-if="expense.scopeType === 'addition'"
            class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm"
            :style="getScopeTypeStyles('addition')"
          >
            Agregado
          </span>
          <span
            v-if="expense.type === 'expense' && expense.installmentPercent != null && expense.installmentPercent < 100"
            class="text-[11px] font-semibold px-2 py-0.5 rounded-go-sm tabular-nums"
            :class="expense.installmentPercent === 0 ? 'bg-go-danger-muted text-go-danger' : 'bg-go-info/15 text-go-info'"
          >
            {{ expense.installmentPercent }}%
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
        v-if="canAddInstallment"
        @click="$emit('addInstallment', expense)"
        class="ml-auto text-go-text-muted hover:text-go-info transition-colors p-1 rounded-go-sm hover:bg-go-surface-alt flex items-center gap-1 text-xs"
      >
        <MdiPlus class="text-sm" />
        <span class="hidden sm:inline">Pago restante</span>
      </button>

    </div>
  </div>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiPlus from '~icons/mdi/plus';
import { formatPrice, getCategoryStyles, getCategoryLabel, getPaymentMethodLabel, getScopeTypeStyles } from '~/utils';

const props = defineProps({
  expense: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] }
});

defineEmits(['viewImage', 'edit', 'addInstallment']);

const canAddInstallment = computed(() =>
  props.editable
  && props.expense.type === 'expense'
  && props.expense.installmentPercent != null
  && props.expense.installmentPercent < 100
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
