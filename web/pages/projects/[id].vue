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
            <button
              @click="showProjectEditModal = true"
              class="btn-secondary text-sm flex items-center gap-1"
            >
              <MdiPencil class="text-base" />
              Editar
            </button>
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

      <!-- Add buttons -->
      <div class="flex flex-wrap gap-3 mb-6">
        <button
          @click="openCreateModal('expense')"
          class="btn-primary flex items-center gap-1.5 text-sm group relative"
          title="Gasto de la obra que se cobra al cliente"
        >
          <MdiPlus class="text-base" />
          <div class="text-left">
            <span>Gasto</span>
            <span class="block text-[10px] opacity-70 font-normal">Cobrable al cliente</span>
          </div>
        </button>
        <button
          @click="openCreateModal('payment')"
          class="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-green-600 text-green-400 hover:bg-green-500/10 transition-colors"
          title="Dinero recibido del cliente"
        >
          <MdiPlus class="text-base text-green-400" />
          <div class="text-left">
            <span>Pago del cliente</span>
            <span class="block text-[10px] opacity-70 font-normal">Ingreso recibido</span>
          </div>
        </button>
        <button
          @click="openCreateModal('provider_expense')"
          class="btn-secondary flex items-center gap-1.5 text-sm"
          title="Gasto personal del proveedor, no se cobra al cliente"
        >
          <MdiPlus class="text-base" />
          <div class="text-left">
            <span>Gasto propio</span>
            <span class="block text-[10px] opacity-70 font-normal">No cobrable</span>
          </div>
        </button>
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
            @mark-paid="handleMarkPaid"
            @mark-pending="handleMarkPending"
          />
        </div>
      </div>

      <!-- Create expense modal -->
      <ExpenseCreateModal
        :show="showCreateModal"
        :type="createModalType"
        @close="showCreateModal = false"
        @submit="handleCreateSubmit"
      />

      <!-- Edit expense modal -->
      <ExpenseEditModal
        :show="showEditModal"
        :expense="editingExpense"
        :projects="projectStore.projects"
        @close="showEditModal = false"
        @save="handleEditSave"
      />

      <!-- Edit project modal -->
      <ProjectEditModal
        :show="showProjectEditModal"
        :project="project"
        @close="showProjectEditModal = false"
        @save="handleProjectEditSave"
      />
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiContentCopy from '~icons/mdi/content-copy';
import MdiCheck from '~icons/mdi/check';
import MdiPlus from '~icons/mdi/plus';
import MdiPencil from '~icons/mdi/pencil';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { formatPrice, formatDate } from '~/utils';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();

const isLoading = ref(true);
const project = ref(null);
const copied = ref(false);
const showCreateModal = ref(false);
const createModalType = ref('expense');
const showEditModal = ref(false);
const editingExpense = ref(null);
const showProjectEditModal = ref(false);

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

function openCreateModal(type) {
  createModalType.value = type;
  showCreateModal.value = true;
}

async function handleCreateSubmit(formData) {
  try {
    const data = {
      projectId: project.value.id,
      providerId: project.value.providerId,
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      type: formData.type,
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod,
      items: formData.items
    };

    const result = await expenseStore.createExpense(data);

    if (result.success) {
      // Auto-create linked payment if requested
      if (formData.createLinkedPayment) {
        const paymentData = {
          projectId: project.value.id,
          providerId: project.value.providerId,
          title: `Pago: ${formData.title}`,
          description: '',
          amount: formData.amount,
          category: 'pago',
          type: 'payment',
          paymentStatus: 'paid',
          paymentMethod: formData.paymentMethod,
          linkedExpenseId: result.data.id,
          items: null
        };

        const paymentResult = await expenseStore.createExpense(paymentData);
        if (paymentResult.success) {
          await expenseStore.updateExpense(result.data.id, {
            linkedPaymentId: paymentResult.data.id
          });
        }
      }

      const label = formData.type === 'payment' ? 'Pago registrado' : formData.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto agregado';
      useToast('success', label);
      showCreateModal.value = false;
    } else {
      useToast('error', result.error || 'Error al agregar');
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    useToast('error', 'Error al agregar');
  }
}

function openEditModal(expense) {
  editingExpense.value = expense;
  showEditModal.value = true;
}

async function handleProjectEditSave(data) {
  const result = await projectStore.updateProject(project.value.id, data);

  if (result.success) {
    useToast('success', 'Proyecto actualizado');
    showProjectEditModal.value = false;
    // Refresh project data locally
    Object.assign(project.value, data);
  } else {
    useToast('error', result.error || 'Error al actualizar el proyecto');
  }
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

async function handleMarkPaid(expense) {
  try {
    // 1. Create a linked payment record
    const paymentData = {
      projectId: expense.projectId,
      providerId: expense.providerId,
      title: `Pago: ${expense.title}`,
      description: '',
      amount: expense.amount,
      category: 'pago',
      type: 'payment',
      paymentStatus: 'paid',
      paymentMethod: expense.paymentMethod,
      linkedExpenseId: expense.id,
      items: null
    };

    const createResult = await expenseStore.createExpense(paymentData);
    if (!createResult.success) {
      useToast('error', 'Error al crear el pago');
      return;
    }

    // 2. Update the expense with paymentStatus + linkedPaymentId
    const updateResult = await expenseStore.updateExpense(expense.id, {
      paymentStatus: 'paid',
      linkedPaymentId: createResult.data.id
    });

    if (updateResult.success) {
      useToast('success', 'Marcado como pagado');
    } else {
      useToast('error', 'Error al actualizar el gasto');
    }
  } catch (error) {
    console.error('Error marking as paid:', error);
    useToast('error', 'Error al marcar como pagado');
  }
}

async function handleMarkPending(expense) {
  try {
    // 1. Delete the linked payment
    if (expense.linkedPaymentId) {
      const deleted = await expenseStore.deleteExpense(expense.linkedPaymentId);
      if (!deleted) {
        useToast('error', 'Error al eliminar el pago vinculado');
        return;
      }
    }

    // 2. Update the expense back to pending
    const updateResult = await expenseStore.updateExpense(expense.id, {
      paymentStatus: 'pending',
      linkedPaymentId: null
    });

    if (updateResult.success) {
      useToast('success', 'Marcado como pendiente');
    } else {
      useToast('error', 'Error al actualizar el gasto');
    }
  } catch (error) {
    console.error('Error marking as pending:', error);
    useToast('error', 'Error al marcar como pendiente');
  }
}
</script>
