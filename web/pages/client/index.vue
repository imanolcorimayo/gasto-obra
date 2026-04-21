<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3">
      <h1 class="font-display font-bold text-lg text-go-text truncate">Mis obras (como cliente)</h1>
      <p v-if="!isLoading" class="text-[11px] text-go-text-muted mt-0.5">
        <template v-if="projects.length">
          {{ projects.length }} {{ projects.length === 1 ? 'obra' : 'obras' }}
        </template>
        <template v-else>Las obras en las que fuiste agregado como cliente</template>
      </p>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <AppLoader v-if="isLoading" />

      <!-- Empty state -->
      <div v-else-if="projects.length === 0" class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <p class="font-display text-go-text-secondary">No estás en ninguna obra todavía</p>
        <p class="text-go-text-muted text-sm mt-1">El proveedor tiene que compartirte el link de acceso.</p>
      </div>

      <!-- Project grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          base-path="/client/project"
          :total-spent="projectTotals[project.id]?.total || 0"
          :expense-count="projectTotals[project.id]?.count || 0"
          :total-budget="projectBudgets[project.id] ?? (typeof project.budget === 'number' ? project.budget : 0)"
          :is-loading="!projectTotals[project.id] || !(project.id in projectBudgets)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useProjectStore } from '~/stores/project';
import { getCurrentUserAsync } from '~/utils/firebase';
import { collection, query, where, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { getFirestoreInstance } from '~/utils/firebase';

definePageMeta({
  layout: 'app',
  middleware: ['auth']
});

const projectStore = useProjectStore();
const isLoading = ref(true);
const projects = ref([]);
const projectTotals = ref({});
const projectBudgets = ref({});

useHead({
  title: 'Mis Obras'
});

onMounted(async () => {
  const user = await getCurrentUserAsync();
  if (!user) {
    isLoading.value = false;
    return;
  }
  await projectStore.fetchClientProjects(user.uid);
  projects.value = projectStore.clientProjects;
  isLoading.value = false;

  const db = getFirestoreInstance();
  await Promise.all(projects.value.map(async (project) => {
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('projectId', '==', project.id)
    );
    const itemsQuery = query(
      collection(db, 'projectItems'),
      where('projectId', '==', project.id)
    );

    try {
      const [expensesAgg, itemsAgg] = await Promise.all([
        getAggregateFromServer(expensesQuery, { total: sum('amount'), count: count() }),
        getAggregateFromServer(itemsQuery, {
          itemCount: count(),
          labor: sum('laborBudget'),
          matMin: sum('materialsBudgetMin'),
          matMax: sum('materialsBudgetMax')
        })
      ]);

      const e = expensesAgg.data();
      projectTotals.value[project.id] = {
        total: e.total || 0,
        count: e.count || 0
      };

      const i = itemsAgg.data();
      if ((i.itemCount || 0) > 0) {
        const matMidpoint = ((i.matMin || 0) + (i.matMax || 0)) / 2;
        projectBudgets.value[project.id] = (i.labor || 0) + matMidpoint;
      } else {
        projectBudgets.value[project.id] = typeof project.budget === 'number' ? project.budget : 0;
      }
    } catch (error) {
      console.error(`Error fetching totals for client project ${project.id}:`, error);
      projectBudgets.value[project.id] = typeof project.budget === 'number' ? project.budget : 0;
    }
  }));
});
</script>
