<template>
  <div class="mb-8">
    <h1 class="text-[28px] font-bold tracking-tight mb-6">Mis Obras (Cliente)</h1>

    <AppLoader v-if="isLoading" />

    <div v-else-if="projects.length === 0" class="text-center py-16">
      <h2 class="text-xl font-semibold text-go-text-tertiary">No estas unido a ningun proyecto</h2>
      <p class="text-go-text-muted mt-2">Pedi al proveedor que te comparta el link de su proyecto.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="project in projects"
        :key="project.id"
        :to="`/client/project/${project.id}`"
        class="bg-go-surface rounded-go-xl border border-go-border p-5 hover:border-go-border transition-colors block"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-base font-semibold">{{ project.name }}</h3>
          <span
            class="text-xs px-2 py-0.5 rounded-full font-semibold"
            :class="project.status === 'active' ? 'bg-go-success-muted text-go-success' : 'bg-go-surface-alt text-go-text-tertiary'"
          >
            {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
          </span>
        </div>
        <p v-if="project.address" class="text-go-text-tertiary text-sm">{{ project.address }}</p>
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
  title: 'Mis Obras (Cliente)'
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
