<template>
  <section class="mb-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 gap-3">
      <div class="flex items-baseline gap-2 min-w-0">
        <h2 class="font-display font-semibold text-go-text">Items de la obra</h2>
        <span v-if="itemStore.items.length > 0" class="text-xs text-go-text-muted">
          · {{ itemStore.items.length }}{{ itemStore.items.length === 1 ? ' item' : ' items' }}
        </span>
      </div>
      <button
        v-if="!readonly && !isClient"
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
      v-if="!readonly && !isClient && itemStore.items.length > 0 && unassignedExpenses.length > 0"
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
      <p class="font-display text-go-text-secondary">Sin items de la obra todavía</p>
      <p class="text-sm text-go-text-muted mt-1 max-w-md mx-auto">
        Dividí la obra en partes (ej: "Remodelación del baño", "Cocina") para hacer seguimiento del progreso y presupuesto por etapa.
      </p>
      <button
        v-if="!readonly && !isClient"
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
            {{ completedItemCount }} / {{ itemStore.items.length }} completados
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
          <span>{{ formatPrice(aggregateBudget.completedLabor) }} de mano de obra lista</span>
          <span>de {{ formatPrice(aggregateBudget.totalLabor) }}</span>
        </div>
        <div v-if="aggregateBudget.materialsMax > 0" class="text-[10px] text-go-text-muted/80 mt-1 italic text-right tabular-nums">
          Materiales estimados
          <template v-if="aggregateBudget.hasMaterialsRange">
            entre {{ formatPrice(aggregateBudget.materialsMin) }} y {{ formatPrice(aggregateBudget.materialsMax) }}
          </template>
          <template v-else>
            en {{ formatPrice(aggregateBudget.materialsMax) }}
          </template>
        </div>
      </div>

      <!-- Compact item rows -->
      <div class="space-y-2">
        <NuxtLink
          v-for="item in itemStore.items"
          :key="item.id"
          :to="itemDetailRoute(item)"
          class="block w-full text-left bg-go-surface border border-go-border rounded-go-xl overflow-hidden relative hover:bg-go-surface-hover transition-colors"
        >
          <!-- Left status accent -->
          <div class="absolute left-0 top-0 bottom-0 w-1" :style="{ background: statusAccent(item) }" />

          <div class="px-4 py-3 pl-5">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-display font-semibold text-go-text text-[14.5px] truncate">{{ item.name }}</h3>
                  <span
                    class="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    :class="statusClasses(item)"
                  >{{ statusLabel(item) }}</span>
                </div>
                <div class="text-[11px] text-go-text-muted mt-0.5 tabular-nums truncate">
                  Mano de obra <span class="text-go-text font-semibold">{{ formatPrice(item.laborBudget || 0) }}</span>
                  <template v-if="taskCounts(item).total > 0">
                    <span class="text-go-text-muted/60"> · </span>
                    <span
                      :class="taskCounts(item).done === taskCounts(item).total ? 'text-go-success' : 'text-go-text'"
                    >{{ taskCounts(item).done }}/{{ taskCounts(item).total }} tareas</span>
                  </template>
                </div>
                <div class="text-[11px] text-go-text-muted mt-0.5 tabular-nums truncate">
                  {{ formatPrice(itemStats(item).realTotal) }}
                  <span class="text-go-text-muted/60">de</span>
                  {{ itemTotalLabel(item) }}<span v-if="hasItemRange(item)" class="italic text-go-text-muted/80"> (estim.)</span>
                  <span class="text-go-text-muted/60"> · </span>
                  <span class="text-go-text">{{ itemSpendPct(item) }}%</span>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted shrink-0 mt-1"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            <div class="w-full h-1 rounded-full bg-go-surface-alt overflow-hidden mt-2">
              <div
                class="h-full transition-all duration-500"
                :class="itemSpendBarBg(item)"
                :style="{ width: Math.min(100, itemSpendPct(item)) + '%' }"
              />
            </div>
          </div>
        </NuxtLink>
      </div>
    </template>

    <!-- Item create modal (provider only) -->
    <ProjectItemModal
      v-if="!isClient"
      :show="showModal"
      :item="null"
      :has-materials="false"
      :derived-materials-min="0"
      :derived-materials-max="0"
      :is-submitting="isSubmitting"
      @close="closeModal"
      @submit="handleSubmit"
    />

    <!-- Unassigned expenses modal (provider only) -->
    <div v-if="!isClient && showUnassignedModal" class="modal-backdrop" @click.self="showUnassignedModal = false">
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
import MdiViewList from '~icons/mdi/view-list';
import MdiClose from '~icons/mdi/close';
import { useProjectItemStore } from '~/stores/projectItem';
import { useExpenseStore } from '~/stores/expense';
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { useProjectTaskStore } from '~/stores/projectTask';
import { formatPrice, getCategoryLabel } from '~/utils';

const props = defineProps({
  projectId: { type: String, required: true },
  providerId: { type: String, required: true },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

const itemStore = useProjectItemStore();
const expenseStore = useExpenseStore();
const materialStore = useProjectMaterialStore();
const taskStore = useProjectTaskStore();

// Modal & UI state
const showModal = ref(false);
const isSubmitting = ref(false);
const showUnassignedModal = ref(false);
const quickBusyId = ref(null);

function itemDetailRoute(item) {
  if (props.isClient) return `/client/project/${props.projectId}/items/${item.id}`;
  return `/projects/${props.projectId}/items/${item.id}`;
}

// Effective per-item budget
function effective(item) {
  return effectiveItemBudget(item, materialStore);
}

// Per-item progress in [0,1]: tasks-based when any task exists,
// else binary on actualEndDate.
function itemProgress(item) {
  const taskProg = taskStore.itemTaskProgress(item.id);
  if (taskProg !== null) return taskProg;
  return item.actualEndDate ? 1 : 0;
}

// Aggregate
const aggregateBudget = computed(() => {
  let totalLabor = 0;
  let completedLabor = 0;
  let materialsMin = 0;
  let materialsMax = 0;
  let hasMaterialsRange = false;
  for (const item of itemStore.items) {
    const eff = effective(item);
    const labor = item.laborBudget || 0;
    totalLabor += labor;
    materialsMin += eff.materialsMin;
    materialsMax += eff.materialsMax;
    if (eff.materialsMin !== eff.materialsMax) hasMaterialsRange = true;
    completedLabor += labor * itemProgress(item);
  }
  return { totalLabor, completedLabor, materialsMin, materialsMax, hasMaterialsRange };
});

const progressPercentage = computed(() => {
  const { totalLabor, completedLabor } = aggregateBudget.value;
  if (totalLabor <= 0) return 0;
  return (completedLabor / totalLabor) * 100;
});

const completedItemCount = computed(() =>
  itemStore.items.filter(i => effectiveState(i) === 'completada').length
);

const progressLabel = computed(() => progressPercentage.value.toFixed(0));
const progressBarWidth = computed(() => {
  const pct = Math.min(100, Math.max(0, progressPercentage.value));
  return `${pct}%`;
});
const progressBarColor = computed(() => {
  const pct = progressPercentage.value;
  if (pct >= 100) return 'bg-go-success';
  if (pct >= 50) return 'bg-go-primary';
  return 'bg-go-info';
});

// Item row helpers
function hasItemRange(item) {
  const eff = effective(item);
  return eff.materialsMin !== eff.materialsMax;
}
function itemTotalLabel(item) {
  const eff = effective(item);
  if (eff.totalMin === eff.totalMax) return formatPrice(eff.totalMin);
  return `${formatPrice(eff.totalMin)} – ${formatPrice(eff.totalMax)}`;
}
function hasMaterialsForItem(itemId) {
  return materialStore.materialsForItem(itemId).length > 0;
}

function taskCounts(item) {
  return taskStore.itemTaskCounts(item.id);
}

// An item's effective state: tasks-derived when present, else actual* dates.
function effectiveState(item) {
  const { done, total } = taskCounts(item);
  if (total > 0) {
    if (done === 0) return 'pendiente';
    if (done === total) return 'completada';
    return 'en_progreso';
  }
  if (item.actualEndDate) return 'completada';
  if (item.actualStartDate) return 'en_progreso';
  return 'pendiente';
}
function statusLabel(item) {
  const s = effectiveState(item);
  if (s === 'completada') return 'Completada';
  if (s === 'en_progreso') return 'En progreso';
  return 'Pendiente';
}
function statusClasses(item) {
  const s = effectiveState(item);
  if (s === 'completada') return 'bg-go-success/15 text-go-success';
  if (s === 'en_progreso') return 'bg-go-info/15 text-go-info';
  return 'bg-go-surface-alt text-go-text-muted';
}
function statusAccent(item) {
  const s = effectiveState(item);
  if (s === 'completada') return '#2D7A3F';
  if (s === 'en_progreso') return '#2D6A8A';
  return '#CFC7BA';
}

function isLaborCategory(category) {
  return (category || '').toLowerCase() === 'mano de obra';
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

function itemMaterialsLabel(item) {
  const eff = effective(item);
  if (eff.materialsMin === eff.materialsMax) return formatPrice(eff.materialsMin);
  return `${formatPrice(eff.materialsMin)} – ${formatPrice(eff.materialsMax)}`;
}
function itemSpendPct(item) {
  const eff = effective(item);
  if (eff.totalMidpoint <= 0) return 0;
  return Math.round((itemStats(item).realTotal / eff.totalMidpoint) * 100);
}
function itemSpendBarBg(item) {
  const eff = effective(item);
  const real = itemStats(item).realTotal;
  if (real === 0) return 'bg-go-surface-alt';
  if (eff.totalMax === 0) return 'bg-go-warning';
  if (real < eff.totalMin) return 'bg-go-primary';
  if (real <= eff.totalMax) return 'bg-go-success';
  const overPct = ((real - eff.totalMax) / eff.totalMax) * 100;
  if (overPct <= 25) return 'bg-go-warning';
  return 'bg-go-danger';
}

// Unassigned expenses
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

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// Create item (editing happens on the item detail page)
function openCreate() { showModal.value = true; }
function closeModal() { showModal.value = false; }

async function handleSubmit(data) {
  isSubmitting.value = true;
  try {
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
  } finally {
    isSubmitting.value = false;
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
