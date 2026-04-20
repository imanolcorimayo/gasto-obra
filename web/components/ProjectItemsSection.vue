<template>
  <section class="mb-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 gap-3">
      <div class="flex items-baseline gap-2 min-w-0">
        <h2 class="font-display font-semibold text-go-text">Items</h2>
        <span v-if="itemStore.items.length > 0" class="text-xs text-go-text-muted">
          · {{ itemStore.items.length }}{{ itemStore.items.length === 1 ? ' item' : ' items' }}
        </span>
      </div>
      <button
        v-if="!readonly"
        @click="openCreate"
        class="btn-primary text-sm flex items-center gap-1.5 shrink-0"
      >
        <MdiPlus class="text-base" />
        <span class="hidden sm:inline">Agregar item</span>
        <span class="sm:hidden">Agregar</span>
      </button>
    </div>

    <!-- Sin asignar badge (provider only) -->
    <button
      v-if="!readonly && itemStore.items.length > 0 && unassignedExpenses.length > 0"
      @click="showUnassignedModal = true"
      class="w-full flex items-center gap-3 px-4 py-2.5 bg-go-surface border border-go-border rounded-go-md border-l-[3px] border-l-go-warning text-left hover:bg-go-surface-alt/50 transition-colors group mb-3"
    >
      <span class="text-sm text-go-text flex-1">
        {{ unassignedExpenses.length === 1 ? '1 gasto sin asignar a un item' : `${unassignedExpenses.length} gastos sin asignar a un item` }}
      </span>
      <span class="font-display font-semibold text-sm tabular-nums text-go-text">{{ formatPrice(unassignedTotal) }}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted group-hover:text-go-text transition-colors flex-shrink-0"><path d="m9 18 6-6-6-6"/></svg>
    </button>

    <!-- Empty state -->
    <div
      v-if="itemStore.items.length === 0"
      class="bg-go-surface border border-dashed border-go-border rounded-go-xl px-4 py-8 text-center"
    >
      <MdiViewList class="text-3xl text-go-text-muted/50 mx-auto mb-2" />
      <p class="font-display text-go-text-secondary">Sin items todavía</p>
      <p class="text-sm text-go-text-muted mt-1 max-w-md mx-auto">
        Dividí la obra en partes (ej: "Remodelación del baño", "Cocina") para hacer seguimiento del progreso y presupuesto por etapa.
      </p>
      <button
        v-if="!readonly"
        @click="openCreate"
        class="btn-secondary text-sm mt-4 inline-flex items-center gap-1.5"
      >
        <MdiPlus class="text-base" />
        Agregar primer item
      </button>
    </div>

    <!-- Items list -->
    <template v-else>
      <!-- Aggregate progress bar -->
      <div class="bg-go-surface border border-go-border rounded-go-xl px-4 py-3 mb-3">
        <div class="flex items-center justify-between mb-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-go-text-muted">Progreso</span>
            <span class="font-display font-semibold text-go-text tabular-nums">{{ progressLabel }}%</span>
          </div>
          <div class="text-go-text-muted tabular-nums text-xs">
            {{ itemStore.completedItems.length }} / {{ itemStore.items.length }} completados
          </div>
        </div>
        <div class="w-full bg-go-surface-alt rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all duration-500"
            :class="progressBarColor"
            :style="{ width: progressBarWidth }"
          ></div>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-go-text-muted tabular-nums">
          <span>{{ formatPrice(itemStore.completedBudget) }} completado</span>
          <span>de {{ formatPrice(itemStore.totalBudget) }}</span>
        </div>
        <div v-if="itemStore.hasMaterialsRange" class="text-[10px] text-go-text-muted/80 mt-1 italic text-right tabular-nums">
          Materiales estimados entre {{ formatPrice(itemStore.totalBudgetRange.min) }} y {{ formatPrice(itemStore.totalBudgetRange.max) }}
        </div>
      </div>

      <!-- Item cards -->
      <div class="space-y-2">
        <div
          v-for="item in itemStore.items"
          :key="item.id"
          class="bg-go-surface border border-go-border rounded-go-xl px-4 py-3 hover:border-go-border-strong transition-colors"
        >
          <!-- Header row -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-display font-semibold text-go-text">{{ item.name }}</h3>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  :class="statusClasses(item)"
                >
                  {{ statusLabel(item) }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-go-text-muted">
                <div class="flex items-center gap-1">
                  <MdiCalendarRange class="text-sm" />
                  <span class="tabular-nums">
                    {{ formatDate(item.plannedStartDate) }} → {{ formatDate(item.plannedEndDate) }}
                  </span>
                </div>
                <div v-if="item.actualStartDate" class="flex items-center gap-1">
                  <MdiPlayCircleOutline class="text-sm text-go-info" />
                  <span class="tabular-nums">Inició {{ formatDate(item.actualStartDate) }}</span>
                </div>
                <div v-if="item.actualEndDate" class="flex items-center gap-1">
                  <MdiCheckCircleOutline class="text-sm text-go-success" />
                  <span class="tabular-nums">Finalizó {{ formatDate(item.actualEndDate) }}</span>
                </div>
              </div>
              <div class="text-xs text-go-text-muted mt-1 tabular-nums">
                Mano de obra {{ formatPrice(item.laborBudget) }}
                <span class="text-go-text-muted/60">·</span>
                Materiales {{ materialsLabel(item) }}<span v-if="hasItemRange(item)" class="italic text-go-text-muted/80"> (estimativo)</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-display font-bold text-lg tabular-nums text-go-primary leading-tight">
                {{ itemTotalLabel(item) }}
              </div>
              <div class="text-[11px] text-go-text-muted">
                {{ pctOfTotal(item) }}% de la obra
              </div>
            </div>
          </div>

          <!-- Materiales real vs estimativo -->
          <div class="mt-3 pt-3 border-t border-go-border-subtle bg-go-bg/40 -mx-4 px-4 pb-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Materiales real</span>
              <span
                class="font-display font-bold text-sm tabular-nums"
                :class="materialsStatus(item).color"
              >{{ formatPrice(itemStats(item).realMaterials) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs tabular-nums">
              <span class="text-go-text-muted">Estimativo: {{ materialsLabel(item) }}</span>
              <span class="text-[10px]" :class="materialsStatus(item).color">{{ materialsStatus(item).label }}</span>
            </div>
            <p v-if="itemStats(item).expensesCount === 0" class="text-[11px] text-go-text-muted/80 mt-1.5 italic">
              Sin gastos asignados todavía.
            </p>
          </div>

          <!-- Provider actions -->
          <div v-if="!readonly" class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-go-border-subtle">
            <button
              v-if="!item.actualStartDate"
              @click="markStarted(item)"
              :disabled="busyId === item.id"
              class="text-xs font-medium px-2.5 py-1 rounded-go-sm border border-go-info/40 text-go-info hover:bg-go-info/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              <MdiPlayCircleOutline class="text-sm" />
              Marcar iniciada
            </button>
            <button
              v-if="item.actualStartDate && !item.actualEndDate"
              @click="markCompleted(item)"
              :disabled="busyId === item.id"
              class="text-xs font-medium px-2.5 py-1 rounded-go-sm border border-go-success/40 text-go-success hover:bg-go-success/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              <MdiCheckCircleOutline class="text-sm" />
              Marcar completada
            </button>
            <button
              v-if="item.actualStartDate || item.actualEndDate"
              @click="resetProgress(item)"
              :disabled="busyId === item.id"
              class="text-xs font-medium px-2.5 py-1 rounded-go-sm border border-go-border text-go-text-muted hover:text-go-text hover:border-go-text-muted transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              <MdiRestore class="text-sm" />
              Reiniciar progreso
            </button>
            <button
              @click="openAssign(item)"
              :disabled="busyId === item.id"
              class="text-xs font-medium px-2.5 py-1 rounded-go-sm border border-go-primary/40 text-go-primary hover:bg-go-primary/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              <MdiPlaylistPlus class="text-sm" />
              Asignar gastos
            </button>
            <div class="ml-auto flex items-center gap-1">
              <button
                @click="openEdit(item)"
                class="text-xs text-go-text-muted hover:text-go-text transition-colors p-1.5 rounded-go-sm hover:bg-go-surface-alt"
                title="Editar"
              >
                <MdiPencil class="text-base" />
              </button>
              <button
                @click="confirmDelete(item)"
                :disabled="busyId === item.id"
                class="text-xs text-go-text-muted hover:text-go-danger transition-colors p-1.5 rounded-go-sm hover:bg-go-danger/10 disabled:opacity-50"
                title="Eliminar"
              >
                <MdiDelete class="text-base" />
              </button>
            </div>
          </div>

          <!-- Expansion toggle + assigned expenses list -->
          <div v-if="itemStats(item).expensesCount > 0" class="mt-3 pt-3 border-t border-go-border-subtle">
            <button
              @click="toggleExpanded(item.id)"
              class="text-xs text-go-text-muted hover:text-go-text transition-colors inline-flex items-center gap-1"
            >
              <MdiChevronDown class="transition-transform text-base" :class="{ '-rotate-90': !expanded.has(item.id) }" />
              {{ expanded.has(item.id) ? 'Ocultar' : 'Ver' }}
              {{ itemStats(item).expensesCount }}
              {{ itemStats(item).expensesCount === 1 ? 'gasto asignado' : 'gastos asignados' }}
            </button>

            <div v-if="expanded.has(item.id)" class="mt-2 divide-y divide-go-border-subtle">
              <div
                v-for="expense in itemExpenses(item)"
                :key="expense.id"
                class="flex items-center gap-3 py-2"
                :class="!readonly ? 'cursor-pointer hover:bg-go-surface-alt/50 -mx-4 px-4 transition-colors' : ''"
                @click="!readonly && $emit('editExpense', expense)"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-go-text">{{ expense.title }}</div>
                  <div class="text-[11px] text-go-text-muted">
                    <span class="tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
                    <span v-if="expense.category"> · {{ getCategoryLabel(expense.category) }}</span>
                  </div>
                </div>
                <span class="font-display font-semibold text-sm tabular-nums whitespace-nowrap"
                  :class="isLaborCategory(expense.category) ? 'text-go-secondary' : 'text-go-primary'"
                >
                  {{ formatPrice(expense.amount) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Item create/edit modal -->
    <ProjectItemModal
      :show="showModal"
      :item="editingItem"
      :is-submitting="isSubmitting"
      @close="closeModal"
      @submit="handleSubmit"
    />

    <!-- Assign modal -->
    <ProjectItemAssignModal
      :show="showAssignModal"
      :item="assigningItem"
      :expenses="expenseStore.expenses"
      :items="itemStore.items"
      @close="closeAssign"
      @save="handleAssignSave"
    />

    <!-- Unassigned expenses modal (provider only) -->
    <div v-if="showUnassignedModal" class="modal-backdrop" @click.self="showUnassignedModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <div>
            <h3 class="font-display font-semibold text-base text-go-text">Gastos sin asignar</h3>
            <p class="text-go-text-muted text-xs mt-0.5">{{ unassignedExpenses.length }} gastos · {{ formatPrice(unassignedTotal) }}</p>
          </div>
          <button @click="showUnassignedModal = false" class="modal-close">
            <MdiClose class="text-xl" />
          </button>
        </div>
        <div class="modal-body">
          <p class="text-xs text-go-text-muted mb-3">Asigná cada gasto al item al que pertenece. Los que queden sin asignar siguen contando en el total general de la obra pero no en ningún item.</p>
          <div class="divide-y divide-go-border-subtle">
            <div
              v-for="expense in unassignedExpenses"
              :key="expense.id"
              class="flex items-center gap-3 py-3 -mx-4 px-4"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm text-go-text truncate">{{ expense.title }}</div>
                <div class="text-[11px] text-go-text-muted">
                  <span class="tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
                  <span v-if="expense.category"> · {{ getCategoryLabel(expense.category) }}</span>
                </div>
              </div>
              <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">
                {{ formatPrice(expense.amount) }}
              </span>
              <select
                :value="expense.itemId || ''"
                @change="quickAssign(expense, $event.target.value)"
                :disabled="quickBusyId === expense.id"
                class="bg-go-bg border border-go-border rounded-go-sm px-2 py-1 text-xs text-go-text focus:outline-none focus:border-go-primary disabled:opacity-50"
              >
                <option value="">Asignar a…</option>
                <option v-for="i in itemStore.items" :key="i.id" :value="i.id">{{ i.name }}</option>
              </select>
            </div>
          </div>
          <div v-if="unassignedExpenses.length === 0" class="text-center py-6">
            <p class="text-sm text-go-text-muted">Todos los gastos están asignados.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showUnassignedModal = false" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiCalendarRange from '~icons/mdi/calendar-range';
import MdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
import MdiPlayCircleOutline from '~icons/mdi/play-circle-outline';
import MdiRestore from '~icons/mdi/restore';
import MdiViewList from '~icons/mdi/view-list';
import MdiPlaylistPlus from '~icons/mdi/playlist-plus';
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiClose from '~icons/mdi/close';
import { useProjectItemStore, itemMidpoint, itemRangeMin, itemRangeMax } from '~/stores/projectItem';
import { useExpenseStore } from '~/stores/expense';
import { formatPrice, formatDate, getCategoryLabel } from '~/utils';

const props = defineProps({
  projectId: { type: String, required: true },
  providerId: { type: String, required: true },
  readonly: { type: Boolean, default: false }
});

defineEmits(['editExpense']);

const itemStore = useProjectItemStore();
const expenseStore = useExpenseStore();

// Modal & UI state
const showModal = ref(false);
const editingItem = ref(null);
const isSubmitting = ref(false);
const busyId = ref(null);
const expanded = ref(new Set());
const showAssignModal = ref(false);
const assigningItem = ref(null);
const showUnassignedModal = ref(false);
const quickBusyId = ref(null);

// Aggregate progress
const progressLabel = computed(() => itemStore.progressPercentage.toFixed(0));
const progressBarWidth = computed(() => {
  const pct = Math.min(100, Math.max(0, itemStore.progressPercentage));
  return `${pct}%`;
});
const progressBarColor = computed(() => {
  const pct = itemStore.progressPercentage;
  if (pct >= 100) return 'bg-go-success';
  if (pct >= 50) return 'bg-go-primary';
  return 'bg-go-info';
});

// Item card helpers
function pctOfTotal(item) {
  if (itemStore.totalBudget <= 0) return '0';
  return ((itemMidpoint(item) / itemStore.totalBudget) * 100).toFixed(0);
}
function hasItemRange(item) {
  return (item.materialsBudgetMin || 0) !== (item.materialsBudgetMax || 0);
}
function materialsLabel(item) {
  const min = item.materialsBudgetMin || 0;
  const max = item.materialsBudgetMax || 0;
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}
function itemTotalLabel(item) {
  const min = itemRangeMin(item);
  const max = itemRangeMax(item);
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}
function statusLabel(item) {
  if (item.actualEndDate) return 'Completada';
  if (item.actualStartDate) return 'En progreso';
  return 'Pendiente';
}
function statusClasses(item) {
  if (item.actualEndDate) return 'bg-go-success/15 text-go-success';
  if (item.actualStartDate) return 'bg-go-info/15 text-go-info';
  return 'bg-go-surface-alt text-go-text-muted';
}

// Category bucketing: only the literal "mano de obra" category counts as labor.
function isLaborCategory(category) {
  return (category || '').toLowerCase() === 'mano de obra';
}

// Per-item assigned expense stats
function itemExpenses(item) {
  return expenseStore.expenses.filter(
    e => e.itemId === item.id && (!e.type || e.type === 'expense')
  );
}
function itemStats(item) {
  let realLabor = 0;
  let realMaterials = 0;
  let realTotal = 0;
  let count = 0;
  for (const e of expenseStore.expenses) {
    if (e.itemId !== item.id) continue;
    if (e.type && e.type !== 'expense') continue;
    const amount = e.amount || 0;
    realTotal += amount;
    count++;
    if (isLaborCategory(e.category)) realLabor += amount;
    else realMaterials += amount;
  }
  return { realLabor, realMaterials, realTotal, expensesCount: count };
}

function materialsStatus(item) {
  const real = itemStats(item).realMaterials;
  const min = item.materialsBudgetMin || 0;
  const max = item.materialsBudgetMax || 0;
  if (real === 0) return { color: 'text-go-text-muted', label: '' };
  if (max === 0) {
    return { color: 'text-go-warning', label: '(sin estimar)' };
  }
  if (real < min) return { color: 'text-go-text', label: '(por debajo del rango)' };
  if (real <= max) return { color: 'text-go-success', label: '(dentro del rango)' };
  // Over max
  const overPct = ((real - max) / max) * 100;
  if (overPct <= 25) {
    return { color: 'text-go-warning', label: `(+${Math.round(overPct)}% sobre el máximo)` };
  }
  return { color: 'text-go-danger', label: `(+${Math.round(overPct)}% sobre el máximo)` };
}

// Unassigned expenses (only client-cobrable expense type)
const unassignedExpenses = computed(() =>
  expenseStore.expenses
    .filter(e => (!e.type || e.type === 'expense') && !e.itemId)
    .slice()
    .sort((a, b) => {
      const aDate = a.date?.toDate?.()?.getTime?.() ?? new Date(a.date || a.createdAt || 0).getTime();
      const bDate = b.date?.toDate?.()?.getTime?.() ?? new Date(b.date || b.createdAt || 0).getTime();
      return bDate - aDate;
    })
);
const unassignedTotal = computed(() =>
  unassignedExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

function toggleExpanded(id) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// CRUD for items
function openCreate() {
  editingItem.value = null;
  showModal.value = true;
}
function openEdit(item) {
  editingItem.value = item;
  showModal.value = true;
}
function closeModal() {
  showModal.value = false;
  editingItem.value = null;
}

async function handleSubmit(data) {
  isSubmitting.value = true;
  try {
    if (editingItem.value) {
      const result = await itemStore.updateItem(editingItem.value.id, data);
      if (result.success) {
        useToast('success', 'Item actualizado');
        closeModal();
      } else {
        useToast('error', result.error || 'Error al actualizar');
      }
    } else {
      const result = await itemStore.createItem({
        ...data,
        projectId: props.projectId,
        providerId: props.providerId
      });
      if (result.success) {
        useToast('success', 'Item creado');
        closeModal();
      } else {
        useToast('error', result.error || 'Error al crear');
      }
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function markStarted(item) {
  busyId.value = item.id;
  try {
    const result = await itemStore.updateItem(item.id, { actualStartDate: new Date() });
    if (result.success) useToast('success', 'Item iniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busyId.value = null;
  }
}

async function markCompleted(item) {
  busyId.value = item.id;
  try {
    const result = await itemStore.updateItem(item.id, { actualEndDate: new Date() });
    if (result.success) useToast('success', 'Item completado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busyId.value = null;
  }
}

async function resetProgress(item) {
  if (!confirm('¿Reiniciar el progreso de este item? Se borrarán las fechas reales de inicio y fin.')) return;
  busyId.value = item.id;
  try {
    const result = await itemStore.updateItem(item.id, {
      actualStartDate: null,
      actualEndDate: null
    });
    if (result.success) useToast('success', 'Progreso reiniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busyId.value = null;
  }
}

async function confirmDelete(item) {
  const assigned = itemExpenses(item);
  const message = assigned.length > 0
    ? `¿Eliminar el item "${item.name}"? Los ${assigned.length} ${assigned.length === 1 ? 'gasto asignado quedará' : 'gastos asignados quedarán'} sin asignar. Esta acción no se puede deshacer.`
    : `¿Eliminar el item "${item.name}"? Esta acción no se puede deshacer.`;
  if (!confirm(message)) return;
  busyId.value = item.id;
  try {
    // Auto-unassign first to avoid orphan itemId references
    if (assigned.length > 0) {
      await expenseStore.batchUpdateItemId(
        assigned.map(e => ({ expenseId: e.id, itemId: null }))
      );
    }
    const ok = await itemStore.deleteItem(item.id);
    if (ok) useToast('success', 'Item eliminado');
    else useToast('error', itemStore.error || 'Error al eliminar');
  } finally {
    busyId.value = null;
  }
}

// Assignment
function openAssign(item) {
  assigningItem.value = item;
  showAssignModal.value = true;
}
function closeAssign() {
  showAssignModal.value = false;
  assigningItem.value = null;
}

async function handleAssignSave({ itemId, expenseIds }) {
  // Build the assignment list: include current expenses now selected + previously
  // assigned-but-now-unselected (to clear them).
  const previouslyAssigned = expenseStore.expenses
    .filter(e => e.itemId === itemId)
    .map(e => e.id);

  const assignments = [];
  for (const id of previouslyAssigned) {
    if (!expenseIds.includes(id)) {
      assignments.push({ expenseId: id, itemId: null });
    }
  }
  for (const id of expenseIds) {
    const expense = expenseStore.expenses.find(e => e.id === id);
    // Only emit a write if itemId is actually changing
    if (expense && expense.itemId !== itemId) {
      assignments.push({ expenseId: id, itemId });
    }
  }

  if (assignments.length === 0) {
    closeAssign();
    return;
  }

  const result = await expenseStore.batchUpdateItemId(assignments);
  if (result.success) {
    useToast('success', 'Gastos asignados');
    closeAssign();
  } else {
    useToast('error', result.error || 'Error al asignar gastos');
  }
}

async function quickAssign(expense, newItemId) {
  if (!newItemId) return;
  quickBusyId.value = expense.id;
  try {
    const result = await expenseStore.batchUpdateItemId([
      { expenseId: expense.id, itemId: newItemId }
    ]);
    if (result.success) {
      useToast('success', 'Gasto asignado');
    } else {
      useToast('error', result.error || 'Error al asignar');
    }
  } finally {
    quickBusyId.value = null;
  }
}
</script>
