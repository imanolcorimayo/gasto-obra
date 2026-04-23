<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-2.5 mb-3">
      <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted whitespace-nowrap">
        Tareas{{ tasks.length > 0 ? ` · ${tasks.length}` : '' }}
      </span>
      <span class="flex-1 h-px bg-go-border-subtle"></span>
      <span v-if="counts.total > 0" class="text-[10.5px] tabular-nums text-go-text-muted">
        {{ counts.done }}/{{ counts.total }}
      </span>
    </div>

    <!-- Empty state -->
    <p v-if="tasks.length === 0" class="text-[12px] text-go-text-muted italic">
      {{ readonly ? 'Sin tareas todavía.' : 'Sin tareas todavía. Agregá las acciones concretas (ej: "pintura", "cerámicos").' }}
    </p>

    <!-- List -->
    <ul v-else class="divide-y divide-go-border-subtle border-b border-go-border-subtle">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center gap-2.5 py-2.5"
      >
        <!-- Checkbox -->
        <button
          type="button"
          @click.stop="toggle(task)"
          :disabled="readonly || busyId === task.id"
          class="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors"
          :class="task.status === 'completada'
            ? 'bg-go-success border-go-success text-white'
            : 'bg-go-bg border-go-border hover:border-go-primary'"
          :title="task.status === 'completada' ? 'Marcar pendiente' : 'Marcar completada'"
        >
          <MdiCheck v-if="task.status === 'completada'" class="text-[13px]" />
        </button>

        <!-- Thumbnail (only when image exists) -->
        <img
          v-if="firstThumb(task)"
          :src="firstThumb(task)"
          alt=""
          loading="lazy"
          class="shrink-0 w-9 h-9 rounded-go-sm object-cover border border-go-border-subtle"
        />

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
            {{ displayName(task) }}
          </div>
          <div v-if="subtitle(task)" class="text-[10.5px] text-go-text-muted mt-0.5 truncate" :title="subtitle(task)">
            {{ subtitle(task) }}
          </div>
        </button>

        <MdiChevronRight class="text-[16px] text-go-text-muted shrink-0" />
      </li>
    </ul>

    <!-- Add task (button toggles inline input) -->
    <div v-if="!readonly" class="mt-3">
      <form
        v-if="showingInput"
        @submit.prevent="submitNew"
        class="flex items-center gap-2"
      >
        <input
          ref="inputRef"
          v-model="newDescription"
          type="text"
          maxlength="120"
          placeholder="Nombre de la tarea (ej: cerámicos, grifería)"
          class="flex-1 bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-[13px] text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          :disabled="creating"
          @keyup.escape="cancelAdd"
        />
        <button
          type="submit"
          :disabled="creating || !newDescription.trim()"
          class="shrink-0 w-9 h-9 flex items-center justify-center rounded-go-md bg-go-primary text-white hover:bg-go-primary-hover disabled:opacity-50 transition-colors"
          title="Agregar"
        >
          <MdiCheck class="text-[16px]" />
        </button>
        <button
          type="button"
          @click="cancelAdd"
          class="shrink-0 w-9 h-9 flex items-center justify-center rounded-go-md text-go-text-muted hover:text-go-text hover:bg-go-surface-hover transition-colors"
          title="Cancelar"
        >
          <MdiClose class="text-[16px]" />
        </button>
      </form>
      <button
        v-else
        type="button"
        @click="startAdd"
        class="text-[11.5px] font-semibold text-go-primary hover:text-go-primary-hover transition-colors inline-flex items-center gap-1"
      >
        <MdiPlus class="text-[14px]" />
        Agregar tarea
      </button>
    </div>
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiCheck from '~icons/mdi/check';
import MdiClose from '~icons/mdi/close';
import MdiChevronRight from '~icons/mdi/chevron-right';
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
const showingInput = ref(false);
const inputRef = ref(null);

function startAdd() {
  showingInput.value = true;
  nextTick(() => inputRef.value?.focus?.());
}
function cancelAdd() {
  showingInput.value = false;
  newDescription.value = '';
}

async function submitNew() {
  const name = newDescription.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const result = await taskStore.createTask({
      projectId: props.item.projectId,
      providerId: props.item.providerId,
      itemId: props.item.id,
      name
    });
    if (result.success) {
      newDescription.value = '';
      nextTick(() => inputRef.value?.focus?.());
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

function firstThumb(task) {
  return task.images?.[0]?.thumbUrl || task.images?.[0]?.url || null;
}

function displayName(task) {
  return task.name || task.description || '';
}

function subtitle(task) {
  if (task.completedAt) return `Finalizada ${formatDate(task.completedAt)}`;
  // Only show description as subtitle when it's actually a description (task has a name).
  if (task.name && task.description) return task.description;
  return '';
}
</script>
