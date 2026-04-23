<template>
  <div v-if="task" class="px-5 py-5 space-y-5">
    <!-- Status + completed date -->
    <section class="bg-go-surface border border-go-border-subtle rounded-go-md px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            @click="toggle"
            :disabled="readonly || busy"
            class="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors"
            :class="task.status === 'completada'
              ? 'bg-go-success border-go-success text-white'
              : 'bg-go-bg border-go-border hover:border-go-primary'"
            :title="task.status === 'completada' ? 'Marcar pendiente' : 'Marcar completada'"
          >
            <MdiCheck v-if="task.status === 'completada'" class="text-[13px]" />
          </button>
          <div class="min-w-0">
            <p class="text-[12.5px] font-semibold" :class="statusColor">{{ statusLabel }}</p>
            <p v-if="task.completedAt" class="text-[10.5px] text-go-text-muted tabular-nums mt-0.5">
              Finalizada {{ formatDate(task.completedAt) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Description -->
    <section>
      <label class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5 block">Descripción</label>
      <textarea
        v-model="descriptionDraft"
        :disabled="readonly"
        rows="2"
        maxlength="300"
        @blur="saveDescription"
        @keydown.enter.prevent="$event.target.blur()"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 resize-none"
      />
    </section>

    <!-- Notes -->
    <section>
      <label class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5 block">Notas</label>
      <textarea
        v-model="notesDraft"
        :disabled="readonly"
        rows="4"
        maxlength="2000"
        placeholder="Detalles, materiales pendientes, observaciones..."
        @blur="saveNotes"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 resize-y"
      />
      <p v-if="savingNotes" class="text-[10.5px] text-go-text-muted mt-1">Guardando...</p>
    </section>

    <!-- Delete -->
    <section v-if="!readonly" class="pt-4 border-t border-go-border-subtle">
      <button
        type="button"
        @click="confirmDelete"
        :disabled="busy"
        class="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-go-danger px-2.5 py-1.5 rounded-go-md hover:bg-go-danger/10 transition-colors disabled:opacity-50"
      >
        <MdiDelete class="text-[14px]" />
        Eliminar tarea
      </button>
    </section>
  </div>
</template>

<script setup>
import MdiCheck from '~icons/mdi/check';
import MdiDelete from '~icons/mdi/delete';
import { useProjectTaskStore } from '~/stores/projectTask';
import { formatDate } from '~/utils';

const props = defineProps({
  taskId: { type: String, required: true },
  readonly: { type: Boolean, default: false }
});

const emit = defineEmits(['deleted']);

const taskStore = useProjectTaskStore();

const task = computed(() => taskStore.tasks.find(t => t.id === props.taskId) || null);

const statusLabel = computed(() => {
  if (!task.value) return '';
  if (task.value.status === 'completada') return 'Completada';
  if (task.value.status === 'en_progreso') return 'En progreso';
  return 'Pendiente';
});
const statusColor = computed(() => {
  if (!task.value) return 'text-go-text-muted';
  if (task.value.status === 'completada') return 'text-go-success';
  if (task.value.status === 'en_progreso') return 'text-go-info';
  return 'text-go-text-muted';
});

const descriptionDraft = ref('');
const notesDraft = ref('');
const busy = ref(false);
const savingNotes = ref(false);

watch(task, (t) => {
  if (!t) return;
  descriptionDraft.value = t.description || '';
  notesDraft.value = t.notes || '';
}, { immediate: true });

async function toggle() {
  if (!task.value) return;
  busy.value = true;
  try {
    const result = await taskStore.toggleTaskDone(task.value.id);
    if (!result.success) useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function saveDescription() {
  if (!task.value) return;
  const next = descriptionDraft.value.trim();
  if (!next || next === task.value.description) {
    descriptionDraft.value = task.value.description || '';
    return;
  }
  const result = await taskStore.updateTask(task.value.id, { description: next });
  if (!result.success) {
    useToast('error', result.error || 'Error al actualizar');
    descriptionDraft.value = task.value.description || '';
  }
}

async function saveNotes() {
  if (!task.value) return;
  const next = notesDraft.value.trim() || null;
  const current = task.value.notes || null;
  if (next === current) return;
  savingNotes.value = true;
  try {
    const result = await taskStore.updateTask(task.value.id, { notes: next });
    if (!result.success) {
      useToast('error', result.error || 'Error al guardar notas');
      notesDraft.value = current || '';
    }
  } finally {
    savingNotes.value = false;
  }
}

async function confirmDelete() {
  if (!task.value) return;
  if (!confirm(`¿Eliminar la tarea "${task.value.description}"?`)) return;
  busy.value = true;
  try {
    const ok = await taskStore.deleteTask(task.value.id);
    if (ok) {
      useToast('success', 'Tarea eliminada');
      emit('deleted');
    } else {
      useToast('error', taskStore.error || 'Error al eliminar');
    }
  } finally {
    busy.value = false;
  }
}
</script>
