<template>
  <div class="bg-surface rounded-lg border border-gray-700 p-4">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="font-medium">{{ expense.title }}</h4>
        <p v-if="expense.description" class="text-gray-400 text-sm mt-1">{{ expense.description }}</p>
      </div>
      <span class="text-primary font-semibold text-lg ml-4 whitespace-nowrap">
        {{ formatPrice(expense.amount) }}
      </span>
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

      <span v-if="expense.source === 'whatsapp'" class="text-green-500 text-xs">
        WhatsApp
      </span>

      <span v-if="expense.imageUrl" class="text-gray-500 text-xs cursor-pointer hover:text-white" @click="$emit('viewImage', expense.imageUrl)">
        Foto
      </span>
    </div>
  </div>
</template>

<script setup>
import { formatPrice, getCategoryStyles, getCategoryLabel } from '~/utils';

defineProps({
  expense: { type: Object, required: true }
});

defineEmits(['viewImage']);

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit'
  });
}
</script>
