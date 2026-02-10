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
        <ExpenseSummary :expenses="allClientExpenses" :budget="project.budget" class="mb-6" />

        <!-- Expense history -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Detalle de gastos</h3>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-gray-500 uppercase tracking-wider">Tipo</span>
              <select
                v-model="selectedType"
                class="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="expense">Gastos</option>
                <option value="payment">Pagos</option>
              </select>
            </div>
          </div>
          <div class="flex rounded-lg border border-gray-600 overflow-hidden w-fit mb-4">
            <button
              @click="viewMode = 'cards'"
              class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
              :class="viewMode === 'cards' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'"
            >
              <MdiViewAgenda class="text-sm" />
              Tarjetas
            </button>
            <button
              @click="viewMode = 'table'"
              class="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
              :class="viewMode === 'table' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'"
            >
              <MdiTable class="text-sm" />
              Balance
            </button>
          </div>

          <template v-if="viewMode === 'cards'">
            <div v-if="filteredCards.length === 0" class="text-center text-gray-500 py-8">
              No hay gastos registrados en este proyecto.
            </div>
            <div v-else class="flex flex-col gap-3">
              <ClientExpenseCard
                v-for="expense in filteredCards"
                :key="expense.id"
                :expense="expense"
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
      <div class="mt-2 mb-8 bg-surface rounded-xl border border-gray-700 p-5 text-center">
        <p class="text-gray-300 mb-3">Sos el dueno de esta obra?</p>
        <NuxtLink
          :to="`/client/join?token=${route.params.token}`"
          class="btn-primary inline-flex items-center gap-2"
        >
          Unirme como cliente
        </NuxtLink>
      </div>
    </div>

    <!-- Footer -->
    <footer class="mt-4 py-6 text-center text-gray-600 text-sm">
      <p>Gasto Obra - WiseUtils</p>
    </footer>
  </div>
</template>

<script setup>
import MdiViewAgenda from '~icons/mdi/view-agenda';
import MdiTable from '~icons/mdi/table';
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
const selectedType = ref('');
const viewMode = ref('cards');

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
    await expenseStore.fetchByProjectIdPublic(projectResult.id);
    expenses.value = expenseStore.expenses;
  }

  isLoading.value = false;
});
</script>
