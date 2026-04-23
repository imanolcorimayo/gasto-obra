<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted">Tareas</span>
        <span class="flex-1 h-px bg-go-border-subtle" style="min-width: 24px;" />
      </div>
      <span v-if="counts.total > 0" class="text-[10.5px] text-go-text-muted tabular-nums">
        {{ counts.done }}/{{ counts.total }}
      </span>
    </div>

    <!-- Quick add (provider only) -->
    <form
      v-if="!readonly"
      @submit.prevent="submitNew"
      class="flex items-center gap-2 mb-3"
    >
      <input
        v-model="newDescription"
        type="text"
        maxlength="300"
        placeholder="Agregar tarea (ej: cerámicos, grifería)"
        class="flex-1 bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        :disabled="creating"
      />
      <button
        type="submit"
        :disabled="creating || !newDescription.trim()"
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-go-md bg-go-primary text-white hover:bg-go-primary-hover disabled:opacity-50 transition-colors"
        title="Agregar tarea"
      >
        <MdiPlus class="text-[16px]" />
      </button>
    </form>

    <!-- Empty state -->
    <p v-if="tasks.length === 0" class="text-[12px] text-go-text-muted italic">
      {{ readonly ? 'Sin tareas todavía.' : 'Sin tareas todavía. Agregá las acciones concretas (ej: "pintura", "cerámicos").' }}
    </p>

    <!-- List -->
    <ul v-else class="divide-y divide-go-border-subtle">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="flex items-start gap-3 py-2.5 group"
      >
        <!-- Checkbox -->
        <button
          type="button"
          @click.stop="toggle(task)"
          :disabled="readonly || busyId === task.id"
          class="shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors"
          :class="task.status === 'completada'
            ? 'bg-go-success border-go-success text-white'
            : 'bg-go-bg border-go-border hover:border-go-primary'"
          :title="task.status === 'completada' ? 'Marcar pendiente' : 'Marcar completada'"
        >
          <MdiCheck v-if="task.status === 'completada'" class="text-[13px]" />
        </button>

        <!-- Body (click opens drawer) -->
        <button
          type="button"
          @click="$emit('openTask', task.id)"
          class="flex-1 min-w-0 text-left group/row"
        >
          <div
            class="text-[13px] leading-snug"
            :class="task.status === 'completada' ? 'text-go-text-muted line-through' : 'text-go-text group-hover/row:text-go-primary transition-colors'"
          >
            {{ task.description }}
          </div>
          <div v-if="task.completedAt" class="text-[10.5px] text-go-text-muted mt-0.5 tabular-nums">
            Finalizada {{ formatDate(task.completedAt) }}
          </div>
          <div v-else-if="task.notes" class="text-[10.5px] text-go-text-muted mt-0.5 truncate" :title="task.notes">
            {{ task.notes }}
          </div>
        </button>

        <!-- Quick delete (provider only) -->
        <button
          v-if="!readonly"
          type="button"
          @click.stop="confirmDelete(task)"
          :disabled="busyId === task.id"
          class="shrink-0 w-7 h-7 flex items-center justify-center text-go-text-muted hover:text-go-danger hover:bg-go-danger/10 rounded-go-sm transition-colors opacity-0 group-hover:opacity-100"
          title="Eliminar tarea"
        >
          <MdiDelete class="text-[14px]" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiCheck from '~icons/mdi/check';
import MdiDelete from '~icons/mdi/delete';
import { useProjectTaskStore } from '~/stores/projectTask';
import { formatDate } from '~/utils';

const props = defineProps({
  item: { type: Object, required: true },
  readonly: { type: Boolean, default: false }
});

const emit = defineEmits(['openTask']);

const taskStore = useProjectTaskStore();

const tasks = computed(() => taskStore.tasksForItem(props.item.id));
const counts = computed(() => taskStore.itemTaskCounts(props.item.id));

const newDescription = ref('');
const creating = ref(false);
const busyId = ref(null);

async function submitNew() {
  const desc = newDescription.value.trim();
  if (!desc) return;
  creating.value = true;
  try {
    const result = await taskStore.createTask({
      projectId: props.item.projectId,
      providerId: props.item.providerId,
      itemId: props.item.id,
      description: desc
    });
    if (result.success) {
      newDescription.value = '';
    } else {
      useToast('error', result.error || 'Error al agregar tarea');
    }
  } finally {
    creating.value = false;
  }
}

async function toggle(task) {
  busyId.value = task.id;
  try {
    const result = await taskStore.toggleTaskDone(task.id);
    if (!result.success) useToast('error', result.error || 'Error al actualizar');
  } finally {
    busyId.value = null;
  }
}

async function confirmDelete(task) {
  if (!confirm(`¿Eliminar la tarea "${task.description}"?`)) return;
  busyId.value = task.id;
  try {
    const ok = await taskStore.deleteTask(task.id);
    if (!ok) useToast('error', taskStore.error || 'Error al eliminar');
  } finally {
    busyId.value = null;
  }
}
</script>
