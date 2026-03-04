<template>
  <div class="min-h-screen bg-go-bg">
    <!-- Simple header for client view -->
    <header class="w-full bg-go-bg border-b border-go-border">
      <div class="max-w-3xl m-auto px-3 sm:px-6 py-3">
        <span class="text-xl font-bold text-go-primary">Gasto Obra</span>
      </div>
    </header>

    <div class="max-w-3xl m-auto px-3 sm:px-6 py-6">
      <!-- Loading -->
      <AppLoader v-if="isLoading" />

      <!-- Not found -->
      <div v-else-if="!project" class="text-center py-16">
        <h2 class="text-xl font-semibold text-go-text-tertiary">Proyecto no encontrado</h2>
        <p class="text-go-text-muted mt-2">El link puede ser invalido o el proyecto ya no esta disponible.</p>
      </div>

      <!-- Project view -->
      <template v-else>
        <!-- Project header -->
        <div class="mb-6">
          <h1 class="text-[28px] font-bold tracking-tight">{{ project.name }}</h1>
          <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-go-text-tertiary">
            <span v-if="project.address">{{ project.address }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              :class="project.status === 'active' ? 'bg-go-success-muted text-go-success' : 'bg-go-surface-alt text-go-text-tertiary'"
            >
              {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
            </span>
          </div>
        </div>

        <!-- Budget & timeline info -->
        <div v-if="project.budget || project.startDate || project.estimatedEndDate" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
          <div v-if="project.budget" class="bg-go-surface rounded-go-md border border-go-border p-3">
            <span class="text-go-text-muted">Presupuesto:</span>
            <span class="text-go-text ml-2">{{ formatPrice(project.budget) }}</span>
          </div>
          <div v-if="project.startDate || project.estimatedEndDate" class="bg-go-surface rounded-go-md border border-go-border p-3">
            <span class="text-go-text-muted">Cronograma:</span>
            <span class="text-go-text ml-2">
              {{ project.startDate ? formatDate(project.startDate) : '—' }}
              →
              {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}
            </span>
          </div>
        </div>

        <!-- Summary -->
        <ExpenseSummary :expenses="allClientExpenses" :budget="project.budget" :categories="resolvedCategories" class="mb-6" />

        <!-- Expense history -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Detalle de gastos</h3>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-go-text-muted uppercase tracking-wider">Tipo</span>
              <select
                v-model="selectedType"
                class="bg-go-surface border border-go-border rounded-go-md px-2.5 py-1.5 text-xs text-go-text focus:outline-none focus:border-go-primary cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="expense">Gastos</option>
                <option value="payment">Pagos</option>
              </select>
            </div>
          </div>
          <div class="flex rounded-go-md border border-go-border overflow-hidden w-fit mb-4">
            <button
              @click="viewMode = 'cards'"
              class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
              :class="viewMode === 'cards' ? 'bg-go-surface-alt text-go-text' : 'text-go-text-tertiary hover:text-go-text'"
            >
              <MdiViewAgenda class="text-sm" />
              Tarjetas
            </button>
            <button
              @click="viewMode = 'table'"
              class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
              :class="viewMode === 'table' ? 'bg-go-surface-alt text-go-text' : 'text-go-text-tertiary hover:text-go-text'"
            >
              <MdiTable class="text-sm" />
              Balance
            </button>
          </div>

          <template v-if="viewMode === 'cards'">
            <div v-if="filteredCards.length === 0" class="text-center text-go-text-muted py-8">
              No hay gastos registrados en este proyecto.
            </div>
            <div v-else class="flex flex-col gap-3">
              <ClientExpenseCard
                v-for="expense in filteredCards"
                :key="expense.id"
                :expense="expense"
                :categories="resolvedCategories"
              />
            </div>
          </template>

          <template v-else>
            <ClientBalanceTable :expenses="filteredAll" />
          </template>
        </div>
      </template>
    </div>

    <!-- Join as client button -->
    <div v-if="project" class="max-w-3xl m-auto px-3 sm:px-6">
      <div class="mt-2 mb-8 bg-go-surface rounded-go-xl border border-go-border p-5 text-center">
        <p class="text-go-text mb-3">Sos el dueño de esta obra?</p>
        <NuxtLink
          :to="`/client/join?token=${route.params.token}`"
          class="btn-primary inline-flex items-center gap-2"
        >
          Unirme como cliente
        </NuxtLink>
      </div>
    </div>

    <!-- Footer -->
    <footer class="mt-4 py-6 text-center text-go-text-muted text-sm">
      <p>gasto obra</p>
    </footer>
  </div>
</template>

<script setup>
import MdiViewAgenda from '~icons/mdi/view-agenda';
import MdiTable from '~icons/mdi/table';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { formatPrice, formatDate } from '~/utils';

definePageMeta({
  layout: 'landing'
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();

const isLoading = ref(true);
const project = ref(null);
const expenses = ref([]);
const selectedType = ref('');
const viewMode = ref('cards');

const resolvedCategories = computed(() => {
  if (!project.value) return [];
  return categoryStore.getResolved(project.value.id);
});

useHead({
  title: computed(() => project.value?.name || 'Vista de Proyecto')
});

// All client-relevant expenses (for summary + table)
const allClientExpenses = computed(() =>
  expenses.value.filter(e => e.type !== 'provider_expense')
);

// Card view hides auto-linked payments (shown as "Pagado" on expense card)
const cardExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.linkedExpenseId)
);

// Apply type filter to each view
const filteredCards = computed(() => applyTypeFilter(cardExpenses.value));
const filteredAll = computed(() => applyTypeFilter(allClientExpenses.value));

function applyTypeFilter(list) {
  if (!selectedType.value) return list;
  if (selectedType.value === 'expense') {
    return list.filter(e => !e.type || e.type === 'expense');
  }
  return list.filter(e => e.type === selectedType.value);
}

onMounted(async () => {
  const token = route.params.token;

  const projectResult = await projectStore.fetchProjectByShareToken(token);
  project.value = projectResult;

  if (projectResult) {
    await Promise.all([
      expenseStore.fetchByProjectIdPublic(projectResult.id),
      categoryStore.fetchForProviderPublic(projectResult.providerId, projectResult.id)
    ]);
    expenses.value = expenseStore.expenses;
  }

  isLoading.value = false;
});
</script>
