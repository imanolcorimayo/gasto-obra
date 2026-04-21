<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="font-display font-bold text-lg text-go-text truncate">Mis obras</h1>
        <p v-if="!projectStore.isLoading" class="text-[11px] text-go-text-muted mt-0.5">
          <template v-if="projectStore.projects.length">
            {{ projectStore.projects.length }} {{ projectStore.projects.length === 1 ? 'proyecto' : 'proyectos' }}
          </template>
          <template v-else>Todavía sin obras</template>
        </p>
      </div>
      <NuxtLink to="/projects/new" class="inline-flex items-center gap-1.5 bg-go-primary text-white px-3 py-1.5 rounded-go-md text-[12.5px] font-bold hover:bg-go-primary-hover transition-colors shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <span class="hidden sm:inline">Nueva obra</span>
        <span class="sm:hidden">Nueva</span>
      </NuxtLink>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <!-- Loading -->
      <AppLoader v-if="projectStore.isLoading" />

      <!-- Empty state -->
      <div v-else-if="projectStore.projects.length === 0" class="flex flex-col items-center justify-center text-center py-20">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted/40 mb-4"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5"/><path d="M10 2v4"/><path d="M14 6V2"/><path d="M18 2v4"/></svg>
        <h2 class="font-display text-go-text-secondary text-lg mb-1">Todavía no tenés obras</h2>
        <p class="text-go-text-muted text-sm mb-6 max-w-xs">Creá tu primera obra y empezá a registrar gastos desde WhatsApp.</p>
        <NuxtLink to="/projects/new" class="btn-primary inline-flex items-center gap-2">
          <MdiPlus />
          Crear Proyecto
        </NuxtLink>
      </div>

      <!-- Project grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ProjectCard
          v-for="project in projectStore.projects"
          :key="project.id"
          :project="project"
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
import MdiPlus from '~icons/mdi/plus';
import { useProjectStore } from '~/stores/project';
import { collection, query, where, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase';

definePageMeta({
  layout: 'app',
  middleware: ['auth']
});

useHead({
  title: 'Proyectos'
});

const projectStore = useProjectStore();
const projectTotals = ref({});
const projectBudgets = ref({});

onMounted(async () => {
  await projectStore.fetchProjects();

  const db = getFirestoreInstance();
  const user = getCurrentUser();

  // One pass per project: aggregate expenses (total + count) and item budgets (labor + materials min/max).
  // For projects with items, effective budget = labor + (matMin + matMax) / 2.
  // For projects without items, fall back to the legacy project.budget field.
  await Promise.all(projectStore.projects.map(async (project) => {
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('projectId', '==', project.id),
      where('providerId', '==', user.uid)
    );
    const itemsQuery = query(
      collection(db, 'projectItems'),
      where('projectId', '==', project.id),
      where('providerId', '==', user.uid)
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
      console.error(`Error fetching totals for project ${project.id}:`, error);
      projectBudgets.value[project.id] = typeof project.budget === 'number' ? project.budget : 0;
    }
  }));
});
</script>
