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
        <div v-if="project.budget" class="bg-surface rounded-lg border border-gray-700 p-3">
          <span class="text-gray-500">Presupuesto:</span>
          <span class="text-white ml-2">{{ formatPrice(project.budget) }}</span>
        </div>
        <div v-if="project.estimatedEndDate" class="bg-surface rounded-lg border border-gray-700 p-3">
          <span class="text-gray-500">Fecha estimada de fin:</span>
          <span class="text-white ml-2">{{ formatDate(project.estimatedEndDate) }}</span>
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

      <!-- Add expense/payment form -->
      <div class="bg-surface rounded-xl border border-gray-700 p-5 mb-6">
        <!-- Type toggle tabs -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="t in formTypes"
            :key="t.value"
            @click="newExpense.type = t.value"
            class="text-sm px-4 py-1.5 rounded-full border transition-colors"
            :class="newExpense.type === t.value
              ? 'border-primary bg-primary/20 text-primary font-medium'
              : 'border-gray-600 text-gray-400 hover:border-gray-500'"
          >
            {{ t.label }}
          </button>
        </div>

        <form @submit.prevent="addExpense" class="flex flex-col gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              v-model="newExpense.title"
              type="text"
              required
              :placeholder="newExpense.type === 'payment' ? 'Concepto del pago' : 'Titulo del gasto'"
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

          <!-- Category + description (not for payments) -->
          <div v-if="newExpense.type !== 'payment'" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <!-- Optional items section (collapsible) -->
          <div v-if="newExpense.type !== 'payment'">
            <button
              type="button"
              @click="showNewItems = !showNewItems"
              class="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <MdiChevronDown class="transition-transform" :class="{ 'rotate-180': showNewItems }" />
              Agregar items
            </button>

            <div v-if="showNewItems" class="mt-2 flex flex-col gap-2">
              <div
                v-for="(item, idx) in newExpense.items"
                :key="idx"
                class="flex gap-2 items-center"
              >
                <input
                  v-model="item.name"
                  type="text"
                  placeholder="Nombre"
                  class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="Monto"
                  min="0"
                  step="0.01"
                  class="w-28 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <button type="button" @click="newExpense.items.splice(idx, 1)" class="text-gray-500 hover:text-red-400 p-1">
                  <MdiClose class="text-base" />
                </button>
              </div>
              <button
                type="button"
                @click="newExpense.items.push({ name: '', amount: 0 })"
                class="text-sm text-primary hover:text-primary/80 self-start flex items-center gap-1"
              >
                <MdiPlus class="text-base" />
                Agregar item
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isAddingExpense"
            class="btn-primary self-start flex items-center gap-2"
          >
            <MdiPlus />
            {{ newExpense.type === 'payment' ? 'Registrar Pago' : newExpense.type === 'provider_expense' ? 'Registrar Gasto Propio' : 'Agregar Gasto' }}
          </button>
        </form>
      </div>

      <!-- Summary + Expenses -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1">
          <ExpenseSummary :expenses="expenseStore.expenses" :budget="project.budget" />
        </div>
        <div class="lg:col-span-2">
          <h3 class="font-semibold mb-4">Historial</h3>
          <AppLoader v-if="expenseStore.isLoading" text="Cargando gastos..." />
          <ExpenseList
            v-else
            :expenses="expenseStore.expenses"
            :editable="true"
            @edit="openEditModal"
          />
        </div>
      </div>

      <!-- Edit modal -->
      <ExpenseEditModal
        :show="showEditModal"
        :expense="editingExpense"
        :projects="projectStore.projects"
        @close="showEditModal = false"
        @save="handleEditSave"
      />
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiContentCopy from '~icons/mdi/content-copy';
import MdiCheck from '~icons/mdi/check';
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import MdiChevronDown from '~icons/mdi/chevron-down';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { EXPENSE_CATEGORIES, formatPrice, formatDate } from '~/utils';

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
const showNewItems = ref(false);
const showEditModal = ref(false);
const editingExpense = ref(null);

const formTypes = [
  { value: 'expense', label: 'Gasto' },
  { value: 'payment', label: 'Pago del cliente' },
  { value: 'provider_expense', label: 'Gasto propio' }
];

const newExpense = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  description: '',
  type: 'expense',
  items: []
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

// Auto-calculate total from items
watch(() => newExpense.items, (items) => {
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (total > 0) {
      newExpense.amount = total;
    }
  }
}, { deep: true });

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
    // Load all projects for the edit modal's "move" feature
    if (projectStore.projects.length === 0) {
      await projectStore.fetchProjects();
    }
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
    const data = {
      projectId: project.value.id,
      providerId: project.value.providerId,
      title: newExpense.title,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.type === 'payment' ? 'pago' : newExpense.category,
      type: newExpense.type,
      items: newExpense.items.length > 0 ? newExpense.items.filter(i => i.name) : null
    };

    const result = await expenseStore.createExpense(data);

    if (result.success) {
      const label = newExpense.type === 'payment' ? 'Pago registrado' : newExpense.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto agregado';
      useToast('success', label);
      newExpense.title = '';
      newExpense.amount = '';
      newExpense.description = '';
      newExpense.category = 'materiales';
      newExpense.items = [];
      showNewItems.value = false;
    } else {
      useToast('error', result.error || 'Error al agregar');
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    useToast('error', 'Error al agregar');
  } finally {
    isAddingExpense.value = false;
  }
}

function openEditModal(expense) {
  editingExpense.value = expense;
  showEditModal.value = true;
}

async function handleEditSave({ id, data }) {
  const result = await expenseStore.updateExpense(id, data);

  if (result.success) {
    useToast('success', 'Registro actualizado');
    showEditModal.value = false;

    // If moved to another project, remove from current list
    if (data.projectId && data.projectId !== project.value.id) {
      expenseStore.expenses = expenseStore.expenses.filter(e => e.id !== id);
    }
  } else {
    useToast('error', result.error || 'Error al actualizar');
  }
}
</script>
