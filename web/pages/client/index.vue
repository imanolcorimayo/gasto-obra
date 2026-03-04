<template>
  <div class="mb-8">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="font-display font-bold text-2xl text-go-text">Mis Obras</h1>
      <p class="text-go-text-muted text-sm mt-1">Las obras en las que fuiste agregado como cliente.</p>
    </div>

    <AppLoader v-if="isLoading" />

    <!-- Empty state -->
    <div v-else-if="projects.length === 0" class="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <p class="font-display text-go-text-secondary">No estas en ninguna obra todavia</p>
      <p class="text-go-text-muted text-sm mt-1">El proveedor tiene que compartirte el link de acceso.</p>
    </div>

    <!-- Project list -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="project in projects"
        :key="project.id"
        :to="`/client/project/${project.id}`"
        class="bg-go-surface border border-go-border rounded-go-xl p-4 hover:bg-go-surface-hover transition-colors block"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-display font-semibold text-go-text">{{ project.name }}</h3>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm shrink-0"
            :class="project.status === 'active' ? 'bg-go-secondary/20 text-go-secondary' : project.status === 'paused' ? 'bg-go-warning/20 text-go-warning' : 'bg-go-text-muted/20 text-go-text-muted'"
          >
            {{ project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : 'Pausado' }}
          </span>
        </div>
        <div class="flex flex-col gap-0.5 mb-3">
          <span v-if="project.tag" class="text-go-text-muted text-xs font-mono">#{{ project.tag }}</span>
          <span v-if="project.address" class="text-go-text-tertiary text-xs">{{ project.address }}</span>
        </div>
        <div class="flex items-center justify-end">
          <span class="text-go-primary text-sm font-medium">Ver obra →</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { useProjectStore } from '~/stores/project';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

const projectStore = useProjectStore();
const isLoading = ref(true);
const projects = ref([]);

useHead({
  title: 'Mis Obras'
});

onMounted(async () => {
  const user = await getCurrentUserAsync();
  if (user) {
    await projectStore.fetchClientProjects(user.uid);
    projects.value = projectStore.clientProjects;
  }
  isLoading.value = false;
});
</script>
