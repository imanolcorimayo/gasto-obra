<template>
  <div
    class="bg-go-surface rounded-go-md border border-go-border px-4 py-3 cursor-pointer hover:bg-go-surface-alt/50 transition-colors"
    :class="isPayment ? 'border-l-[3px] border-l-go-secondary' : 'border-l-[3px] border-l-go-primary'"
    @click="$emit('viewDetail', expense)"
  >
    <div class="flex gap-3">
      <!-- Media indicator: always present, same size for all types -->
      <div class="shrink-0 w-12 h-12 rounded-go-sm overflow-hidden">
        <!-- Image thumbnail -->
        <img
          v-if="expense.imageUrl"
          :src="expense.imageUrl"
          alt="Comprobante"
          class="w-full h-full object-cover"
        />
        <!-- PDF icon -->
        <div
          v-else-if="expense.fileUrl"
          class="w-full h-full bg-red-500/10 border border-red-500/20 rounded-go-sm flex items-center justify-center"
        >
          <MdiFilePdfBox class="text-xl text-red-500" />
        </div>
        <!-- Audio icon -->
        <div
          v-else-if="expense.audioUrl"
          class="w-full h-full bg-violet-500/10 border border-violet-500/20 rounded-go-sm flex items-center justify-center"
        >
          <MdiMicrophone class="text-xl text-violet-500" />
        </div>
        <!-- Text-only -->
        <div
          v-else
          class="w-full h-full bg-go-surface-alt border border-go-border-subtle rounded-go-sm flex items-center justify-center"
        >
          <MdiTextBox class="text-xl text-go-text-muted" />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-medium text-go-text text-sm truncate">{{ expense.title }}</h4>
              <span
                v-if="isPayment"
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-go-sm bg-go-secondary/20 text-go-secondary shrink-0"
              >Pago</span>
              <span
                v-if="expense.scopeType === 'addition'"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm shrink-0"
                :style="getScopeTypeStyles('addition')"
              >Agregado</span>
              <span
                v-if="!isPayment && expense.installmentPercent != null && expense.installmentPercent < 100"
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-go-sm shrink-0"
                :class="expense.installmentPercent === 0 ? 'bg-go-danger-muted text-go-danger' : 'bg-go-info/15 text-go-info tabular-nums'"
              >{{ expense.installmentPercent === 0 ? 'Desc. balance' : `${expense.installmentPercent}%` }}</span>
            </div>
          </div>
          <span
            class="font-display font-bold text-base whitespace-nowrap tabular-nums shrink-0"
            :class="isPayment ? 'text-go-secondary' : 'text-go-primary'"
          >{{ isPayment ? '+' : '' }}{{ formatPrice(expense.amount) }}</span>
        </div>

        <!-- Compact footer: category + date + items -->
        <div class="flex items-center gap-2 mt-1.5">
          <span
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-go-sm"
            :style="getCategoryStyles(expense.category, categories)"
          >{{ getCategoryLabel(expense.category, categories) }}</span>

          <span class="text-go-text-muted text-[11px] tabular-nums">
            {{ formatExpenseDate(expense.date || expense.createdAt) }}
          </span>

          <span v-if="expense.items && expense.items.length > 1" class="text-go-text-muted text-[11px]">
            {{ expense.items.length }} items
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiMicrophone from '~icons/mdi/microphone';
import MdiTextBox from '~icons/mdi/text-box-outline';
import { formatPrice, getCategoryStyles, getCategoryLabel, getScopeTypeStyles } from '~/utils';

const props = defineProps({
  expense: { type: Object, required: true },
  categories: { type: Array, default: () => [] }
});

defineEmits(['viewDetail']);

const isPayment = computed(() => props.expense.type === 'payment');

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit'
  });
}
</script>
