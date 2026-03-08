<template>
  <div class="mb-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-[28px] font-display font-bold tracking-tight text-go-text">Mis Proyectos</h1>
        <p class="text-go-text-tertiary text-sm mt-1">Gestiona tus obras y refacciones</p>
      </div>
      <NuxtLink to="/projects/new" class="btn-primary flex items-center gap-2">
        <MdiPlus />
        Nuevo Proyecto
      </NuxtLink>
    </div>

    <!-- Loading -->
    <AppLoader v-if="projectStore.isLoading" />

    <!-- Empty state -->
    <div v-else-if="projectStore.projects.length === 0" class="flex flex-col items-center justify-center text-center py-20">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5"/><path d="M10 2v4"/><path d="M14 6V2"/><path d="M18 2v4"/></svg>
      <h2 class="font-display text-go-text-secondary text-lg mb-1">Todavia no tenes obras</h2>
      <p class="text-go-text-muted text-sm mb-6 max-w-xs">Crea tu primera obra y empeza a registrar gastos desde WhatsApp.</p>
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
import { useProjectStore } from '~/stores/project';
import { collection, query, where, getAggregateFromServer, getCountFromServer, sum } from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase';

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

  // Fetch expense totals using aggregation queries (1 read per query instead of 1 per document)
  const db = getFirestoreInstance();
  const user = getCurrentUser();
  await Promise.all(projectStore.projects.map(async (project) => {
    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('projectId', '==', project.id),
        where('providerId', '==', user.uid)
      );

      const [totalSnapshot, countSnapshot] = await Promise.all([
        getAggregateFromServer(expensesQuery, { total: sum('amount') }),
        getCountFromServer(expensesQuery)
      ]);

      projectTotals.value[project.id] = {
        total: totalSnapshot.data().total || 0,
        count: countSnapshot.data().count
      };
    } catch (error) {
      console.error(`Error fetching totals for project ${project.id}:`, error);
    }
  }));
});
</script>
