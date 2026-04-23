<template>
  <div v-if="task" class="px-5 py-5 space-y-5">
    <!-- Estado -->
    <section class="bg-go-surface border border-go-border-subtle rounded-go-md px-4 py-3 flex items-center gap-3">
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
    </section>

    <!-- Nombre -->
    <section>
      <label class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5 block">Nombre</label>
      <input
        v-model="nameDraft"
        :disabled="readonly"
        type="text"
        maxlength="120"
        @blur="saveName"
        @keydown.enter.prevent="$event.target.blur()"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60"
      />
    </section>

    <!-- Descripción -->
    <section>
      <label class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5 block">Descripción</label>
      <textarea
        v-model="descriptionDraft"
        :disabled="readonly"
        rows="4"
        maxlength="2000"
        placeholder="Qué hay que hacer, materiales, detalles..."
        @blur="saveDescription"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 resize-y"
      />
    </section>

    <!-- Galería -->
    <section>
      <label class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-1.5 block">Galería</label>
      <ProjectImageGallery
        :images="task.images || []"
        :endpoint-base="`/api/tasks/${task.id}`"
        :readonly="readonly"
        @uploaded="(img) => taskStore.addImageToTask(task.id, img)"
        @deleted="(id) => taskStore.removeImageFromTask(task.id, id)"
      />
    </section>
  </div>
</template>

<script setup>
import MdiCheck from '~icons/mdi/check';
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
  return task.value.status === 'completada' ? 'Completada' : 'Pendiente';
});
const statusColor = computed(() => {
  if (!task.value) return 'text-go-text-muted';
  return task.value.status === 'completada' ? 'text-go-success' : 'text-go-text';
});

const nameDraft = ref('');
const descriptionDraft = ref('');
const busy = ref(false);

watch(task, (t) => {
  if (!t) return;
  // Legacy: tasks created before the name/description split have only `description`.
  // Treat that legacy description as the name; keep the real description empty until migration writes.
  const isLegacy = !t.name && !!t.description;
  nameDraft.value = isLegacy ? (t.description || '') : (t.name || '');
  descriptionDraft.value = isLegacy ? '' : (t.description || '');
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

async function saveName() {
  if (!task.value) return;
  const next = nameDraft.value.trim();
  if (!next) {
    nameDraft.value = task.value.name || task.value.description || '';
    return;
  }
  const isLegacy = !task.value.name && !!task.value.description;
  if (!isLegacy && next === task.value.name) return;
  const patch = isLegacy ? { name: next, description: null } : { name: next };
  const result = await taskStore.updateTask(task.value.id, patch);
  if (!result.success) {
    useToast('error', result.error || 'Error al actualizar');
    nameDraft.value = task.value.name || task.value.description || '';
  }
}

async function saveDescription() {
  if (!task.value) return;
  const next = descriptionDraft.value.trim() || null;
  const current = task.value.name ? (task.value.description || null) : null;
  if (next === current) return;
  const result = await taskStore.updateTask(task.value.id, { description: next });
  if (!result.success) {
    useToast('error', result.error || 'Error al guardar');
    descriptionDraft.value = current || '';
  }
}

async function confirmDelete() {
  if (!task.value) return;
  const label = task.value.name || task.value.description || 'esta tarea';
  if (!confirm(`¿Eliminar la tarea "${label}"?`)) return;
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

defineExpose({ confirmDelete });
</script>
