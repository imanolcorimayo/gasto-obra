<template>
  <div class="mb-8">
    <h1 class="text-2xl font-bold mb-6">Mis Obras (Cliente)</h1>

    <AppLoader v-if="isLoading" />

    <div v-else-if="projects.length === 0" class="text-center py-16">
      <h2 class="text-xl font-semibold text-gray-400">No estas unido a ningun proyecto</h2>
      <p class="text-gray-500 mt-2">Pedi al proveedor que te comparta el link de su proyecto.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="project in projects"
        :key="project.id"
        :to="`/client/project/${project.id}`"
        class="bg-surface rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors block"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-lg">{{ project.name }}</h3>
          <span
            class="text-xs px-2 py-0.5 rounded-full font-medium"
            :class="project.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'"
          >
            {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
          </span>
        </div>
        <p v-if="project.address" class="text-gray-400 text-sm">{{ project.address }}</p>
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
