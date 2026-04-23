<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="font-display font-bold text-lg text-go-text truncate">{{ project?.name || 'Obra' }}</h1>
          <span
            v-if="project"
            class="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0"
            :class="statusClasses"
          >{{ statusLabel }}</span>
        </div>
        <p v-if="project" class="text-[11px] text-go-text-muted mt-0.5 truncate">
          <span class="font-mono">#{{ project.tag }}</span>
          <template v-if="itemStore.items.length">
            · {{ itemStore.items.length }} items
          </template>
        </p>
      </div>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <AppLoader v-if="isLoading" text="Cargando obra..." />

      <div v-else-if="!project" class="text-center py-16">
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <NuxtLink to="/client" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a mis obras</NuxtLink>
      </div>

      <ProjectItemsSection
        v-else
        :project-id="project.id"
        :provider-id="project.providerId"
        :readonly="false"
        :is-client="true"
      />
    </div>
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

const statusLabel = computed(() => {
  switch (project.value?.status) {
    case 'active': return 'Activo';
    case 'paused': return 'Pausado';
    case 'completed': return 'Completado';
    default: return '';
  }
});

const statusClasses = computed(() => {
  switch (project.value?.status) {
    case 'active': return 'bg-go-success-muted text-go-success';
    case 'paused': return 'bg-go-warning-muted text-go-warning';
    case 'completed': return 'bg-go-surface-alt text-go-text-tertiary';
    default: return '';
  }
});

useHead({ title: computed(() => project.value?.name || 'Obra') });

onMounted(async () => {
  const id = route.params.id;
  const user = await getCurrentUserAsync();
  if (!user) {
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
