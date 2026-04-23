<template>
  <div v-if="item" class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 lg:gap-6">
    <!-- ═════════ PRIMARY COLUMN ═════════ -->
    <div class="min-w-0 space-y-5 lg:space-y-6 order-2 lg:order-1">
      <!-- Tareas (main execution surface) -->
      <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5 lg:p-6">
        <ProjectTaskList :item="item" :readonly="isClient" @open-task="openTaskDrawer" />
      </section>

      <!-- Galería -->
      <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5 lg:p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-go-text text-[15px]">Galería</h2>
          <span v-if="item.images && item.images.length" class="text-[11px] text-go-text-muted tabular-nums">
            {{ item.images.length }} {{ item.images.length === 1 ? 'foto' : 'fotos' }}
          </span>
        </div>
        <ProjectImageGallery
          :images="item.images || []"
          :endpoint-base="`/api/items/${item.id}`"
          :readonly="isClient"
          @uploaded="(img) => itemStore.addImageToItem(item.id, img)"
          @deleted="(id) => itemStore.removeImageFromItem(item.id, id)"
        />
      </section>

      <!-- Gastos asignados -->
      <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5 lg:p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-go-text text-[15px]">Gastos asignados</h2>
          <span v-if="expenses.length" class="text-[11px] text-go-text-muted tabular-nums">
            {{ expenses.length }} · {{ formatPrice(stats.realTotal) }}
          </span>
        </div>
        <div v-if="!expenses.length" class="text-[12.5px] text-go-text-muted italic py-2">
          Sin gastos asignados todavía.
        </div>
        <div v-else class="space-y-4">
          <div v-for="group in expensesByDay" :key="group.key">
            <div class="text-[10px] font-semibold tracking-[0.12em] uppercase text-go-text-muted mb-2">
              {{ group.label }}
            </div>
            <div class="divide-y divide-go-border-subtle">
              <div
                v-for="expense in group.items"
                :key="expense.id"
                class="flex items-center gap-3 py-2.5"
                :class="!isClient ? 'cursor-pointer hover:bg-go-surface-hover -mx-5 lg:-mx-6 px-5 lg:px-6 transition-colors' : ''"
                @click="!isClient && $emit('editExpense', expense)"
              >
                <span
                  class="w-1 h-9 rounded-full shrink-0"
                  :class="isLaborCategory(expense.category) ? 'bg-go-secondary' : 'bg-go-primary'"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-[13.5px] text-go-text truncate">{{ expense.title }}</div>
                  <div v-if="expense.category" class="text-[10.5px] text-go-text-muted mt-0.5">
                    {{ getCategoryLabel(expense.category) }}
                  </div>
                </div>
                <span
                  class="font-display font-semibold text-[14px] tabular-nums whitespace-nowrap"
                  :class="isLaborCategory(expense.category) ? 'text-go-secondary' : 'text-go-primary'"
                >{{ formatPrice(expense.amount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Materiales (lista) -->
      <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5 lg:p-6">
        <ProjectMaterialList
          :item="item"
          :readonly="isClient"
          :is-client="isClient"
          @open-material="openMaterialDrawer"
        />
      </section>
    </div>

    <!-- ═════════ SIDEBAR ═════════ -->
    <aside class="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start space-y-4">
      <!-- Resumen (status + dates + task progress) -->
      <div class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5">
        <h3 class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-3">Resumen</h3>

        <!-- Task progress mini-bar (only if tasks exist) -->
        <div v-if="taskCounts.total > 0" class="mb-4">
          <div class="flex items-baseline justify-between mb-1.5">
            <span class="text-[11.5px] text-go-text-secondary">Progreso de tareas</span>
            <span class="text-[12px] font-display font-semibold tabular-nums text-go-text">
              {{ taskCounts.done }}/{{ taskCounts.total }}
            </span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-go-surface-alt overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="taskProgressPct === 100 ? 'bg-go-success' : 'bg-go-primary'"
              :style="{ width: taskProgressPct + '%' }"
            />
          </div>
        </div>

        <!-- Planned dates -->
        <div class="space-y-2.5">
          <div>
            <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-go-text-muted mb-0.5">Planeado</div>
            <div class="text-[12.5px] text-go-text tabular-nums">{{ plannedRangeLabel }}</div>
            <div v-if="plannedDurationLabel" class="text-[10.5px] text-go-text-muted tabular-nums">{{ plannedDurationLabel }}</div>
          </div>

          <div v-if="item.actualStartDate || item.actualEndDate">
            <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-go-text-muted mb-0.5">Real</div>
            <div v-if="item.actualStartDate" class="text-[12.5px] text-go-info flex items-center gap-1 tabular-nums">
              <MdiPlayCircleOutline class="text-[14px]" />
              Inició {{ formatDate(item.actualStartDate) }}
            </div>
            <div v-if="item.actualEndDate" class="text-[12.5px] text-go-success flex items-center gap-1 tabular-nums">
              <MdiCheckCircleOutline class="text-[14px]" />
              Finalizó {{ formatDate(item.actualEndDate) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Presupuesto -->
      <div class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5">
        <h3 class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-3">Presupuesto</h3>
        <div class="space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-[12px] text-go-text-secondary">Mano de obra</span>
            <span class="text-[12.5px] font-display font-semibold tabular-nums text-go-text">
              {{ formatPrice(item.laborBudget) }}
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-[12px] text-go-text-secondary">
              Materiales
              <span v-if="hasRange" class="italic text-go-text-muted/80">(estim.)</span>
            </span>
            <span class="text-[12.5px] font-display font-semibold tabular-nums text-go-text">
              {{ materialsLabel }}
            </span>
          </div>
          <div class="flex items-baseline justify-between pt-2 mt-1 border-t border-go-border-subtle">
            <span class="text-[12px] font-semibold text-go-text">Total</span>
            <span class="text-[13.5px] font-display font-bold tabular-nums text-go-text">
              {{ itemTotalLabel }}
            </span>
          </div>
        </div>
      </div>

      <!-- Gastado en materiales -->
      <div class="bg-go-surface border border-go-border-subtle rounded-go-xl p-5">
        <h3 class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-2">Gastado en materiales</h3>
        <div class="flex items-baseline gap-1.5 flex-wrap">
          <div class="font-display font-bold text-[24px] leading-none tabular-nums" :class="materialsStatus.color">
            {{ formatPrice(stats.realMaterials) }}
          </div>
          <div v-if="effective && effective.materialsMax > 0" class="text-[11px] text-go-text-muted tabular-nums">
            / {{ materialsLabel }}
          </div>
        </div>
        <div class="mt-3">
          <div class="w-full h-1.5 rounded-full bg-go-surface-alt overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="materialsBarBg"
              :style="{ width: materialsPct + '%' }"
            />
          </div>
          <div class="flex items-baseline justify-between mt-1.5">
            <span class="text-[10.5px] font-semibold tabular-nums" :class="materialsStatus.color">{{ materialsPct }}%</span>
            <span v-if="materialsStatus.label" class="text-[10.5px] font-semibold" :class="materialsStatus.color">
              {{ materialsStatus.label }}
            </span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Dynamic drawer (material / task detail) -->
    <AppDrawer
      :show="!!drawerMode"
      :eyebrow="drawerEyebrow"
      :title="drawerTitle"
      :subtitle="drawerSubtitle"
      @close="closeDrawer"
    >
      <ProjectMaterialDetail
        v-if="drawerMode === 'material'"
        :material-id="drawerId"
        :item="item"
        :readonly="isClient"
        :is-client="isClient"
        @deleted="closeDrawer"
      />
      <ProjectTaskDetail
        v-else-if="drawerMode === 'task'"
        :task-id="drawerId"
        :readonly="isClient"
        @deleted="closeDrawer"
      />
    </AppDrawer>
  </div>
</template>

<script setup>
import MdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
import MdiPlayCircleOutline from '~icons/mdi/play-circle-outline';
import { useProjectItemStore } from '~/stores/projectItem';
import { useExpenseStore } from '~/stores/expense';
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { useProjectTaskStore } from '~/stores/projectTask';
import { formatPrice, formatDate, getCategoryLabel } from '~/utils';

const props = defineProps({
  item: { type: Object, default: null },
  isClient: { type: Boolean, default: false }
});

defineEmits(['editExpense']);

const itemStore = useProjectItemStore();
const expenseStore = useExpenseStore();
const materialStore = useProjectMaterialStore();
const taskStore = useProjectTaskStore();

const effective = computed(() => props.item ? effectiveItemBudget(props.item, materialStore) : null);
const hasRange = computed(() => effective.value && effective.value.materialsMin !== effective.value.materialsMax);

const itemTotalLabel = computed(() => {
  if (!effective.value) return '';
  const eff = effective.value;
  if (eff.totalMin === eff.totalMax) return formatPrice(eff.totalMin);
  return `${formatPrice(eff.totalMin)} – ${formatPrice(eff.totalMax)}`;
});

const materialsLabel = computed(() => {
  if (!effective.value) return '';
  const eff = effective.value;
  if (eff.materialsMin === eff.materialsMax) return formatPrice(eff.materialsMin);
  return `${formatPrice(eff.materialsMin)} – ${formatPrice(eff.materialsMax)}`;
});

function isLaborCategory(category) {
  return (category || '').toLowerCase() === 'mano de obra';
}

function toDate(d) {
  if (!d) return null;
  return d.toDate ? d.toDate() : new Date(d);
}

const plannedRangeLabel = computed(() => {
  if (!props.item) return '';
  const start = formatDate(props.item.plannedStartDate);
  const end = formatDate(props.item.plannedEndDate);
  if (!start && !end) return '—';
  return `${start} → ${end}`;
});

const plannedDurationLabel = computed(() => {
  if (!props.item) return '';
  const s = toDate(props.item.plannedStartDate);
  const e = toDate(props.item.plannedEndDate);
  if (!s || !e) return '';
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return '';
  return days === 1 ? '1 día' : `${days} días`;
});

const taskCounts = computed(() => {
  if (!props.item) return { done: 0, total: 0 };
  return taskStore.itemTaskCounts(props.item.id);
});
const taskProgressPct = computed(() => {
  const { done, total } = taskCounts.value;
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
});

const expenses = computed(() => {
  if (!props.item) return [];
  return expenseStore.expenses
    .filter(e => e.itemId === props.item.id && (!e.type || e.type === 'expense'))
    .slice()
    .sort((a, b) => {
      const aDate = a.date?.toDate?.()?.getTime?.() ?? new Date(a.date || a.createdAt || 0).getTime();
      const bDate = b.date?.toDate?.()?.getTime?.() ?? new Date(b.date || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
});

const expensesByDay = computed(() => {
  const groups = new Map();
  for (const e of expenses.value) {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date || e.createdAt || 0);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        date: d,
        label: d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', ''),
        items: []
      });
    }
    groups.get(key).items.push(e);
  }
  return [...groups.values()];
});

const stats = computed(() => {
  if (!props.item) return { realLabor: 0, realMaterials: 0, realTotal: 0, expensesCount: 0 };
  let realLabor = 0;
  let realMaterials = 0;
  let realTotal = 0;
  let count = 0;
  for (const e of expenseStore.expenses) {
    if (e.itemId !== props.item.id) continue;
    if (e.type && e.type !== 'expense') continue;
    const amount = e.amount || 0;
    realTotal += amount;
    count++;
    if (isLaborCategory(e.category)) realLabor += amount;
    else realMaterials += amount;
  }
  return { realLabor, realMaterials, realTotal, expensesCount: count };
});

const materialsStatus = computed(() => {
  if (!effective.value) return { color: 'text-go-text-muted', label: '' };
  const real = stats.value.realMaterials;
  const { materialsMin: min, materialsMax: max } = effective.value;
  if (real === 0) return { color: 'text-go-text-muted', label: '' };
  if (max === 0) return { color: 'text-go-warning', label: 'Sin estimar' };
  if (real < min) return { color: 'text-go-text', label: 'Por debajo' };
  if (real <= max) return { color: 'text-go-success', label: 'En rango' };
  const overPct = ((real - max) / max) * 100;
  if (overPct <= 25) return { color: 'text-go-warning', label: `+${Math.round(overPct)}%` };
  return { color: 'text-go-danger', label: `+${Math.round(overPct)}%` };
});

const materialsPct = computed(() => {
  if (!effective.value) return 0;
  const mid = (effective.value.materialsMin + effective.value.materialsMax) / 2;
  if (mid <= 0) return 0;
  return Math.round((stats.value.realMaterials / mid) * 100);
});
const materialsBarBg = computed(() => {
  if (!effective.value) return 'bg-go-surface-alt';
  const real = stats.value.realMaterials;
  if (real === 0) return 'bg-go-surface-alt';
  const { materialsMin: min, materialsMax: max } = effective.value;
  if (max === 0) return 'bg-go-warning';
  if (real < min) return 'bg-go-primary';
  if (real <= max) return 'bg-go-success';
  const overPct = ((real - max) / max) * 100;
  if (overPct <= 25) return 'bg-go-warning';
  return 'bg-go-danger';
});

// ═════════ DRAWER STATE ═════════
const drawerMode = ref(null);
const drawerId = ref(null);

function openMaterialDrawer(materialId) {
  drawerMode.value = 'material';
  drawerId.value = materialId;
}
function openTaskDrawer(taskId) {
  drawerMode.value = 'task';
  drawerId.value = taskId;
}
function closeDrawer() {
  drawerMode.value = null;
  drawerId.value = null;
}

const drawerMaterial = computed(() => {
  if (drawerMode.value !== 'material' || !drawerId.value) return null;
  return materialStore.materials.find(m => m.id === drawerId.value) || null;
});
const drawerTask = computed(() => {
  if (drawerMode.value !== 'task' || !drawerId.value) return null;
  return taskStore.tasks.find(t => t.id === drawerId.value) || null;
});

const drawerEyebrow = computed(() => {
  if (drawerMode.value === 'material') return 'Material';
  if (drawerMode.value === 'task') return 'Tarea';
  return '';
});
const drawerTitle = computed(() => {
  if (drawerMode.value === 'material') return drawerMaterial.value?.name || 'Material';
  if (drawerMode.value === 'task') return drawerTask.value?.description || 'Tarea';
  return '';
});
const drawerSubtitle = computed(() => {
  if (drawerMode.value === 'material') {
    const count = drawerMaterial.value
      ? materialStore.proposalsForMaterial(drawerMaterial.value.id).length
      : 0;
    if (count === 0) return 'Sin propuestas';
    return count === 1 ? '1 propuesta' : `${count} propuestas`;
  }
  return '';
});
</script>
