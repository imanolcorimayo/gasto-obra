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
          <span>{{ formatPrice(aggregateBudget.completedMidpoint) }} completado</span>
          <span>de {{ formatPrice(aggregateBudget.totalMidpoint) }}</span>
        </div>
        <div v-if="aggregateBudget.hasAnyRange" class="text-[10px] text-go-text-muted/80 mt-1 italic text-right tabular-nums">
          Materiales estimados entre {{ formatPrice(aggregateBudget.totalMin) }} y {{ formatPrice(aggregateBudget.totalMax) }}
        </div>
      </div>

      <!-- Compact item rows -->
      <div class="space-y-2">
        <button
          v-for="item in itemStore.items"
          :key="item.id"
          type="button"
          @click="openItem(item.id)"
          class="w-full text-left bg-go-surface border border-go-border rounded-go-xl overflow-hidden relative hover:bg-go-surface-hover transition-colors"
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
                  {{ formatPrice(itemStats(item).realMaterials) }}
                  <span class="text-go-text-muted/60">de</span>
                  {{ itemMaterialsLabel(item) }}<span v-if="hasItemRange(item)" class="italic text-go-text-muted/80"> (estim.)</span>
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
        </button>
      </div>
    </template>

    <!-- Detail panel (URL-synced) -->
    <ProjectItemDetailPanel
      :show="!!selectedItem"
      :item="selectedItem"
      :readonly="readonly"
      :is-client="isClient"
      @close="closeItem"
      @edit="(item) => openEdit(item)"
      @assign="(item) => openAssign(item)"
      @editExpense="(expense) => $emit('editExpense', expense)"
    />

    <!-- Item create/edit modal (provider only) -->
    <ProjectItemModal
      v-if="!isClient"
      :show="showModal"
      :item="editingItem"
      :has-materials="editingItem ? hasMaterialsForItem(editingItem.id) : false"
      :derived-materials-min="editingItem ? effective(editingItem).materialsMin : 0"
      :derived-materials-max="editingItem ? effective(editingItem).materialsMax : 0"
      :is-submitting="isSubmitting"
      @close="closeModal"
      @submit="handleSubmit"
    />

    <!-- Assign modal (provider only) -->
    <ProjectItemAssignModal
      v-if="!isClient"
      :show="showAssignModal"
      :item="assigningItem"
      :expenses="expenseStore.expenses"
      :items="itemStore.items"
      @close="closeAssign"
      @save="handleAssignSave"
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
import { formatPrice, getCategoryLabel } from '~/utils';

const props = defineProps({
  projectId: { type: String, required: true },
  providerId: { type: String, required: true },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

defineEmits(['editExpense']);

const itemStore = useProjectItemStore();
const expenseStore = useExpenseStore();
const materialStore = useProjectMaterialStore();
const route = useRoute();
const router = useRouter();

// Modal & UI state
const showModal = ref(false);
const editingItem = ref(null);
const isSubmitting = ref(false);
const showAssignModal = ref(false);
const assigningItem = ref(null);
const showUnassignedModal = ref(false);
const quickBusyId = ref(null);

// Selected item (derived from ?item=<id>)
const selectedItem = computed(() => {
  const id = route.query.item;
  if (!id) return null;
  return itemStore.items.find(i => i.id === id) || null;
});

function openItem(id) {
  router.replace({ query: { ...route.query, item: id } });
}
function closeItem() {
  const { item, ...rest } = route.query;
  router.replace({ query: rest });
}

// Effective per-item budget
function effective(item) {
  return effectiveItemBudget(item, materialStore);
}

// Aggregate
const aggregateBudget = computed(() => {
  let totalMin = 0;
  let totalMax = 0;
  let totalMidpoint = 0;
  let completedMidpoint = 0;
  let hasAnyRange = false;
  for (const item of itemStore.items) {
    const eff = effective(item);
    totalMin += eff.totalMin;
    totalMax += eff.totalMax;
    totalMidpoint += eff.totalMidpoint;
    if (eff.materialsMin !== eff.materialsMax) hasAnyRange = true;
    if (item.actualEndDate) completedMidpoint += eff.totalMidpoint;
  }
  return { totalMin, totalMax, totalMidpoint, completedMidpoint, hasAnyRange };
});

const progressPercentage = computed(() => {
  const total = aggregateBudget.value.totalMidpoint;
  if (total <= 0) return 0;
  return (aggregateBudget.value.completedMidpoint / total) * 100;
});

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
function statusAccent(item) {
  if (item.actualEndDate) return '#2D7A3F';
  if (item.actualStartDate) return '#2D6A8A';
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
  const mid = (eff.materialsMin + eff.materialsMax) / 2;
  if (mid <= 0) return 0;
  return Math.round((itemStats(item).realMaterials / mid) * 100);
}
function itemSpendBarBg(item) {
  const eff = effective(item);
  const real = itemStats(item).realMaterials;
  if (real === 0) return 'bg-go-surface-alt';
  if (eff.materialsMax === 0) return 'bg-go-warning';
  if (real < eff.materialsMin) return 'bg-go-primary';
  if (real <= eff.materialsMax) return 'bg-go-success';
  const overPct = ((real - eff.materialsMax) / eff.materialsMax) * 100;
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
