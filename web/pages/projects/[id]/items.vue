<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="font-display font-bold text-lg text-go-text truncate">{{ project?.name || 'Obra' }}</h1>
          <span
            v-if="project"
            class="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0"
            :class="statusClasses"
          >{{ statusLabel }}</span>
        </div>
        <p v-if="project" class="text-[11px] text-go-text-muted mt-0.5 truncate">
          <span class="font-mono">#{{ project.tag }}</span>
          <template v-if="itemStore.items.length">
            · {{ itemStore.items.length }} items
          </template>
          <template v-if="effectiveBudget > 0">
            · gastado {{ formatPrice(totalExpenses) }} de {{ formatPrice(effectiveBudget) }}
          </template>
        </p>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button
          @click="copyShareLink"
          class="hidden sm:inline-flex btn-secondary text-[12px] items-center gap-1.5"
          title="Copiar link cliente"
        >
          <MdiCheck v-if="copied" class="text-go-success text-base" />
          <MdiLinkVariant v-else class="text-go-secondary text-base" />
          <span>{{ copied ? 'Copiado' : 'Link cliente' }}</span>
        </button>

        <!-- Overflow menu -->
        <div class="relative" v-click-outside="() => showActionsMenu = false">
          <button
            @click="showActionsMenu = !showActionsMenu"
            class="btn-secondary text-sm p-2"
            title="Más acciones"
          >
            <MdiDotsVertical class="text-base" />
          </button>
          <div
            v-if="showActionsMenu"
            class="absolute right-0 top-full mt-1 w-64 bg-go-bg-elevated border border-go-border-subtle rounded-go-md shadow-go-lg py-1 z-30"
          >
            <button class="actions-menu-item sm:hidden" @click="copyShareLink(); showActionsMenu = false">
              <MdiLinkVariant class="text-go-secondary text-base" />
              Copiar link cliente
            </button>
            <button class="actions-menu-item" @click="showProjectEditModal = true; showActionsMenu = false">
              <MdiPencil class="text-base" />
              Editar proyecto
            </button>
            <button class="actions-menu-item" :disabled="isExportingPdf" @click="handleExportPdf(); showActionsMenu = false">
              <MdiFileDocument class="text-base" />
              {{ isExportingPdf ? 'Generando...' : 'Exportar PDF' }}
            </button>
            <div class="border-t border-go-border-subtle my-1"></div>
            <div class="px-3 py-1.5">
              <label class="text-[10.5px] font-bold uppercase tracking-wider text-go-text-muted mb-1 block">Estado</label>
              <select
                v-if="project"
                v-model="project.status"
                @change="updateStatus"
                class="w-full bg-go-surface border border-go-border rounded-go-sm px-2 py-1.5 text-sm text-go-text focus:outline-none focus:border-go-primary"
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5">
      <!-- Loading -->
      <AppLoader v-if="isLoading" text="Cargando obra..." />

      <!-- Not found -->
      <div v-else-if="!project" class="text-center py-16">
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <NuxtLink to="/projects" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a proyectos</NuxtLink>
      </div>

      <!-- Items -->
      <ProjectItemsSection
        v-else
        :project-id="project.id"
        :provider-id="project.providerId"
        :readonly="false"
        @edit-expense="openEditModal"
      />
    </div>

    <!-- Edit project modal -->
    <ProjectEditModal
      :show="showProjectEditModal"
      :project="project"
      @close="showProjectEditModal = false"
      @save="handleProjectEditSave"
    />

    <!-- Edit expense modal (for item-expanded expense edits) -->
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
import MdiCheck from '~icons/mdi/check';
import MdiLinkVariant from '~icons/mdi/link-variant';
import MdiPencil from '~icons/mdi/pencil';
import MdiFileDocument from '~icons/mdi/file-document';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useRecipientStore } from '~/stores/recipient';
import { useVendorStore } from '~/stores/vendor';
import { useDeliveryStore } from '~/stores/delivery';
import { useWhatsappStore } from '~/stores/whatsapp';
import { useProviderStore } from '~/stores/provider';
import { useProjectItemStore } from '~/stores/projectItem';
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { formatPrice } from '~/utils';
import { generatePaymentReport, generateReportNumber } from '~/utils/pdfReport';
import { getCurrentUser } from '~/utils/firebase';

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

const isLoading = ref(true);
const project = ref(null);
const copied = ref(false);
const showActionsMenu = ref(false);
const showProjectEditModal = ref(false);
const showEditModal = ref(false);
const editingExpense = ref(null);
const isEditingExpense = ref(false);
const isDeletingExpense = ref(false);
const isExportingPdf = ref(false);
const managementFeePercent = ref(0);

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

const clientExpenses = computed(() =>
  expenseStore.expenses.filter(e => !e.type || e.type === 'expense')
);
const totalExpenses = computed(() =>
  clientExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const effectiveBudget = computed(() => {
  if (itemStore.items.length > 0) {
    return itemStore.items.reduce(
      (sum, item) => sum + effectiveItemBudget(item, materialStore).totalMidpoint,
      0
    );
  }
  return project.value?.budget || 0;
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

useHead({ title: computed(() => project.value?.name || 'Obra') });

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
  }
});

async function updateStatus() {
  const result = await projectStore.updateProject(project.value.id, { status: project.value.status });
  if (result.success) useToast('success', 'Estado actualizado');
  else useToast('error', 'Error al actualizar el estado');
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

async function handleExportPdf() {
  if (!project.value || isExportingPdf.value) return;
  isExportingPdf.value = true;
  try {
    let reportNumber = project.value.reportNumber;
    if (!reportNumber) {
      reportNumber = generateReportNumber();
      await projectStore.updateProject(project.value.id, { reportNumber });
      project.value.reportNumber = reportNumber;
    }
    const user = getCurrentUser();
    const provider = {
      name: user?.displayName || user?.email || 'Proveedor',
      email: user?.email || '',
      phone: whatsappStore.linkedAccount?.phoneNumber || null
    };
    generatePaymentReport({
      provider,
      project: {
        name: project.value.name,
        clientName: project.value.clientName || '',
        address: project.value.address || '',
        description: project.value.description || '',
        reportNumber,
        startDate: project.value.startDate?.toDate?.() || project.value.startDate || null,
        estimatedEndDate: project.value.estimatedEndDate?.toDate?.() || project.value.estimatedEndDate || null,
        budget: effectiveBudget.value || null,
      },
      expenses: expenseStore.expenses,
      deliveries: deliveryStore.deliveries,
      categories: resolvedCategories.value,
    });
    useToast('success', 'PDF generado');
  } catch (error) {
    console.error('Error generating PDF:', error);
    useToast('error', 'Error al generar el PDF');
  } finally {
    isExportingPdf.value = false;
  }
}

async function handleProjectEditSave(data) {
  const result = await projectStore.updateProject(project.value.id, data);
  if (result.success) {
    useToast('success', 'Proyecto actualizado');
    showProjectEditModal.value = false;
    Object.assign(project.value, data);
  } else {
    useToast('error', result.error || 'Error al actualizar el proyecto');
  }
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

// Close overflow menu on outside click — lightweight, no directive lib.
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value?.();
    };
    document.addEventListener('click', el.__clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('click', el.__clickOutside);
  }
};
</script>

<style scoped>
.actions-menu-item {
  @apply w-full flex items-center gap-2.5 px-3 py-2 text-sm text-go-text-secondary hover:bg-go-surface-hover hover:text-go-text transition-colors;
}
.actions-menu-item:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
