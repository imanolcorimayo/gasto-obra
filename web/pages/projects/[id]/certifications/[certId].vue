<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <NuxtLink
        :to="`/projects/${route.params.id}/certifications`"
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-go-md hover:bg-go-surface-hover text-go-text-secondary"
      >
        <MdiArrowLeft class="text-[18px]" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="font-display font-bold text-lg text-go-text truncate">
            {{ cert?.title || (cert ? `Certificación N° ${cert.number}` : 'Certificación') }}
          </h1>
          <span
            v-if="cert"
            class="shrink-0 text-[9px] uppercase font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-full"
            :class="statusPillClasses(cert.status)"
          >
            {{ cert.status === 'issued' ? 'Emitida' : 'Borrador' }}
          </span>
        </div>
        <p class="text-[11px] text-go-text-muted mt-0.5 tabular-nums">
          {{ cert ? periodLabel(cert) : '' }}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="cert && cert.status === 'draft'"
          @click="confirmDelete"
          class="inline-flex items-center gap-1 text-[12.5px] font-semibold text-go-danger hover:bg-go-danger/10 px-2.5 py-1.5 rounded-go-md transition-colors"
          title="Eliminar borrador"
        >
          <MdiDelete class="text-[15px]" />
          <span class="hidden sm:inline">Eliminar</span>
        </button>
        <button
          @click="downloadPdf"
          :disabled="!cert || generatingPdf"
          class="inline-flex items-center gap-1 text-[12.5px] font-semibold text-go-text-secondary hover:bg-go-surface-hover px-2.5 py-1.5 rounded-go-md transition-colors disabled:opacity-60"
        >
          <MdiDownload class="text-[15px]" />
          <span class="hidden sm:inline">PDF</span>
        </button>
        <button
          v-if="cert && cert.status === 'draft'"
          @click="confirmIssue"
          :disabled="issuing || (cert.lines || []).length === 0"
          class="inline-flex items-center gap-1.5 bg-go-primary text-white px-3 py-1.5 rounded-go-md text-[12.5px] font-bold hover:bg-go-primary-hover transition-colors disabled:opacity-60"
        >
          <MdiCheckCircle class="text-[15px]" />
          <span class="hidden sm:inline">Emitir</span>
        </button>
      </div>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5 max-w-[1100px] mx-auto">
      <AppLoader v-if="!cert && certStore.isLoading" text="Cargando..." />

      <div v-else-if="!cert" class="text-center py-16">
        <h2 class="font-display text-lg font-semibold text-go-text-secondary">Certificación no encontrada</h2>
        <p class="text-[13px] text-go-text-muted mt-1">Puede que haya sido eliminada.</p>
      </div>

      <div v-else class="space-y-5">
        <!-- Meta -->
        <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-4 lg:p-5">
          <h2 class="text-[11px] uppercase tracking-[0.08em] font-bold text-go-text-muted mb-3">Datos</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <span class="block text-[11px] font-semibold text-go-text-secondary mb-1">Título</span>
              <input
                v-model="titleDraft"
                @blur="saveMeta"
                :disabled="!isDraft"
                :placeholder="`Certificación N° ${cert.number}`"
                type="text"
                class="w-full bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-3 py-2 text-[13px] text-go-text focus:border-go-primary focus:outline-none disabled:opacity-70"
              />
            </label>
            <label class="block">
              <span class="block text-[11px] font-semibold text-go-text-secondary mb-1">Fecha de emisión</span>
              <input
                v-model="issueDateDraft"
                @blur="saveMeta"
                :disabled="!isDraft"
                type="date"
                class="w-full bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-3 py-2 text-[13px] text-go-text focus:border-go-primary focus:outline-none disabled:opacity-70"
              />
            </label>
            <label class="block">
              <span class="block text-[11px] font-semibold text-go-text-secondary mb-1">Período desde</span>
              <input
                v-model="periodStartDraft"
                @blur="saveMeta"
                :disabled="!isDraft"
                type="date"
                class="w-full bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-3 py-2 text-[13px] text-go-text focus:border-go-primary focus:outline-none disabled:opacity-70"
              />
            </label>
            <label class="block">
              <span class="block text-[11px] font-semibold text-go-text-secondary mb-1">Período hasta</span>
              <input
                v-model="periodEndDraft"
                @blur="saveMeta"
                :disabled="!isDraft"
                type="date"
                class="w-full bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-3 py-2 text-[13px] text-go-text focus:border-go-primary focus:outline-none disabled:opacity-70"
              />
            </label>
          </div>
        </section>

        <!-- Lines -->
        <section class="bg-go-surface border border-go-border-subtle rounded-go-xl">
          <div class="px-4 lg:px-5 py-3 border-b border-go-border-subtle flex items-center justify-between gap-3">
            <h2 class="text-[11px] uppercase tracking-[0.08em] font-bold text-go-text-muted">Detalle</h2>
            <div v-if="isDraft" class="flex items-center gap-2">
              <button
                @click="openItemPicker"
                class="inline-flex items-center gap-1 text-[12px] font-bold text-go-primary hover:bg-go-primary-muted px-2 py-1 rounded-go-md transition-colors"
              >
                <MdiPlus class="text-[14px]" />
                Agregar ítem
              </button>
              <button
                @click="openTaskPicker"
                class="inline-flex items-center gap-1 text-[12px] font-bold text-go-primary hover:bg-go-primary-muted px-2 py-1 rounded-go-md transition-colors"
              >
                <MdiPlus class="text-[14px]" />
                Agregar tarea
              </button>
            </div>
          </div>

          <div v-if="(cert.lines || []).length === 0" class="px-4 lg:px-5 py-10 text-center">
            <p class="text-[13px] text-go-text-muted">Sin líneas. Agregá ítems o tareas para certificar el avance.</p>
          </div>

          <!-- Header row (desktop) -->
          <div
            v-else
            class="hidden md:grid px-4 lg:px-5 py-2 text-[10px] uppercase tracking-[0.08em] font-bold text-go-text-muted border-b border-go-border-subtle"
            :style="{ gridTemplateColumns: isDraft ? '1fr 90px 90px 140px 36px' : '1fr 90px 90px 140px' }"
          >
            <div>Concepto</div>
            <div class="text-right">% Acum.</div>
            <div class="text-right">% Período</div>
            <div class="text-right">Importe</div>
            <div v-if="isDraft"></div>
          </div>

          <div v-if="(cert.lines || []).length > 0" class="divide-y divide-go-border-subtle">
            <div
              v-for="(line, idx) in cert.lines"
              :key="line.id"
              class="px-4 lg:px-5 py-3 md:grid md:items-center md:gap-3 flex flex-col gap-2"
              :style="{ gridTemplateColumns: isDraft ? '1fr 90px 90px 140px 36px' : '1fr 90px 90px 140px' }"
            >
              <!-- Concept -->
              <div class="min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="shrink-0 text-[9px] uppercase font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-full"
                    :class="line.kind === 'item' ? 'bg-go-primary-muted text-go-primary' : 'bg-go-surface-alt text-go-text-tertiary'"
                  >
                    {{ line.kind === 'item' ? 'Ítem' : 'Tarea' }}
                  </span>
                  <span class="font-display font-semibold text-[13.5px] text-go-text truncate">{{ line.label }}</span>
                </div>
                <div v-if="line.kind === 'item' && itemTaskProgressLabel(line.refId)" class="text-[11px] text-go-text-muted tabular-nums mt-0.5">
                  {{ itemTaskProgressLabel(line.refId) }}
                </div>
              </div>

              <!-- % Acum -->
              <div class="md:text-right">
                <span v-if="line.kind === 'item'" class="text-[12px] text-go-text-muted md:hidden">% Acum.:&nbsp;</span>
                <template v-if="line.kind === 'item' && isDraft">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    :value="line.percentCumulative"
                    @change="onPercentCumulativeChange(idx, $event)"
                    class="w-20 bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-2 py-1 text-[12.5px] text-go-text tabular-nums text-right focus:border-go-primary focus:outline-none"
                  />
                </template>
                <template v-else-if="line.kind === 'item'">
                  <span class="text-[12.5px] text-go-text tabular-nums">{{ line.percentCumulative ?? 0 }}%</span>
                </template>
                <span v-else class="text-[12.5px] text-go-text-muted tabular-nums md:inline">—</span>
              </div>

              <!-- % Periodo -->
              <div class="md:text-right">
                <span v-if="line.kind === 'item'" class="text-[12px] text-go-text-muted md:hidden">% Período:&nbsp;</span>
                <span v-if="line.kind === 'item'" class="text-[12.5px] font-semibold text-go-text tabular-nums">
                  {{ line.percentPeriod ?? 0 }}%
                </span>
                <span v-else class="text-[12.5px] text-go-text-muted tabular-nums md:inline">—</span>
              </div>

              <!-- Importe -->
              <div class="md:text-right">
                <span class="text-[12px] text-go-text-muted md:hidden">Importe:&nbsp;</span>
                <template v-if="isDraft">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    :value="line.amount"
                    @change="onAmountChange(idx, $event)"
                    class="w-32 bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-2 py-1 text-[12.5px] text-go-text tabular-nums text-right focus:border-go-primary focus:outline-none"
                  />
                </template>
                <template v-else>
                  <span class="font-display font-bold text-[13px] text-go-text tabular-nums">{{ formatPrice(line.amount || 0) }}</span>
                </template>
              </div>

              <!-- Remove -->
              <div v-if="isDraft" class="md:text-right">
                <button
                  @click="removeLine(idx)"
                  class="w-7 h-7 flex items-center justify-center rounded-go-md text-go-text-muted hover:text-go-danger hover:bg-go-danger/10 transition-colors"
                  title="Quitar línea"
                >
                  <MdiClose class="text-[15px]" />
                </button>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div
            v-if="(cert.lines || []).length > 0"
            class="px-4 lg:px-5 py-3 border-t border-go-border-subtle flex items-center justify-between"
          >
            <span class="text-[12px] uppercase tracking-[0.08em] font-bold text-go-text-muted">Total</span>
            <span class="font-display font-bold text-[15px] text-go-text tabular-nums">{{ formatPrice(total) }}</span>
          </div>
        </section>

        <!-- Notas -->
        <section class="bg-go-surface border border-go-border-subtle rounded-go-xl p-4 lg:p-5">
          <h2 class="text-[11px] uppercase tracking-[0.08em] font-bold text-go-text-muted mb-2">Notas</h2>
          <textarea
            v-model="notesDraft"
            @blur="saveNotes"
            :disabled="!isDraft"
            rows="3"
            placeholder="Observaciones del período (opcional)"
            class="w-full bg-go-bg-elevated border border-go-border-subtle rounded-go-md px-3 py-2 text-[13px] text-go-text focus:border-go-primary focus:outline-none disabled:opacity-70 resize-none"
          />
        </section>
      </div>
    </div>

    <!-- Item picker modal -->
    <AppModal ref="itemPickerRef" title="Agregar ítem">
      <div class="space-y-2 max-h-[50vh] overflow-y-auto">
        <p v-if="availableItems.length === 0" class="text-[13px] text-go-text-muted text-center py-6">
          No hay ítems disponibles.
        </p>
        <button
          v-for="i in availableItems"
          :key="i.id"
          @click="addItemLine(i)"
          class="w-full text-left px-3 py-2.5 rounded-go-md border border-go-border-subtle hover:border-go-primary hover:bg-go-primary-muted/30 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="font-display font-semibold text-[13.5px] text-go-text truncate flex-1 min-w-0">{{ i.name }}</span>
            <span class="shrink-0 text-[11px] text-go-text-muted tabular-nums">{{ formatPrice(itemMidpoint(i)) }}</span>
          </div>
          <div class="text-[11px] text-go-text-muted mt-0.5 tabular-nums">
            Avance actual: {{ currentItemPercent(i.id) }}% · Ya certificado: {{ lastIssuedItemPercent(i.id) }}%
          </div>
        </button>
      </div>
    </AppModal>

    <!-- Task picker modal -->
    <AppModal ref="taskPickerRef" title="Agregar tarea">
      <div class="space-y-2 max-h-[50vh] overflow-y-auto">
        <p v-if="availableTasks.length === 0" class="text-[13px] text-go-text-muted text-center py-6">
          No hay tareas disponibles.
        </p>
        <button
          v-for="t in availableTasks"
          :key="t.id"
          @click="addTaskLine(t)"
          class="w-full text-left px-3 py-2.5 rounded-go-md border border-go-border-subtle hover:border-go-primary hover:bg-go-primary-muted/30 transition-colors"
        >
          <div class="font-display font-semibold text-[13.5px] text-go-text truncate">
            {{ t.name || t.description || 'Tarea' }}
          </div>
          <div class="text-[11px] text-go-text-muted mt-0.5">
            {{ itemNameFor(t.itemId) }} · {{ t.status === 'completada' ? 'Completada' : 'Pendiente' }}
          </div>
        </button>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import MdiDelete from '~icons/mdi/delete';
import MdiDownload from '~icons/mdi/download';
import MdiCheckCircle from '~icons/mdi/check-circle';
import { useProjectStore } from '~/stores/project';
import { useProjectItemStore, itemMidpoint } from '~/stores/projectItem';
import { useProjectTaskStore } from '~/stores/projectTask';
import { useProjectCertificationStore } from '~/stores/projectCertification';
import { useProviderStore } from '~/stores/provider';
import { formatPrice, formatDate } from '~/utils';
import { generateCertificationReport } from '~/utils/pdfReport';

definePageMeta({
  layout: 'project',
  middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const itemStore = useProjectItemStore();
const taskStore = useProjectTaskStore();
const certStore = useProjectCertificationStore();
const providerStore = useProviderStore();

const cert = computed(() => certStore.byId(route.params.certId));
const isDraft = computed(() => cert.value?.status === 'draft');
const total = computed(() => (cert.value?.lines || []).reduce((s, l) => s + (l.amount || 0), 0));

const titleDraft = ref('');
const notesDraft = ref('');
const periodStartDraft = ref('');
const periodEndDraft = ref('');
const issueDateDraft = ref('');

const itemPickerRef = ref(null);
const taskPickerRef = ref(null);

const issuing = ref(false);
const generatingPdf = ref(false);

useHead({ title: 'Certificación' });

onMounted(async () => {
  const id = route.params.id;
  if (!projectStore.currentProject || projectStore.currentProject.id !== id) {
    await projectStore.fetchProject(id);
  }
  await Promise.all([
    certStore.certifications.length ? Promise.resolve() : certStore.fetchByProjectId(id),
    itemStore.items.length ? Promise.resolve() : itemStore.fetchByProjectId(id),
    taskStore.tasks.length ? Promise.resolve() : taskStore.fetchByProjectId(id),
    providerStore.email ? Promise.resolve() : providerStore.fetchOrCreate()
  ]);
  hydrateDrafts();
});

watch(cert, () => hydrateDrafts());

function hydrateDrafts() {
  if (!cert.value) return;
  titleDraft.value = cert.value.title || '';
  notesDraft.value = cert.value.notes || '';
  periodStartDraft.value = toDateInput(cert.value.periodStart);
  periodEndDraft.value = toDateInput(cert.value.periodEnd);
  issueDateDraft.value = toDateInput(cert.value.issueDate);
}

function toDateInput(d) {
  if (!d) return '';
  const date = d.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateInput(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function periodLabel(c) {
  const end = formatDate(c.periodEnd);
  const start = formatDate(c.periodStart);
  if (start && end) return `${start} → ${end}`;
  if (end) return `Hasta ${end}`;
  return 'Sin período';
}

function statusPillClasses(status) {
  if (status === 'issued') return 'bg-go-success-muted text-go-success';
  return 'bg-go-surface-alt text-go-text-tertiary';
}

async function saveMeta() {
  if (!cert.value || !isDraft.value) return;
  const patch = {
    title: titleDraft.value.trim() || null,
    periodStart: fromDateInput(periodStartDraft.value),
    periodEnd: fromDateInput(periodEndDraft.value),
    issueDate: fromDateInput(issueDateDraft.value) || new Date()
  };
  await certStore.updateCertification(cert.value.id, patch);
}

async function saveNotes() {
  if (!cert.value || !isDraft.value) return;
  if ((cert.value.notes || '') === notesDraft.value) return;
  await certStore.updateCertification(cert.value.id, { notes: notesDraft.value.trim() || null });
}

// ── Lines helpers ──
function currentItemPercent(itemId) {
  const p = taskStore.itemTaskProgress(itemId);
  if (p == null) return 0;
  return Math.round(p * 100);
}

function lastIssuedItemPercent(itemId) {
  return certStore.lastIssuedPercentForItem(route.params.id, itemId);
}

function itemTaskProgressLabel(itemId) {
  const counts = taskStore.itemTaskCounts(itemId);
  if (counts.total === 0) return null;
  return `Tareas: ${counts.done}/${counts.total}`;
}

function itemNameFor(itemId) {
  const it = itemStore.items.find(i => i.id === itemId);
  return it?.name || 'Ítem';
}

const availableItems = computed(() => {
  const used = new Set((cert.value?.lines || []).filter(l => l.kind === 'item').map(l => l.refId));
  return itemStore.items.filter(i => !used.has(i.id));
});

const availableTasks = computed(() => {
  const used = new Set((cert.value?.lines || []).filter(l => l.kind === 'task').map(l => l.refId));
  return taskStore.tasks.filter(t => !used.has(t.id));
});

function openItemPicker() {
  itemPickerRef.value?.open();
}
function openTaskPicker() {
  taskPickerRef.value?.open();
}

function genLineId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function addItemLine(item) {
  if (!cert.value) return;
  const cumulative = currentItemPercent(item.id);
  const prior = lastIssuedItemPercent(item.id);
  const period = Math.max(0, cumulative - prior);
  const budget = itemMidpoint(item);
  const amount = Math.round((period / 100) * budget);
  const line = {
    id: genLineId(),
    kind: 'item',
    refId: item.id,
    label: item.name,
    percentCumulative: cumulative,
    percentPeriod: period,
    amount,
    notes: null
  };
  const lines = [...(cert.value.lines || []), line];
  await certStore.updateLines(cert.value.id, lines);
  itemPickerRef.value?.close();
}

async function addTaskLine(task) {
  if (!cert.value) return;
  const label = task.name || task.description || 'Tarea';
  const line = {
    id: genLineId(),
    kind: 'task',
    refId: task.id,
    label,
    percentCumulative: null,
    percentPeriod: null,
    amount: 0,
    notes: null
  };
  const lines = [...(cert.value.lines || []), line];
  await certStore.updateLines(cert.value.id, lines);
  taskPickerRef.value?.close();
}

async function removeLine(idx) {
  if (!cert.value) return;
  const lines = [...(cert.value.lines || [])];
  lines.splice(idx, 1);
  await certStore.updateLines(cert.value.id, lines);
}

async function onPercentCumulativeChange(idx, event) {
  if (!cert.value) return;
  const raw = Number(event.target.value);
  const pct = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
  const lines = [...(cert.value.lines || [])];
  const line = { ...lines[idx] };
  const prior = line.kind === 'item' ? lastIssuedItemPercent(line.refId) : 0;
  const period = Math.max(0, pct - prior);
  const item = itemStore.items.find(i => i.id === line.refId);
  const budget = item ? itemMidpoint(item) : 0;
  line.percentCumulative = pct;
  line.percentPeriod = period;
  line.amount = Math.round((period / 100) * budget);
  lines[idx] = line;
  await certStore.updateLines(cert.value.id, lines);
}

async function onAmountChange(idx, event) {
  if (!cert.value) return;
  const raw = Number(event.target.value);
  const amount = Math.max(0, Number.isFinite(raw) ? raw : 0);
  const lines = [...(cert.value.lines || [])];
  lines[idx] = { ...lines[idx], amount };
  await certStore.updateLines(cert.value.id, lines);
}

// ── Actions ──
async function confirmDelete() {
  if (!cert.value) return;
  if (!confirm('¿Eliminar esta certificación? Esta acción no se puede deshacer.')) return;
  const ok = await certStore.deleteCertification(cert.value.id);
  if (ok) {
    useToast('success', 'Certificación eliminada');
    router.push(`/projects/${route.params.id}/certifications`);
  } else {
    useToast('error', certStore.error || 'Error al eliminar');
  }
}

async function confirmIssue() {
  if (!cert.value) return;
  if ((cert.value.lines || []).length === 0) {
    useToast('error', 'Agregá al menos una línea antes de emitir');
    return;
  }
  if (!confirm('Una vez emitida, la certificación quedará congelada. ¿Continuar?')) return;
  issuing.value = true;
  try {
    const result = await certStore.issueCertification(cert.value.id);
    if (result.success) {
      useToast('success', 'Certificación emitida');
    } else {
      useToast('error', result.error || 'Error al emitir');
    }
  } finally {
    issuing.value = false;
  }
}

async function downloadPdf() {
  if (!cert.value) return;
  generatingPdf.value = true;
  try {
    const project = projectStore.currentProject;
    generateCertificationReport({
      provider: {
        name: providerStore.displayName || providerStore.businessName || '',
        email: providerStore.email || '',
        phone: providerStore.additionalContact || null
      },
      project: {
        name: project?.name || '',
        clientName: project?.clientName || '',
        address: project?.address || ''
      },
      certification: cert.value
    });
  } catch (e) {
    console.error(e);
    useToast('error', 'Error al generar PDF');
  } finally {
    generatingPdf.value = false;
  }
}
</script>
