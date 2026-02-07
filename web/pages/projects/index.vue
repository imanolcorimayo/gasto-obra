<template>
  <div class="mb-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Mis Proyectos</h1>
        <p class="text-gray-400 text-sm mt-1">Gestiona tus obras y refacciones</p>
      </div>
      <NuxtLink to="/projects/new" class="btn-primary flex items-center gap-2">
        <MdiPlus />
        Nuevo Proyecto
      </NuxtLink>
    </div>

    <!-- Loading -->
    <AppLoader v-if="projectStore.isLoading" />

    <!-- Empty state -->
    <div v-else-if="projectStore.projects.length === 0" class="text-center py-16">
      <MdiHardHat class="text-6xl text-gray-600 mx-auto mb-4" />
      <h2 class="text-xl font-semibold text-gray-400 mb-2">No tenes proyectos</h2>
      <p class="text-gray-500 mb-6">Crea tu primer proyecto para empezar a registrar gastos</p>
      <NuxtLink to="/projects/new" class="btn-primary inline-flex items-center gap-2">
        <MdiPlus />
        Crear Proyecto
      </NuxtLink>
    </div>

    <!-- Project grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProjectCard
        v-for="project in projectStore.projects"
        :key="project.id"
        :project="project"
        :total-spent="projectTotals[project.id]?.total || 0"
        :expense-count="projectTotals[project.id]?.count || 0"
      />
    </div>
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiHardHat from '~icons/mdi/hard-hat';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirestoreInstance } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'Proyectos'
});

const projectStore = useProjectStore();
const projectTotals = ref({});

onMounted(async () => {
  await projectStore.fetchProjects();

  // Fetch expense totals for each project
  const db = getFirestoreInstance();
  for (const project of projectStore.projects) {
    try {
      const expensesSnapshot = await getDocs(
        query(
          collection(db, 'expenses'),
          where('projectId', '==', project.id)
        )
      );

      const total = expensesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      projectTotals.value[project.id] = {
        total,
        count: expensesSnapshot.size
      };
    } catch (error) {
      console.error(`Error fetching totals for project ${project.id}:`, error);
    }
  }
});
</script>
