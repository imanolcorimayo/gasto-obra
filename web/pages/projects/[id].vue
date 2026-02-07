<template>
  <div class="mb-8">
    <!-- Loading -->
    <AppLoader v-if="isLoading" />

    <!-- Not found -->
    <div v-else-if="!project" class="text-center py-16">
      <h2 class="text-xl font-semibold text-gray-400">Proyecto no encontrado</h2>
      <NuxtLink to="/projects" class="text-primary mt-4 inline-block">Volver a proyectos</NuxtLink>
    </div>

    <!-- Project detail -->
    <template v-else>
      <!-- Back link & header -->
      <div class="mb-6">
        <NuxtLink to="/projects" class="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1">
          <MdiArrowLeft class="text-lg" />
          Volver a proyectos
        </NuxtLink>

        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
          <div>
            <h1 class="text-2xl font-bold">{{ project.name }}</h1>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-gray-400 text-sm">#{{ project.tag }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="statusClasses"
              >
                {{ statusLabel }}
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <select
              v-model="project.status"
              @change="updateStatus"
              class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Completado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Project info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
        <div v-if="project.clientName" class="bg-surface rounded-lg border border-gray-700 p-3">
          <span class="text-gray-500">Cliente:</span>
          <span class="text-white ml-2">{{ project.clientName }}</span>
        </div>
        <div v-if="project.address" class="bg-surface rounded-lg border border-gray-700 p-3">
          <span class="text-gray-500">Direccion:</span>
          <span class="text-white ml-2">{{ project.address }}</span>
        </div>
        <div v-if="project.description" class="bg-surface rounded-lg border border-gray-700 p-3 sm:col-span-2">
          <span class="text-gray-500">Descripcion:</span>
          <span class="text-white ml-2">{{ project.description }}</span>
        </div>
      </div>

      <!-- Shareable link -->
      <div class="bg-surface rounded-lg border border-gray-700 p-4 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-sm">Link para el cliente</h3>
            <p class="text-gray-500 text-xs mt-1">Compartí este link para que tu cliente vea los gastos</p>
          </div>
          <button
            @click="copyShareLink"
            class="btn-secondary text-sm flex items-center gap-1"
          >
            <MdiContentCopy v-if="!copied" />
            <MdiCheck v-else class="text-green-400" />
            {{ copied ? 'Copiado' : 'Copiar link' }}
          </button>
        </div>
      </div>

      <!-- Add expense -->
      <div class="bg-surface rounded-xl border border-gray-700 p-5 mb-6">
        <h3 class="font-semibold mb-4">Agregar gasto</h3>
        <form @submit.prevent="addExpense" class="flex flex-col gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              v-model="newExpense.title"
              type="text"
              required
              placeholder="Titulo del gasto"
              class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary sm:col-span-2"
            />
            <input
              v-model="newExpense.amount"
              type="number"
              required
              min="1"
              step="0.01"
              placeholder="Monto"
              class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              v-model="newExpense.category"
              class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
            >
              <option v-for="cat in EXPENSE_CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
            <input
              v-model="newExpense.description"
              type="text"
              placeholder="Descripcion (opcional)"
              class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary sm:col-span-2"
            />
          </div>
          <button
            type="submit"
            :disabled="isAddingExpense"
            class="btn-primary self-start flex items-center gap-2"
          >
            <MdiPlus />
            Agregar Gasto
          </button>
        </form>
      </div>

      <!-- Summary + Expenses -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <ExpenseSummary :expenses="expenseStore.expenses" />
        </div>
        <div class="lg:col-span-2">
          <h3 class="font-semibold mb-4">Historial de gastos</h3>
          <AppLoader v-if="expenseStore.isLoading" text="Cargando gastos..." />
          <ExpenseList v-else :expenses="expenseStore.expenses" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiContentCopy from '~icons/mdi/content-copy';
import MdiCheck from '~icons/mdi/check';
import MdiPlus from '~icons/mdi/plus';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { EXPENSE_CATEGORIES } from '~/utils';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();

const isLoading = ref(true);
const project = ref(null);
const copied = ref(false);
const isAddingExpense = ref(false);

const newExpense = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  description: ''
});

const statusLabel = computed(() => {
  switch (project.value?.status) {
    case 'active': return 'Activo';
    case 'paused': return 'Pausado';
    case 'completed': return 'Completado';
    default: return '';
  }
});

const statusClasses = computed(() => {
  switch (project.value?.status) {
    case 'active': return 'bg-green-500/20 text-green-400';
    case 'paused': return 'bg-yellow-500/20 text-yellow-400';
    case 'completed': return 'bg-gray-500/20 text-gray-400';
    default: return '';
  }
});

useHead({
  title: computed(() => project.value?.name || 'Proyecto')
});

onMounted(async () => {
  const id = route.params.id;
  const result = await projectStore.fetchProject(id);
  project.value = result;
  isLoading.value = false;

  if (result) {
    await expenseStore.fetchByProjectId(id);
  }
});

async function updateStatus() {
  const result = await projectStore.updateProject(project.value.id, {
    status: project.value.status
  });

  if (result.success) {
    useToast('success', 'Estado actualizado');
  } else {
    useToast('error', 'Error al actualizar el estado');
  }
}

async function copyShareLink() {
  if (!project.value?.shareToken) return;

  const url = `${window.location.origin}/view/${project.value.shareToken}`;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    useToast('success', 'Link copiado');
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    useToast('error', 'Error al copiar');
  }
}

async function addExpense() {
  if (!newExpense.title || !newExpense.amount) return;

  isAddingExpense.value = true;
  try {
    const result = await expenseStore.createExpense({
      projectId: project.value.id,
      providerId: project.value.providerId,
      title: newExpense.title,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category
    });

    if (result.success) {
      useToast('success', 'Gasto agregado');
      newExpense.title = '';
      newExpense.amount = '';
      newExpense.description = '';
      newExpense.category = 'materiales';
    } else {
      useToast('error', result.error || 'Error al agregar el gasto');
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    useToast('error', 'Error al agregar el gasto');
  } finally {
    isAddingExpense.value = false;
  }
}
</script>
