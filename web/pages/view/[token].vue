<template>
  <div class="min-h-screen bg-base">
    <!-- Simple header for client view -->
    <header class="w-full bg-base border-b border-gray-700">
      <div class="max-w-3xl m-auto px-3 sm:px-6 py-3">
        <span class="text-xl font-bold text-primary">Gasto Obra</span>
      </div>
    </header>

    <div class="max-w-3xl m-auto px-3 sm:px-6 py-6">
      <!-- Loading -->
      <AppLoader v-if="isLoading" />

      <!-- Not found -->
      <div v-else-if="!project" class="text-center py-16">
        <h2 class="text-xl font-semibold text-gray-400">Proyecto no encontrado</h2>
        <p class="text-gray-500 mt-2">El link puede ser invalido o el proyecto ya no esta disponible.</p>
      </div>

      <!-- Project view -->
      <template v-else>
        <!-- Project header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold">{{ project.name }}</h1>
          <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
            <span v-if="project.address">{{ project.address }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="project.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'"
            >
              {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
            </span>
          </div>
        </div>

        <!-- Summary -->
        <ExpenseSummary :expenses="expenses" class="mb-6" />

        <!-- Expenses -->
        <h3 class="font-semibold mb-4">Detalle de gastos</h3>

        <div v-if="expenses.length === 0" class="text-center text-gray-500 py-8">
          No hay gastos registrados en este proyecto.
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="expense in expenses"
            :key="expense.id"
            class="bg-surface rounded-lg border border-gray-700 p-4"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium">{{ expense.title }}</h4>
                <p v-if="expense.description" class="text-gray-400 text-sm mt-1">{{ expense.description }}</p>
              </div>
              <span class="text-primary font-semibold text-lg ml-4 whitespace-nowrap">
                {{ formatPrice(expense.amount) }}
              </span>
            </div>

            <div class="flex items-center gap-3 mt-3 text-sm">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :style="getCategoryStyles(expense.category)"
              >
                {{ getCategoryLabel(expense.category) }}
              </span>
              <span class="text-gray-500">
                {{ formatExpenseDate(expense.date || expense.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Join as client button -->
    <div v-if="project" class="mt-8 bg-surface rounded-xl border border-gray-700 p-5 text-center">
      <p class="text-gray-300 mb-3">Sos el dueno de esta obra?</p>
      <NuxtLink
        :to="`/client/join?token=${route.params.token}`"
        class="btn-primary inline-flex items-center gap-2"
      >
        Unirme como cliente
      </NuxtLink>
    </div>

    <!-- Footer -->
    <footer class="mt-12 py-6 text-center text-gray-600 text-sm">
      <p>Gasto Obra - WiseUtils</p>
    </footer>
  </div>
</template>

<script setup>
import { formatPrice, getCategoryStyles, getCategoryLabel } from '~/utils';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';

definePageMeta({
  layout: 'landing'
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();

const isLoading = ref(true);
const project = ref(null);
const expenses = ref([]);

useHead({
  title: computed(() => project.value?.name || 'Vista de Proyecto')
});

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

onMounted(async () => {
  const token = route.params.token;

  const projectResult = await projectStore.fetchProjectByShareToken(token);
  project.value = projectResult;

  if (projectResult) {
    await expenseStore.fetchByProjectIdPublic(projectResult.id);
    expenses.value = expenseStore.expenses;
  }

  isLoading.value = false;
});
</script>
