<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="font-display font-bold text-lg text-go-text truncate">Gastos</h1>
        <p v-if="project" class="text-[11px] text-go-text-muted mt-0.5 truncate">
          {{ project.name }} · <span class="font-mono">#{{ project.tag }}</span>
          <template v-if="clientExpenses.length">
            · {{ clientExpenses.length }} {{ clientExpenses.length === 1 ? 'movimiento' : 'movimientos' }}
          </template>
        </p>
      </div>

      <button
        v-if="activeTab === 'movimientos'"
        @click="openAIInput()"
        class="btn-primary text-sm inline-flex items-center gap-1.5 shrink-0"
      >
        <MdiAutoFix class="text-base" />
        <span class="hidden sm:inline">Nuevo movimiento</span>
        <span class="sm:hidden">Nuevo</span>
      </button>
      <button
        v-else
        @click="editingDelivery = null; showDeliveryModal = true"
        class="btn-primary text-sm inline-flex items-center gap-1.5 shrink-0"
      >
        <MdiPlus class="text-base" />
        <span class="hidden sm:inline">Nueva entrega</span>
        <span class="sm:hidden">Nueva</span>
      </button>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <AppLoader v-if="isLoading" text="Cargando gastos..." />

      <div v-else-if="!project" class="text-center py-16">
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <NuxtLink to="/projects" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a proyectos</NuxtLink>
      </div>

      <template v-else>
        <!-- Tab bar -->
        <div class="flex items-center mb-4">
          <div class="flex bg-go-surface border border-go-border rounded-go-md p-0.5 gap-0.5">
            <button
              @click="activeTab = 'movimientos'"
              class="px-4 py-1.5 text-sm font-medium rounded-go-sm transition-colors"
              :class="activeTab === 'movimientos'
                ? 'bg-go-bg-elevated text-go-text shadow-sm'
                : 'text-go-text-muted hover:text-go-text'"
            >
              Movimientos
            </button>
            <button
              @click="activeTab = 'entregas'"
              class="px-4 py-1.5 text-sm font-medium rounded-go-sm transition-colors"
              :class="activeTab === 'entregas'
                ? 'bg-go-bg-elevated text-go-text shadow-sm'
                : 'text-go-text-muted hover:text-go-text'"
            >
              Entregas
            </button>
          </div>
        </div>

        <AppLoader v-if="expenseStore.isLoading" text="Cargando gastos..." />
        <template v-else>
          <ExpenseList
            v-if="activeTab === 'movimientos'"
            :expenses="expenseStore.expenses"
            :editable="true"
            :categories="resolvedCategories"
            :items="itemStore.items"
            :loading="expenseStore.isLoading"
            @edit="openEditModal"
            @add-installment="handleAddInstallment"
            @view-detail="openDetailModal"
          />

          <DeliveryList
            v-if="activeTab === 'entregas'"
            :deliveries="deliveryStore.deliveries"
            :expenses="expenseStore.expenses"
            :editable="true"
            :is-deleting="isDeletingDelivery"
            @edit="openDeliveryEditModal"
            @delete="handleDeleteDelivery"
            @assign="openDeliveryAssignModal"
            @edit-expense="openEditModal"
            @view-unassigned="showUnassignedModal = true"
          />
        </template>
      </template>
    </div>

    <!-- Delivery create/edit modal -->
    <DeliveryCreateModal
      :show="showDeliveryModal"
      :next-number="deliveryStore.nextNumber"
      :delivery="editingDelivery"
      :is-submitting="isCreatingDelivery"
      @close="showDeliveryModal = false"
      @submit="handleDeliverySubmit"
    />

    <!-- Delivery assign modal -->
    <DeliveryAssignModal
      :show="showDeliveryAssignModal"
      :delivery="assigningDelivery"
      :expenses="expenseStore.expenses"
      @close="showDeliveryAssignModal = false"
      @save="handleAssignExpenses"
    />

    <!-- Unassigned expenses modal -->
    <div v-if="showUnassignedModal" class="modal-backdrop" @click.self="showUnassignedModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <div>
            <h3 class="font-display font-semibold text-base text-go-text">Gastos sin entrega</h3>
            <p class="text-go-text-muted text-xs mt-0.5">{{ unassignedExpenses.length }} gastos · {{ formatPrice(unassignedTotal) }}</p>
          </div>
          <button @click="showUnassignedModal = false" class="modal-close">
            <MdiClose class="text-xl" />
          </button>
        </div>
        <div class="modal-body">
          <div class="divide-y divide-go-border-subtle">
            <div
              v-for="expense in unassignedExpenses"
              :key="expense.id"
              class="flex items-center gap-3 py-3 cursor-pointer hover:bg-go-surface-alt/50 -mx-4 px-4 transition-colors"
              @click="showUnassignedModal = false; openEditModal(expense)"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm text-go-text">{{ expense.title }}</span>
                <span class="text-xs text-go-text-muted ml-2 tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
              </div>
              <span class="font-display font-semibold text-sm tabular-nums text-go-primary whitespace-nowrap">{{ formatPrice(expense.amount) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showUnassignedModal = false" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- AI input modal -->
    <ExpenseAIInput
      :show="showAIInput"
      :project-id="project?.id"
      @close="showAIInput = false"
      @parsed="handleAIParsed"
      @skip="handleAISkip"
    />

    <!-- Create expense modal -->
    <ExpenseCreateModal
      :show="showCreateModal"
      :type="createModalType"
      :categories="resolvedCategories"
      :deliveries="deliveryStore.deliveries"
      :prefill="createModalPrefill"
      :is-submitting="isCreatingExpense"
      :management-fee-percent="managementFeePercent"
      @close="showCreateModal = false"
      @submit="handleCreateSubmit"
    />

    <!-- Detail expense modal -->
    <ExpenseDetailModal
      :show="showDetailModal"
      :expense="detailExpense"
      :expenses="expenseStore.expenses"
      :categories="resolvedCategories"
      :items="itemStore.items"
      :editable="true"
      @close="showDetailModal = false"
      @edit="handleDetailEdit"
      @view-expense="handleDetailViewExpense"
    />

    <!-- Edit expense modal -->
    <ExpenseEditModal
      :show="showEditModal"
      :expense="editingExpense"
      :projects="projectStore.projects"
      :categories="resolvedCategories"
      :items="itemStore.items"
      :is-saving="isEditingExpense"
      :is-deleting="isDeletingExpense"
      :management-fee-percent="managementFeePercent"
      @close="showEditModal = false"
      @save="handleEditSave"
      @delete="handleDeleteExpense"
    />
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import MdiAutoFix from '~icons/mdi/auto-fix';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useRecipientStore } from '~/stores/recipient';
import { useVendorStore } from '~/stores/vendor';
import { useDeliveryStore } from '~/stores/delivery';
import { useWhatsappStore } from '~/stores/whatsapp';
import { useProviderStore } from '~/stores/provider';
import { useProjectItemStore } from '~/stores/projectItem';
import { useProjectMaterialStore } from '~/stores/projectMaterial';
import { formatPrice } from '~/utils';

definePageMeta({
  layout: 'project',
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();
const vendorStore = useVendorStore();
const deliveryStore = useDeliveryStore();
const whatsappStore = useWhatsappStore();
const providerStore = useProviderStore();
const itemStore = useProjectItemStore();
const materialStore = useProjectMaterialStore();

const managementFeePercent = ref(0);
const isLoading = ref(true);
const project = ref(null);
const activeTab = ref('movimientos');

const showAIInput = ref(false);
const showCreateModal = ref(false);
const createModalType = ref('expense');
const createModalPrefill = ref(null);
const showEditModal = ref(false);
const editingExpense = ref(null);
const showDeliveryModal = ref(false);
const showDeliveryAssignModal = ref(false);
const showUnassignedModal = ref(false);
const assigningDelivery = ref(null);
const editingDelivery = ref(null);
const isCreatingExpense = ref(false);
const isEditingExpense = ref(false);
const isDeletingExpense = ref(false);
const isCreatingDelivery = ref(false);
const isDeletingDelivery = ref(false);
const showDetailModal = ref(false);
const detailExpense = ref(null);

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

const clientExpenses = computed(() =>
  expenseStore.expenses.filter(e => !e.type || e.type === 'expense')
);

const unassignedExpenses = computed(() =>
  expenseStore.expenses.filter(e => (!e.type || e.type === 'expense') && !e.deliveryId)
);
const unassignedTotal = computed(() =>
  unassignedExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

useHead({ title: computed(() => project.value ? `Gastos · ${project.value.name}` : 'Gastos') });

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
      recipientStore.fetchAll(),
      deliveryStore.fetchByProjectId(id),
      whatsappStore.fetchLinkedAccount(),
      providerStore.fetchOrCreate(),
      itemStore.fetchByProjectId(id),
      materialStore.fetchByProjectId(id)
    ]);
    managementFeePercent.value = providerStore.managementFeePercent;
    if (projectStore.projects.length === 0) {
      await projectStore.fetchProjects();
    }

    const tabParam = route.query.tab;
    if (tabParam === 'entregas' || tabParam === 'movimientos') {
      activeTab.value = tabParam;
    }
  }
});

function openAIInput() { showAIInput.value = true; }

function handleAIParsed(result) {
  showAIInput.value = false;
  const p = result.parsed || {};
  const prefill = {
    title: p.title || '',
    totalAmount: p.totalAmount || (p.items?.length ? p.items.reduce((s, i) => s + (i.amount || 0), 0) : ''),
    category: p.category || 'materiales',
    items: p.items?.length ? p.items.map(i => ({ name: i.name, amount: i.amount })) : [],
    paymentMethod: p.paymentMethod || null,
    vendor: p.vendor || p.vendorName || '',
    installmentPercent: parseInt(p.installmentPercent, 10) || 0,
    applyManagementFee: p.applyManagementFee || false,
    imageUrl: result.imageUrl || null,
    fileUrl: result.fileUrl || null,
    aiParsed: true
  };
  const type = p.transactionType === 'payment' ? 'payment'
    : p.transactionType === 'provider_expense' ? 'provider_expense'
    : 'expense';
  openCreateModal(type, prefill);
}

function handleAISkip(type) {
  showAIInput.value = false;
  openCreateModal(type || 'expense');
}

function openCreateModal(type, prefill = null) {
  createModalType.value = type;
  createModalPrefill.value = prefill;
  showCreateModal.value = true;
}

function handleAddInstallment(expense) {
  const groupId = expense.installmentGroupId;
  const paidPercent = getInstallmentGroupPercent(groupId);
  const remainingPercent = 100 - paidPercent;
  if (remainingPercent <= 0) {
    useToast('info', 'Este gasto ya está pagado al 100%');
    return;
  }
  const totalAmount = getInstallmentGroupTotal(groupId);
  openCreateModal('expense', {
    title: expense.title,
    category: expense.category,
    scopeType: expense.scopeType,
    paymentMethod: expense.paymentMethod,
    recipientName: expense.recipientName,
    recipientBankInfo: expense.recipientBankInfo,
    recipientPlatform: expense.recipientPlatform,
    recipientCuit: expense.recipientCuit,
    installmentPercent: remainingPercent,
    installmentMaxPercent: remainingPercent,
    installmentGroupId: groupId,
    totalAmount,
    items: expense.items || [],
    locked: true,
    applyManagementFee: expense.managementFeePercent > 0
  });
}

function getInstallmentGroupPercent(groupId) {
  if (!groupId) return 0;
  return expenseStore.expenses
    .filter(e => e.installmentGroupId === groupId)
    .reduce((sum, e) => sum + (e.installmentPercent || 0), 0);
}

function getInstallmentGroupTotal(groupId) {
  if (!groupId) return 0;
  const first = expenseStore.expenses.find(e => e.installmentGroupId === groupId && e.installmentPercent);
  if (!first) return 0;
  return Math.round(first.amount / (first.installmentPercent / 100));
}

async function handleCreateSubmit(formData) {
  isCreatingExpense.value = true;
  try {
    const data = {
      projectId: project.value.id,
      providerId: project.value.providerId,
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      type: formData.type,
      scopeType: formData.scopeType || 'original',
      paymentMethod: formData.paymentMethod,
      recipientName: formData.recipientName,
      recipientBankInfo: formData.recipientBankInfo,
      recipientPlatform: formData.recipientPlatform,
      recipientCuit: formData.recipientCuit,
      deliveryId: formData.deliveryId || null,
      items: formData.items,
      installmentPercent: formData.installmentPercent ?? null,
      installmentGroupId: formData.installmentGroupId || null,
      vendor: formData.vendor || null,
      amountBase: formData.amountBase ?? null,
      managementFeePercent: formData.managementFeePercent ?? null,
      imageUrl: createModalPrefill.value?.imageUrl || null,
      fileUrl: createModalPrefill.value?.fileUrl || null
    };
    const result = await expenseStore.createExpense(data);
    if (result.success) {
      if (formData.createLinkedPayment) {
        const paymentData = {
          projectId: project.value.id,
          providerId: project.value.providerId,
          title: `Pago: ${formData.title}`,
          description: '',
          amount: formData.amount,
          category: 'pago',
          type: 'payment',
          paymentMethod: formData.paymentMethod,
          recipientName: formData.recipientName,
          recipientBankInfo: formData.recipientBankInfo,
          recipientPlatform: formData.recipientPlatform,
          recipientCuit: formData.recipientCuit,
          linkedExpenseId: result.data.id,
          items: null,
          vendor: formData.vendor || null
        };
        const paymentResult = await expenseStore.createExpense(paymentData);
        if (paymentResult.success) {
          await expenseStore.updateExpense(result.data.id, { linkedPaymentId: paymentResult.data.id });
        }
      }
      if (formData.vendor) vendorStore.addVendor(formData.vendor);
      const label = formData.type === 'payment' ? 'Cobro registrado' : formData.type === 'provider_expense' ? 'Gasto propio registrado' : 'Gasto agregado';
      useToast('success', label);
      showCreateModal.value = false;
    } else {
      useToast('error', result.error || 'Error al agregar');
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    useToast('error', 'Error al agregar');
  } finally {
    isCreatingExpense.value = false;
  }
}

function openDetailModal(expense) {
  detailExpense.value = expense;
  showDetailModal.value = true;
}

function handleDetailEdit(expense) {
  showDetailModal.value = false;
  openEditModal(expense);
}

function handleDetailViewExpense(expense) {
  detailExpense.value = expense;
}

function openEditModal(expense) {
  editingExpense.value = expense;
  showEditModal.value = true;
}

async function handleEditSave({ id, data, createLinkedPayment, deleteLinkedPaymentId }) {
  isEditingExpense.value = true;
  try {
    const result = await expenseStore.updateExpense(id, data);
    if (result.success) {
      if (deleteLinkedPaymentId) {
        await expenseStore.deleteExpense(deleteLinkedPaymentId);
        await expenseStore.updateExpense(id, { linkedPaymentId: null });
      }
      if (createLinkedPayment) {
        const paymentData = {
          projectId: data.projectId || project.value.id,
          providerId: project.value.providerId,
          title: `Pago: ${data.title}`,
          description: '',
          amount: data.amount,
          category: 'pago',
          type: 'payment',
          paymentMethod: data.paymentMethod,
          recipientName: data.recipientName,
          recipientBankInfo: data.recipientBankInfo,
          recipientPlatform: data.recipientPlatform,
          recipientCuit: data.recipientCuit,
          linkedExpenseId: id,
          items: null,
          vendor: data.vendor || null
        };
        const paymentResult = await expenseStore.createExpense(paymentData);
        if (paymentResult.success) {
          await expenseStore.updateExpense(id, { linkedPaymentId: paymentResult.data.id });
        }
      }
      if (data.vendor) vendorStore.addVendor(data.vendor);
      useToast('success', 'Registro actualizado');
      showEditModal.value = false;
      if (data.projectId && data.projectId !== project.value.id) {
        expenseStore.expenses = expenseStore.expenses.filter(e => e.id !== id);
      }
    } else {
      useToast('error', result.error || 'Error al actualizar');
    }
  } finally {
    isEditingExpense.value = false;
  }
}

async function handleDeleteExpense(expense) {
  isDeletingExpense.value = true;
  try {
    if (expense.linkedPaymentId) await expenseStore.deleteExpense(expense.linkedPaymentId);
    if (expense.linkedExpenseId) await expenseStore.updateExpense(expense.linkedExpenseId, { linkedPaymentId: null });
    const deleted = await expenseStore.deleteExpense(expense.id);
    if (deleted) {
      useToast('success', 'Registro eliminado');
      showEditModal.value = false;
    } else {
      useToast('error', 'Error al eliminar');
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    useToast('error', 'Error al eliminar');
  } finally {
    isDeletingExpense.value = false;
  }
}

async function handleDeliverySubmit(formData) {
  isCreatingDelivery.value = true;
  try {
    if (formData.id) {
      const result = await deliveryStore.updateDelivery(formData.id, {
        date: formData.date,
        description: formData.description
      });
      if (result.success) {
        useToast('success', 'Entrega actualizada');
        showDeliveryModal.value = false;
      } else {
        useToast('error', result.error || 'Error al actualizar la entrega');
      }
    } else {
      const result = await deliveryStore.createDelivery({
        projectId: project.value.id,
        providerId: project.value.providerId,
        date: formData.date,
        description: formData.description
      });
      if (result.success) {
        useToast('success', 'Entrega creada');
        showDeliveryModal.value = false;
      } else {
        useToast('error', result.error || 'Error al crear la entrega');
      }
    }
  } finally {
    isCreatingDelivery.value = false;
  }
}

function openDeliveryEditModal(delivery) {
  editingDelivery.value = delivery;
  showDeliveryModal.value = true;
}

async function handleDeleteDelivery(delivery) {
  if (!confirm(`¿Eliminar la ${delivery.number}° Entrega? Los gastos asignados quedarán sin entrega.`)) return;
  isDeletingDelivery.value = true;
  try {
    const result = await deliveryStore.deleteDelivery(delivery.id, expenseStore);
    if (result) useToast('success', 'Entrega eliminada');
    else useToast('error', 'Error al eliminar la entrega');
  } finally {
    isDeletingDelivery.value = false;
  }
}

function openDeliveryAssignModal(delivery) {
  assigningDelivery.value = delivery;
  showDeliveryAssignModal.value = true;
}

async function handleAssignExpenses({ deliveryId, expenseIds }) {
  try {
    const currentlyAssigned = expenseStore.expenses
      .filter(e => e.deliveryId === deliveryId)
      .map(e => e.id);
    const assignments = [];
    for (const id of currentlyAssigned) {
      if (!expenseIds.includes(id)) {
        assignments.push({ expenseId: id, deliveryId: null });
      }
    }
    for (const id of expenseIds) {
      if (!currentlyAssigned.includes(id)) {
        assignments.push({ expenseId: id, deliveryId });
      }
    }
    if (assignments.length === 0) {
      showDeliveryAssignModal.value = false;
      return;
    }
    const result = await expenseStore.batchUpdateDeliveryId(assignments);
    if (result.success) {
      useToast('success', 'Gastos asignados');
      showDeliveryAssignModal.value = false;
    } else {
      useToast('error', result.error || 'Error al asignar gastos');
    }
  } catch (error) {
    console.error('Error assigning expenses:', error);
    useToast('error', 'Error al asignar gastos');
  }
}
</script>
