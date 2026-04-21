<template>
  <ClientOnly>
    <Transition name="detail-panel">
      <div
        v-if="show && item"
        class="fixed inset-0 z-50 flex justify-end"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-go-text/60 backdrop-blur-[2px]" @click="$emit('close')" />

        <!-- Panel surface -->
        <div
          class="relative bg-go-bg flex flex-col shadow-2xl
                 w-full lg:w-[480px] xl:w-[520px]
                 max-h-[92vh] lg:max-h-none lg:h-full
                 rounded-t-[22px] lg:rounded-none
                 self-end lg:self-stretch
                 detail-panel-surface"
        >
          <!-- Mobile grabber -->
          <div class="lg:hidden w-[42px] h-1 rounded-full bg-go-border mx-auto mt-2.5 shrink-0"></div>

          <!-- Sticky header -->
          <header class="sticky top-0 z-10 px-5 lg:px-6 pt-3 lg:pt-4 pb-3 bg-go-bg/95 backdrop-blur flex items-start gap-3 border-b border-go-border-subtle">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span
                  class="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase"
                  :class="statusTextColor"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusDotBg" />
                  {{ statusLabel }}
                </span>
                <span class="text-go-border">·</span>
                <span class="text-[11px] text-go-text-muted tabular-nums">{{ dateRangeLabel }}</span>
              </div>
              <h2 class="font-display font-bold text-go-text text-[20px] lg:text-[22px] leading-[1.15] truncate">{{ item.name }}</h2>
            </div>
            <button
              @click="$emit('close')"
              class="shrink-0 w-10 h-10 -mr-2 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-full transition-colors"
              title="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto">
            <!-- ───── HERO: gastado en materiales ───── -->
            <section class="px-5 lg:px-6 pt-5 lg:pt-6 pb-5">
              <div class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-2">Gastado en materiales</div>
              <div class="flex items-baseline gap-2.5 flex-wrap">
                <div class="font-display font-bold text-[34px] lg:text-[38px] leading-none tabular-nums" :class="materialsStatus.color">
                  {{ formatPrice(stats.realMaterials) }}
                </div>
                <div class="text-[13px] text-go-text-muted tabular-nums">
                  de <span class="text-go-text font-semibold">{{ materialsLabel }}</span>
                  <span v-if="hasRange" class="italic"> (estim.)</span>
                </div>
              </div>

              <!-- Progress bar (materials) -->
              <div class="mt-4">
                <div class="w-full h-2 rounded-full bg-go-surface-alt overflow-hidden">
                  <div
                    class="h-full transition-all duration-500"
                    :class="materialsBarBg"
                    :style="{ width: materialsPct + '%' }"
                  />
                </div>
                <div class="flex justify-between mt-1.5 text-[10.5px] text-go-text-muted tabular-nums">
                  <span class="font-semibold" :class="materialsStatus.color">{{ materialsPct }}%</span>
                  <span v-if="materialsStatus.label" class="font-semibold" :class="materialsStatus.color">{{ materialsStatus.label }}</span>
                </div>
              </div>

              <!-- Actual dates (if any) -->
              <div v-if="item.actualStartDate || item.actualEndDate" class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <div v-if="item.actualStartDate" class="flex items-center gap-1 text-go-info">
                  <MdiPlayCircleOutline class="text-[13px]" />
                  <span class="tabular-nums">Inició {{ formatDate(item.actualStartDate) }}</span>
                </div>
                <div v-if="item.actualEndDate" class="flex items-center gap-1 text-go-success">
                  <MdiCheckCircleOutline class="text-[13px]" />
                  <span class="tabular-nums">Finalizó {{ formatDate(item.actualEndDate) }}</span>
                </div>
              </div>
            </section>

            <!-- ───── BREAKDOWN (presupuesto composition) ───── -->
            <section class="px-5 lg:px-6 py-5 border-t border-go-border-subtle">
              <SectionLabel>Presupuesto</SectionLabel>

              <div class="flex items-baseline justify-between py-1.5">
                <span class="text-[12px] text-go-text-secondary">Mano de obra</span>
                <span class="text-[12.5px] font-display font-semibold tabular-nums text-go-text">{{ formatPrice(item.laborBudget) }}</span>
              </div>

              <div class="flex items-baseline justify-between py-1.5">
                <span class="text-[12px] text-go-text-secondary">
                  Materiales
                  <span v-if="hasRange" class="italic text-go-text-muted/80"> (estim.)</span>
                </span>
                <span class="text-[12.5px] font-display font-semibold tabular-nums text-go-text">{{ materialsLabel }}</span>
              </div>

              <div class="flex items-baseline justify-between pt-2 mt-2 border-t border-go-border-subtle">
                <span class="text-[12px] font-semibold text-go-text">Total</span>
                <span class="text-[13px] font-display font-bold tabular-nums text-go-text">{{ itemTotalLabel }}</span>
              </div>
            </section>

            <!-- ───── MATERIALS LIST ───── -->
            <section class="px-5 lg:px-6 py-5 border-t border-go-border-subtle">
              <ProjectMaterialList :item="item" :readonly="readonly" :is-client="isClient" />
            </section>

            <!-- ───── IMAGES ───── -->
            <section class="px-5 lg:px-6 py-5 border-t border-go-border-subtle">
              <div class="flex items-center justify-between mb-3">
                <SectionLabel class="!mb-0">Galería</SectionLabel>
                <span v-if="item.images && item.images.length" class="text-[10.5px] text-go-text-muted tabular-nums">{{ item.images.length }} {{ item.images.length === 1 ? 'foto' : 'fotos' }}</span>
              </div>
              <ProjectImageGallery
                :images="item.images || []"
                :endpoint-base="`/api/items/${item.id}`"
                :readonly="readonly"
                @uploaded="(img) => itemStore.addImageToItem(item.id, img)"
                @deleted="(id) => itemStore.removeImageFromItem(item.id, id)"
              />
            </section>

            <!-- ───── ASSIGNED EXPENSES ───── -->
            <section v-if="expenses.length" class="px-5 lg:px-6 py-5 border-t border-go-border-subtle">
              <div class="flex items-center justify-between mb-3">
                <SectionLabel class="!mb-0">Gastos asignados</SectionLabel>
                <span class="text-[10.5px] text-go-text-muted tabular-nums">{{ expenses.length }}</span>
              </div>
              <div class="space-y-3">
                <div v-for="group in expensesByDay" :key="group.key">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-go-text-muted mb-1.5">
                    {{ group.label }}
                  </div>
                  <div class="space-y-0">
                    <div
                      v-for="expense in group.items"
                      :key="expense.id"
                      class="flex items-center gap-3 py-2 -mx-5 lg:-mx-6 px-5 lg:px-6 border-b border-go-border-subtle last:border-b-0"
                      :class="(!readonly && !isClient) ? 'cursor-pointer hover:bg-go-surface-hover transition-colors' : ''"
                      @click="(!readonly && !isClient) && $emit('editExpense', expense)"
                    >
                      <span
                        class="w-1 h-8 rounded-full shrink-0"
                        :class="isLaborCategory(expense.category) ? 'bg-go-secondary' : 'bg-go-primary'"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="text-[13px] text-go-text truncate">{{ expense.title }}</div>
                        <div v-if="expense.category" class="text-[10.5px] text-go-text-muted">{{ getCategoryLabel(expense.category) }}</div>
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

            <!-- Empty state for expenses -->
            <section v-else class="px-5 lg:px-6 py-5 border-t border-go-border-subtle">
              <SectionLabel>Gastos asignados</SectionLabel>
              <p class="text-[12px] text-go-text-muted italic">Sin gastos asignados todavía.</p>
            </section>

            <!-- Bottom breathing room so last content clears the sticky footer -->
            <div class="h-4"></div>
          </div>

          <!-- Sticky footer actions (provider only) -->
          <footer v-if="!readonly && !isClient" class="sticky bottom-0 px-5 lg:px-6 py-3 border-t border-go-border-subtle bg-go-bg-elevated/95 backdrop-blur flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            <button
              v-if="!item.actualStartDate"
              @click="markStarted"
              :disabled="busy"
              class="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-go-md text-[12px] font-semibold transition-colors disabled:opacity-50 whitespace-nowrap border border-go-info/40 text-go-info hover:bg-go-info/10"
            >
              <MdiPlayCircleOutline class="text-[15px]" />
              Iniciar
            </button>
            <button
              v-if="item.actualStartDate && !item.actualEndDate"
              @click="markCompleted"
              :disabled="busy"
              class="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-go-md text-[12px] font-semibold transition-colors disabled:opacity-50 whitespace-nowrap border border-go-success/40 text-go-success hover:bg-go-success/10"
            >
              <MdiCheckCircleOutline class="text-[15px]" />
              Completar
            </button>
            <button
              v-if="item.actualStartDate || item.actualEndDate"
              @click="resetProgress"
              :disabled="busy"
              class="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-go-md text-[12px] font-semibold transition-colors disabled:opacity-50 whitespace-nowrap border border-go-border text-go-text-muted hover:text-go-text hover:border-go-text-muted"
            >
              <MdiRestore class="text-[15px]" />
              Reiniciar
            </button>
            <button
              @click="$emit('assign', item)"
              :disabled="busy"
              class="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-go-md text-[12px] font-semibold transition-colors disabled:opacity-50 whitespace-nowrap border border-go-primary/40 text-go-primary hover:bg-go-primary/10"
            >
              <MdiPlaylistPlus class="text-[15px]" />
              Asignar gastos
            </button>
            <div class="ml-auto flex items-center gap-0.5 shrink-0 pl-2 border-l border-go-border-subtle">
              <button
                @click="$emit('edit', item)"
                class="w-9 h-9 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-go-md transition-colors"
                title="Editar item"
              >
                <MdiPencil class="text-[16px]" />
              </button>
              <button
                @click="confirmDelete"
                :disabled="busy"
                class="w-9 h-9 flex items-center justify-center text-go-text-muted hover:text-go-danger hover:bg-go-danger/10 rounded-go-md transition-colors disabled:opacity-50"
                title="Eliminar item"
              >
                <MdiDelete class="text-[16px]" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
import MdiPlayCircleOutline from '~icons/mdi/play-circle-outline';
import MdiRestore from '~icons/mdi/restore';
import MdiPlaylistPlus from '~icons/mdi/playlist-plus';
import { h } from 'vue';
import { useProjectItemStore } from '~/stores/projectItem';
import { useExpenseStore } from '~/stores/expense';
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { formatPrice, formatDate, getCategoryLabel } from '~/utils';

// Editorial section label — small uppercase with a short rule after it.
const SectionLabel = (props, { slots }) => h(
  'div',
  { class: 'flex items-center gap-2.5 mb-3' },
  [
    h('span', { class: 'text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted' }, slots.default?.()),
    h('span', { class: 'flex-1 h-px bg-go-border-subtle' })
  ]
);

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  isClient: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'edit', 'assign', 'editExpense']);

const itemStore = useProjectItemStore();
const expenseStore = useExpenseStore();
const materialStore = useProjectMaterialStore();

const busy = ref(false);

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

// Group expenses by day for visual rhythm
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
  if (real < min) return { color: 'text-go-text', label: 'Por debajo del rango' };
  if (real <= max) return { color: 'text-go-success', label: 'Dentro del rango estimado' };
  const overPct = ((real - max) / max) * 100;
  if (overPct <= 25) return { color: 'text-go-warning', label: `+${Math.round(overPct)}% sobre el máximo` };
  return { color: 'text-go-danger', label: `+${Math.round(overPct)}% sobre el máximo` };
});

// Materials bar (spend relative to midpoint of range) — the only tracked metric
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

const statusLabel = computed(() => {
  if (!props.item) return '';
  if (props.item.actualEndDate) return 'Completada';
  if (props.item.actualStartDate) return 'En progreso';
  return 'Pendiente';
});
const statusTextColor = computed(() => {
  if (!props.item) return 'text-go-text-muted';
  if (props.item.actualEndDate) return 'text-go-success';
  if (props.item.actualStartDate) return 'text-go-info';
  return 'text-go-text-muted';
});
const statusDotBg = computed(() => {
  if (!props.item) return 'bg-go-text-muted';
  if (props.item.actualEndDate) return 'bg-go-success';
  if (props.item.actualStartDate) return 'bg-go-info';
  return 'bg-go-text-muted';
});

const dateRangeLabel = computed(() => {
  if (!props.item) return '';
  const start = formatDate(props.item.plannedStartDate);
  const end = formatDate(props.item.plannedEndDate);
  if (!start && !end) return '';
  return `${start} → ${end}`;
});

async function markStarted() {
  if (!props.item) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(props.item.id, { actualStartDate: new Date() });
    if (result.success) useToast('success', 'Item iniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function markCompleted() {
  if (!props.item) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(props.item.id, { actualEndDate: new Date() });
    if (result.success) useToast('success', 'Item completado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function resetProgress() {
  if (!props.item) return;
  if (!confirm('¿Reiniciar el progreso de este item? Se borrarán las fechas reales de inicio y fin.')) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(props.item.id, {
      actualStartDate: null,
      actualEndDate: null
    });
    if (result.success) useToast('success', 'Progreso reiniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function confirmDelete() {
  if (!props.item) return;
  const assigned = expenses.value;
  const message = assigned.length > 0
    ? `¿Eliminar el item "${props.item.name}"? Los ${assigned.length} ${assigned.length === 1 ? 'gasto asignado quedará' : 'gastos asignados quedarán'} sin asignar. Esta acción no se puede deshacer.`
    : `¿Eliminar el item "${props.item.name}"? Esta acción no se puede deshacer.`;
  if (!confirm(message)) return;
  busy.value = true;
  try {
    if (assigned.length > 0) {
      await expenseStore.batchUpdateItemId(assigned.map(e => ({ expenseId: e.id, itemId: null })));
    }
    const ok = await itemStore.deleteItem(props.item.id);
    if (ok) {
      useToast('success', 'Item eliminado');
      emit('close');
    } else {
      useToast('error', itemStore.error || 'Error al eliminar');
    }
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.detail-panel-enter-active,
.detail-panel-leave-active {
  transition: opacity 0.22s ease;
}
.detail-panel-enter-from,
.detail-panel-leave-to {
  opacity: 0;
}
.detail-panel-enter-active .detail-panel-surface,
.detail-panel-leave-active .detail-panel-surface {
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.detail-panel-enter-from .detail-panel-surface,
.detail-panel-leave-to .detail-panel-surface {
  transform: translateY(100%);
}
@media (min-width: 1024px) {
  .detail-panel-enter-from .detail-panel-surface,
  .detail-panel-leave-to .detail-panel-surface {
    transform: translateX(100%);
  }
}
</style>
