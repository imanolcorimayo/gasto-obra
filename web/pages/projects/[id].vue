<template>
  <div class="mb-8">
    <!-- Loading skeleton -->
    <div v-if="isLoading">
      <!-- Back link skeleton -->
      <div class="h-4 w-28 bg-go-surface rounded-go-md skeleton-shimmer"></div>
      <!-- Title skeleton -->
      <div class="mt-1">
        <div class="h-9 w-72 bg-go-surface rounded-go-md skeleton-shimmer"></div>
        <div class="h-4 w-40 bg-go-surface rounded-go-md skeleton-shimmer mt-2"></div>
      </div>
      <!-- Metadata strip skeleton -->
      <div class="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 mt-4">
        <div v-for="n in 4" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-12 w-full lg:w-36"></div>
      </div>
      <!-- Share link skeleton -->
      <div class="h-14 bg-go-surface rounded-go-xl skeleton-shimmer mt-3"></div>
      <!-- Action bar skeleton -->
      <div class="flex flex-col sm:flex-row gap-2 mt-4">
        <div v-for="n in 3" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-10 w-full sm:w-28"></div>
      </div>
      <!-- Two-column skeleton -->
      <div class="mt-8 pt-8 border-t border-go-border-subtle">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div class="order-2 lg:order-none">
            <div v-for="n in 3" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-16 mb-3"></div>
          </div>
          <div class="lg:col-span-2 order-1 lg:order-none">
            <div v-for="n in 5" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-20 mb-3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!project" class="text-center py-16">
      <h2 class="text-xl font-semibold text-go-text-tertiary">Proyecto no encontrado</h2>
      <NuxtLink to="/projects" class="text-go-primary mt-4 inline-block">Volver a proyectos</NuxtLink>
    </div>

    <!-- Project detail -->
    <template v-else>
      <!-- Back navigation -->
      <NuxtLink to="/projects" class="text-go-text-muted text-sm hover:text-go-text transition-colors inline-flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Proyectos
      </NuxtLink>

      <!-- Project title row -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-1">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="font-display font-bold text-3xl text-go-text">{{ project.name }}</h1>
          <span class="font-mono text-sm text-go-text-muted">#{{ project.tag }}</span>
          <span
            class="text-xs px-2.5 py-0.5 rounded-full font-semibold"
            :class="statusClasses"
          >
            {{ statusLabel }}
          </span>
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
            class="bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-sm text-go-text focus:outline-none focus:border-go-primary"
          >
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      <!-- Metadata strip -->
      <div class="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 mt-4">
        <div v-if="project.clientName" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2">
          <span class="text-[10px] uppercase tracking-wider text-go-text-muted block">Cliente</span>
          <span class="text-sm font-medium text-go-text">{{ project.clientName }}</span>
        </div>
        <div v-if="project.address" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2">
          <span class="text-[10px] uppercase tracking-wider text-go-text-muted block">Dirección</span>
          <span class="text-sm font-medium text-go-text">{{ project.address }}</span>
        </div>
        <div v-if="project.budget" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2">
          <span class="text-[10px] uppercase tracking-wider text-go-text-muted block">Presupuesto</span>
          <span class="text-sm font-medium text-go-text">{{ formatPrice(project.budget) }}</span>
        </div>
        <div v-if="project.startDate || project.estimatedEndDate" class="bg-go-surface border border-go-border rounded-go-md px-3 py-2">
          <span class="text-[10px] uppercase tracking-wider text-go-text-muted block">Cronograma</span>
          <span class="text-sm font-medium text-go-text">
            {{ project.startDate ? formatDate(project.startDate) : '—' }}
            →
            {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}
          </span>
        </div>
        <div v-if="project.description" class="col-span-2 bg-go-surface border border-go-border rounded-go-md px-3 py-2">
          <span class="text-[10px] uppercase tracking-wider text-go-text-muted block">Descripción</span>
          <span class="text-sm font-medium text-go-text">{{ project.description }}</span>
        </div>
      </div>

      <!-- Client share link panel -->
      <div class="bg-go-bg border border-go-border-subtle rounded-go-xl px-4 py-3 flex items-center gap-3 mt-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted flex-shrink-0">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <div class="flex-1 min-w-0">
          <span class="text-go-text-muted text-xs block">Link para el cliente</span>
          <span class="font-mono text-xs text-go-text truncate block">/view/{{ project.shareToken }}</span>
        </div>
        <button
          @click="copyShareLink"
          class="text-go-text-muted hover:text-go-primary transition-colors flex-shrink-0 p-1"
        >
          <MdiContentCopy v-if="!copied" class="text-base" />
          <MdiCheck v-else class="text-base text-go-success" />
        </button>
      </div>

      <!-- Add expense action bar -->
      <div class="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          @click="openCreateModal('expense')"
          class="btn-primary flex items-center justify-center gap-1.5 text-sm w-full sm:w-auto"
        >
          <MdiPlus class="text-base" />
          <div class="text-left">
            <span>Gasto</span>
            <span class="block text-[11px] opacity-70 font-normal">Cobrable al cliente</span>
          </div>
        </button>
        <button
          @click="openCreateModal('payment')"
          class="border border-go-secondary text-go-secondary hover:bg-go-secondary/10 rounded-go-md px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto active:scale-[0.97]"
        >
          <MdiPlus class="text-base" />
          <div class="text-left">
            <span>Cobro</span>
            <span class="block text-[11px] opacity-70 font-normal">Ingreso recibido</span>
          </div>
        </button>
        <button
          @click="openCreateModal('provider_expense')"
          class="btn-secondary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          <MdiPlus class="text-base" />
          <div class="text-left">
            <span>Gasto propio</span>
            <span class="block text-[11px] opacity-70 font-normal">No cobrable</span>
          </div>
        </button>
      </div>

      <!-- Summary + Expenses -->
      <div class="mt-8 pt-8 border-t border-go-border-subtle">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div class="order-2 lg:order-none lg:sticky lg:top-6 lg:self-start">
            <ExpenseSummary :expenses="expenseStore.expenses" :budget="project.budget" :categories="resolvedCategories" />
          </div>
          <div class="lg:col-span-2 order-1 lg:order-none">
            <h3 class="font-display font-semibold text-go-text mb-4">Historial</h3>
            <AppLoader v-if="expenseStore.isLoading" text="Cargando gastos..." />
            <template v-else>
              <!-- Empty state callout -->
              <div v-if="expenseStore.expenses.length === 0" class="bg-go-surface border border-go-border-subtle rounded-go-xl p-6 text-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-primary/50 mx-auto mb-3">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h4 class="font-display font-semibold text-go-text">Tu obra está lista.</h4>
                <p class="text-go-text-muted text-sm mt-1">Mandá un gasto por WhatsApp para empezar, o usá el botón + Gasto acá arriba.</p>
              </div>
              <ExpenseList
                :expenses="expenseStore.expenses"
                :editable="true"
                :categories="resolvedCategories"
                @edit="openEditModal"
                @mark-paid="handleMarkPaid"
                @mark-pending="handleMarkPending"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Create expense modal -->
      <ExpenseCreateModal
        :show="showCreateModal"
        :type="createModalType"
        :categories="resolvedCategories"
        @close="showCreateModal = false"
        @submit="handleCreateSubmit"
      />

      <!-- Edit expense modal -->
      <ExpenseEditModal
        :show="showEditModal"
        :expense="editingExpense"
        :projects="projectStore.projects"
        :categories="resolvedCategories"
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
import { useCategoryStore } from '~/stores/category';
import { useRecipientStore } from '~/stores/recipient';
import { formatPrice, formatDate } from '~/utils';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();

const isLoading = ref(true);
const project = ref(null);
const copied = ref(false);
const showCreateModal = ref(false);
const createModalType = ref('expense');
const showEditModal = ref(false);
const editingExpense = ref(null);
const showProjectEditModal = ref(false);

const resolvedCategories = computed(() => {
  const id = route.params.id;
  return categoryStore.getResolved(id);
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
    case 'active': return 'bg-go-success-muted text-go-success';
    case 'paused': return 'bg-go-warning-muted text-go-warning';
    case 'completed': return 'bg-go-surface-alt text-go-text-tertiary';
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
    await Promise.all([
      expenseStore.fetchByProjectId(id),
      categoryStore.fetchGlobal(),
      categoryStore.fetchForProject(id),
      recipientStore.fetchAll()
    ]);
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
      recipientName: formData.recipientName,
      recipientBankInfo: formData.recipientBankInfo,
      recipientPlatform: formData.recipientPlatform,
      recipientCuit: formData.recipientCuit,
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
          recipientName: formData.recipientName,
          recipientBankInfo: formData.recipientBankInfo,
          recipientPlatform: formData.recipientPlatform,
          recipientCuit: formData.recipientCuit,
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

      const label = formData.type === 'payment' ? 'Cobro registrado' : formData.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto agregado';
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
