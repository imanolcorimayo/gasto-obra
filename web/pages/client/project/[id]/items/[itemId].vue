<template>
  <div>
    <header class="bg-go-bg-elevated border-b border-go-border-subtle">
      <div class="px-4 lg:px-6 py-3 lg:py-4 max-w-[1600px] mx-auto">
        <div class="flex items-center justify-between gap-3 min-w-0">
          <NuxtLink
            :to="`/client/project/${route.params.id}/items`"
            class="flex items-center gap-1 text-[11.5px] text-go-text-muted hover:text-go-primary transition-colors shrink-0 min-w-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span class="truncate">Items de la obra</span>
          </NuxtLink>

          <div v-if="item" class="flex items-center gap-1 shrink-0">
            <span v-if="itemStore.items.length > 1" class="text-[10.5px] text-go-text-muted tabular-nums mr-1.5">
              {{ currentIndex + 1 }}/{{ itemStore.items.length }}
            </span>
            <NuxtLink
              v-if="prevItem"
              :to="`/client/project/${route.params.id}/items/${prevItem.id}`"
              class="w-8 h-8 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-go-md transition-colors"
              :title="`Anterior: ${prevItem.name}`"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </NuxtLink>
            <span v-else class="w-8 h-8" />
            <NuxtLink
              v-if="nextItem"
              :to="`/client/project/${route.params.id}/items/${nextItem.id}`"
              class="w-8 h-8 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-go-md transition-colors"
              :title="`Siguiente: ${nextItem.name}`"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </NuxtLink>
            <span v-else class="w-8 h-8" />
          </div>
        </div>

        <div v-if="item" class="mt-3">
          <div class="flex items-center gap-2 mb-1">
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
          <h1 class="font-display font-bold text-go-text text-[22px] lg:text-[28px] leading-[1.1] truncate">
            {{ item.name }}
          </h1>
        </div>
      </div>
    </header>

    <AppLoader v-if="isLoading" text="Cargando item..." />

    <div v-else-if="!item" class="text-center py-16 px-4">
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Item no encontrado</h2>
      <NuxtLink
        :to="`/client/project/${route.params.id}/items`"
        class="text-go-primary text-sm mt-4 inline-block hover:underline"
      >&larr; Volver a items</NuxtLink>
    </div>

    <main v-else class="px-4 lg:px-6 py-5 lg:py-6 max-w-[1600px] mx-auto">
      <ProjectItemDetailView :item="item" :is-client="true" />
    </main>
  </div>
</template>

<script setup>
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useProjectItemStore } from '~/stores/projectItem';
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { useProjectTaskStore } from '~/stores/projectTask';
import { getCurrentUserAsync } from '~/utils/firebase';
import { formatDate } from '~/utils';

definePageMeta({
  layout: 'client-project',
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();
const itemStore = useProjectItemStore();
const materialStore = useProjectMaterialStore();
const taskStore = useProjectTaskStore();

const isLoading = ref(true);
const project = ref(null);

const item = computed(() => {
  const id = route.params.itemId;
  return itemStore.items.find(i => i.id === id) || null;
});

const currentIndex = computed(() => {
  if (!item.value) return -1;
  return itemStore.items.findIndex(i => i.id === item.value.id);
});
const prevItem = computed(() => {
  const idx = currentIndex.value;
  return idx > 0 ? itemStore.items[idx - 1] : null;
});
const nextItem = computed(() => {
  const idx = currentIndex.value;
  if (idx === -1) return null;
  return idx < itemStore.items.length - 1 ? itemStore.items[idx + 1] : null;
});

const effectiveState = computed(() => {
  if (!item.value) return 'pendiente';
  const counts = taskStore.itemTaskCounts(item.value.id);
  if (counts.total > 0) {
    if (counts.done === 0) return 'pendiente';
    if (counts.done === counts.total) return 'completada';
    return 'en_progreso';
  }
  if (item.value.actualEndDate) return 'completada';
  if (item.value.actualStartDate) return 'en_progreso';
  return 'pendiente';
});
const statusLabel = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'Completada';
  if (s === 'en_progreso') return 'En progreso';
  return 'Pendiente';
});
const statusTextColor = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'text-go-success';
  if (s === 'en_progreso') return 'text-go-info';
  return 'text-go-text-muted';
});
const statusDotBg = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'bg-go-success';
  if (s === 'en_progreso') return 'bg-go-info';
  return 'bg-go-text-muted';
});
const dateRangeLabel = computed(() => {
  if (!item.value) return '';
  const start = formatDate(item.value.plannedStartDate);
  const end = formatDate(item.value.plannedEndDate);
  if (!start && !end) return '';
  return `${start} → ${end}`;
});

useHead({ title: computed(() => item.value?.name || 'Item') });

onMounted(async () => {
  const id = route.params.id;
  const needsFetch = itemStore.items.length === 0
    || !itemStore.items.some(i => i.projectId === id);

  const user = await getCurrentUserAsync();
  if (!user) {
    isLoading.value = false;
    return;
  }

  if (!needsFetch) {
    const cached = projectStore.projects.find(p => p.id === id);
    if (cached) project.value = cached;
    isLoading.value = false;
    return;
  }

  const result = await projectStore.fetchProject(id);
  if (result && result.clientUserId === user.uid) {
    project.value = result;
    await Promise.all([
      expenseStore.fetchByProjectIdPublic(id),
      categoryStore.fetchForProjectFromAPI(id),
      itemStore.fetchByProjectIdPublic(id),
      materialStore.fetchByProjectIdPublic(id),
      taskStore.fetchByProjectIdPublic(id)
    ]);
  }
  isLoading.value = false;
});
</script>
