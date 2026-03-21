<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">Calculá tu balance</h3>
          <p class="text-go-text-muted text-xs mt-0.5">Marcá los gastos que son "de paso" (plata que recibís del cliente pero va directo a compras)</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Filter -->
        <div class="mb-3 flex gap-2">
          <div class="relative flex-1">
            <MdiMagnify class="absolute left-2.5 top-1/2 -translate-y-1/2 text-go-text-muted text-base" />
            <input
              v-model="filterText"
              type="text"
              placeholder="Buscar por título, categoría..."
              class="w-full pl-8 pr-3 py-2 text-sm border border-go-border rounded-go-md bg-go-surface focus:outline-none focus:border-go-primary text-go-text placeholder:text-go-text-muted"
            />
          </div>
          <button
            @click="selectAll"
            class="text-xs px-3 py-2 rounded-go-md border border-go-border text-go-text-muted hover:text-go-text hover:border-go-text-muted transition-colors whitespace-nowrap"
          >{{ allFilteredSelected ? 'Deseleccionar' : 'Seleccionar' }} todo</button>
        </div>

        <!-- Pre-selection hint -->
        <p v-if="preSelectedCount > 0 && !hasInteracted" class="text-xs text-go-text-muted mb-3 px-1">
          <MdiAutoFix class="inline text-go-primary text-sm align-text-bottom" />
          Se pre-seleccionaron <strong>{{ preSelectedCount }}</strong> gastos que parecen ser de materiales/compras.
        </p>

        <!-- Expense list -->
        <div v-if="filteredExpenses.length === 0" class="text-center py-8">
          <p class="text-go-text-muted text-sm">
            {{ expenses.length === 0 ? 'No hay gastos cargados.' : 'No se encontraron gastos con ese filtro.' }}
          </p>
        </div>

        <div v-else class="flex flex-col gap-1 max-h-80 overflow-y-auto">
          <label
            v-for="expense in filteredExpenses"
            :key="expense.id"
            class="flex items-start gap-3 p-3 rounded-go-md border transition-colors cursor-pointer"
            :class="selected.has(expense.id)
              ? 'border-go-primary bg-go-primary/5'
              : 'border-go-border hover:border-go-text-muted'"
          >
            <input
              type="checkbox"
              :checked="selected.has(expense.id)"
              @change="toggleExpense(expense.id)"
              class="accent-go-primary w-4 h-4 flex-shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm text-go-text truncate">{{ expense.title }}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: getCategoryColor(expense.category || 'otros', categories) + '20', color: getCategoryColor(expense.category || 'otros', categories) }"
                >{{ getCategoryLabel(expense.category || 'otros', categories) }}</span>
              </div>
              <span class="text-xs text-go-text-muted tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
            </div>
            <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">
              {{ formatPrice(expense.amount) }}
            </span>
          </label>
        </div>

        <!-- Selection summary -->
        <div v-if="filteredExpenses.length > 0" class="mt-3 pt-3 border-t border-go-border flex items-center justify-between text-sm">
          <span class="text-go-text-muted">{{ selected.size }} de {{ expenses.length }} marcados como pass-through</span>
          <span class="font-display font-bold tabular-nums text-go-primary">{{ formatPrice(selectedTotal) }}</span>
        </div>
      </div>

      <div class="modal-footer flex-col sm:flex-row">
        <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">
          Cancelar
        </button>
        <button type="button" @click="handleSave" :disabled="isSaving" class="btn-primary flex items-center justify-center gap-2 order-1 sm:order-2">
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Calcular balance
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiMagnify from '~icons/mdi/magnify';
import MdiAutoFix from '~icons/mdi/auto-fix';
import { formatPrice, getCategoryLabel, getCategoryColor } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  expenses: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'save']);

const selected = ref(new Set());
const isSaving = ref(false);
const filterText = ref('');
const hasInteracted = ref(false);
const preSelectedCount = ref(0);

// Keywords that suggest a pass-through expense (Argentine construction)
const PASSTHROUGH_KEYWORDS = [
  'material', 'materiales', 'cemento', 'arena', 'cal', 'pintura',
  'ferretería', 'ferreteria', 'cerámico', 'ceramico', 'porcelanato',
  'azulejo', 'caño', 'cañería', 'cañeria', 'cable', 'membrana',
  'madera', 'melamina', 'vidrio', 'grifería', 'griferia', 'sanitario',
  'inodoro', 'pegamento', 'pastina', 'fijador', 'sellador',
  'tornillo', 'clavo', 'durlock', 'placa', 'perfil', 'chapa'
];

function matchesPassThrough(expense) {
  // Category match
  if ((expense.category || '').toLowerCase() === 'materiales') return true;

  // Keyword match in title or description
  const text = `${expense.title || ''} ${expense.description || ''}`.toLowerCase();
  return PASSTHROUGH_KEYWORDS.some(kw => text.includes(kw));
}

const filteredExpenses = computed(() => {
  if (!filterText.value.trim()) return props.expenses;

  const q = filterText.value.toLowerCase().trim();
  return props.expenses.filter(e => {
    const title = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const cat = getCategoryLabel(e.category || 'otros', props.categories).toLowerCase();
    return title.includes(q) || desc.includes(q) || cat.includes(q);
  });
});

const selectedTotal = computed(() => {
  return props.expenses
    .filter(e => selected.value.has(e.id))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
});

const allFilteredSelected = computed(() => {
  if (filteredExpenses.value.length === 0) return false;
  return filteredExpenses.value.every(e => selected.value.has(e.id));
});

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    isSaving.value = false;
    filterText.value = '';
    hasInteracted.value = false;

    // Initialize selection: previously saved passThrough OR auto-detect
    const hasSavedPassThrough = props.expenses.some(e => e.passThrough === true || e.passThrough === false);

    if (hasSavedPassThrough) {
      // Use saved state
      selected.value = new Set(
        props.expenses.filter(e => e.passThrough === true).map(e => e.id)
      );
      preSelectedCount.value = 0;
    } else {
      // Auto-detect based on keywords
      const autoSelected = props.expenses.filter(e => matchesPassThrough(e));
      selected.value = new Set(autoSelected.map(e => e.id));
      preSelectedCount.value = autoSelected.length;
    }
  }
});

function toggleExpense(id) {
  hasInteracted.value = true;
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selected.value = s;
}

function selectAll() {
  hasInteracted.value = true;
  if (allFilteredSelected.value) {
    const s = new Set(selected.value);
    for (const e of filteredExpenses.value) s.delete(e.id);
    selected.value = s;
  } else {
    const s = new Set(selected.value);
    for (const e of filteredExpenses.value) s.add(e.id);
    selected.value = s;
  }
}

function handleSave() {
  isSaving.value = true;
  emit('save', [...selected.value]);
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
