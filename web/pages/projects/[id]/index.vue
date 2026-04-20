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
      <!-- KPIs skeleton -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <div v-for="n in 4" :key="n" class="bg-go-surface rounded-go-xl skeleton-shimmer h-24"></div>
      </div>
      <!-- Actions skeleton -->
      <div class="flex gap-2 mt-4">
        <div v-for="n in 4" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-10 w-24"></div>
      </div>
      <!-- Movements skeleton -->
      <div class="mt-8 pt-8 border-t border-go-border-subtle">
        <div v-for="n in 5" :key="n" class="bg-go-surface rounded-go-md skeleton-shimmer h-20 mb-3"></div>
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
            @click="handleExportPdf"
            class="btn-secondary text-sm flex items-center gap-1"
            :disabled="isExportingPdf"
          >
            <MdiFileDocument class="text-base" />
            {{ isExportingPdf ? 'Generando...' : 'Exportar PDF' }}
          </button>
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

      <!-- Project info -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-go-text-tertiary">
        <div v-if="project.clientName" class="flex items-center gap-1.5">
          <MdiAccountOutline class="text-base text-go-text-muted" />
          <span>{{ project.clientName }}</span>
        </div>
        <div v-if="project.address" class="flex items-center gap-1.5">
          <MdiMapMarkerOutline class="text-base text-go-text-muted" />
          <span>{{ project.address }}</span>
        </div>
        <div v-if="effectiveBudget > 0" class="flex items-center gap-1.5">
          <MdiCurrencyUsd class="text-base text-go-text-muted" />
          <span>Presupuesto: {{ formatPrice(effectiveBudget) }}</span>
        </div>
        <div v-if="project.startDate || project.estimatedEndDate" class="flex items-center gap-1.5">
          <MdiCalendarRange class="text-base text-go-text-muted" />
          <span>{{ project.startDate ? formatDate(project.startDate) : '—' }} → {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}</span>
        </div>
      </div>
      <p v-if="project.description" class="text-sm text-go-text-muted mt-1.5">{{ project.description }}</p>

      <!-- KPIs -->
      <div class="flex items-center justify-between mt-5 mb-3">
        <h2 class="font-display font-semibold text-go-text">Resumen</h2>
        <NuxtLink
          :to="`/projects/${route.params.id}/resumen`"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-go-md bg-go-primary text-white text-sm font-medium hover:bg-go-primary-hover transition-colors"
        >
          <MdiChartBox class="text-base" />
          Ver resumen
        </NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <!-- Gastado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-primary/15 flex items-center justify-center">
              <MdiTrendingUp class="text-sm text-go-primary" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Gastado</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-primary block leading-tight">{{ formatPrice(totalExpenses) }}</span>
          <span v-if="effectiveBudget > 0" class="text-xs text-go-text-muted tabular-nums">{{ budgetSpentPercent.toFixed(0) }}% del presupuesto</span>
        </div>

        <!-- Cobrado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-secondary/15 flex items-center justify-center">
              <MdiCashCheck class="text-sm text-go-secondary" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Cobrado</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums text-go-secondary block leading-tight">{{ formatPrice(totalPayments) }}</span>
          <span v-if="effectiveBudget > 0" class="text-xs text-go-text-muted tabular-nums">{{ budgetCollectedPercent.toFixed(0) }}% del presupuesto</span>
        </div>

        <!-- Saldo -->
        <div
          class="border rounded-go-xl px-3.5 py-3"
          :class="balance >= 0 ? 'bg-go-success-muted border-go-success/30' : 'bg-go-danger-muted border-go-danger/30'"
        >
          <div class="flex items-center gap-2 mb-1.5">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center"
              :class="balance >= 0 ? 'bg-go-success/15' : 'bg-go-danger/15'"
            >
              <MdiCheckCircle v-if="balance >= 0" class="text-sm text-go-success" />
              <MdiAlertCircle v-else class="text-sm text-go-danger" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Saldo</span>
          </div>
          <span
            class="font-display font-bold text-lg tabular-nums block leading-tight"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ formatPrice(Math.abs(balance)) }}</span>
          <span
            class="text-xs font-medium"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ balance >= 0 ? 'Al día' : 'Falta cobrar' }}</span>
        </div>

        <!-- Gastos propios -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-3.5 py-3">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-7 h-7 rounded-full bg-go-text-muted/10 flex items-center justify-center">
              <MdiWalletOutline class="text-sm text-go-text-muted" />
            </div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Propios</span>
          </div>
          <span class="font-display font-bold text-lg tabular-nums block leading-tight" :class="totalProviderExpenses > 0 ? 'text-go-text' : 'text-go-text-muted'">{{ formatPrice(totalProviderExpenses) }}</span>
          <span class="text-xs text-go-text-muted">No cobrables</span>
        </div>
      </div>

      <!-- Items -->
      <ProjectItemsSection
        v-if="project.id && project.providerId"
        :project-id="project.id"
        :provider-id="project.providerId"
        :readonly="false"
        @edit-expense="openEditModal"
      />

      <!-- Actions: share link + add buttons -->
      <div class="flex flex-col sm:flex-row gap-2 mb-2">
        <button
          @click="copyShareLink"
          class="bg-go-bg-elevated border border-go-border rounded-go-md px-4 py-2.5 flex items-center gap-2.5 hover:border-go-secondary transition-colors group active:scale-[0.99] sm:mr-auto"
        >
          <MdiCheck v-if="copied" class="text-go-success text-base" />
          <MdiLinkVariant v-else class="text-go-secondary text-base" />
          <span class="text-sm text-go-text-secondary">Link cliente</span>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-go-sm transition-colors"
            :class="copied
              ? 'bg-go-success/15 text-go-success'
              : 'bg-go-secondary/10 text-go-secondary group-hover:bg-go-secondary/20'"
          >{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <button
          @click="openAIInput()"
          class="btn-primary flex items-center justify-center gap-1.5 text-sm"
        >
          <MdiAutoFix class="text-base" />
          Nuevo movimiento
        </button>
      </div>

      <!-- Movements -->
      <div
        ref="tabSectionRef"
        class="mt-8 pt-8 border-t border-go-border-subtle"
      >
        <!-- Tab bar -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex bg-go-surface border border-go-border rounded-go-md p-0.5 gap-0.5">
            <button
              @click="activeTab = 'movimientos'"
              class="px-4 py-1.5 text-sm font-medium rounded-go-sm transition-colors"
              :class="activeTab === 'movimientos'
                ? 'bg-go-bg text-go-text shadow-sm'
                : 'text-go-text-muted hover:text-go-text'"
            >
              Movimientos
            </button>
            <button
              @click="activeTab = 'entregas'"
              class="px-4 py-1.5 text-sm font-medium rounded-go-sm transition-colors"
              :class="activeTab === 'entregas'
                ? 'bg-go-bg text-go-text shadow-sm'
                : 'text-go-text-muted hover:text-go-text'"
            >
              Entregas
            </button>
          </div>
          <button
            v-if="activeTab === 'entregas'"
            ref="newDeliveryBtnRef"
            @click="editingDelivery = null; showDeliveryModal = true"
            class="btn-primary text-sm flex items-center gap-1.5"
            :class="highlightTab ? 'heartbeat' : ''"
          >
            <MdiPlus class="text-base" />
            Nueva entrega
          </button>
        </div>

        <AppLoader v-if="expenseStore.isLoading" text="Cargando gastos..." />
        <template v-else>
          <!-- Movimientos tab -->
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

          <!-- Entregas tab -->
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
import MdiChartBox from '~icons/mdi/chart-box';
import MdiLinkVariant from '~icons/mdi/link-variant';
import MdiCheck from '~icons/mdi/check';
import MdiPlus from '~icons/mdi/plus';
import MdiPencil from '~icons/mdi/pencil';
import MdiClose from '~icons/mdi/close';
import MdiFileDocument from '~icons/mdi/file-document';
import MdiTrendingUp from '~icons/mdi/trending-up';
import MdiCashCheck from '~icons/mdi/cash-check';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiWalletOutline from '~icons/mdi/wallet-outline';
import MdiAccountOutline from '~icons/mdi/account-outline';
import MdiMapMarkerOutline from '~icons/mdi/map-marker-outline';
import MdiCurrencyUsd from '~icons/mdi/currency-usd';
import MdiCalendarRange from '~icons/mdi/calendar-range';
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
import { useProjectMaterialStore, effectiveItemBudget } from '~/stores/projectMaterial';
import { formatPrice, formatDate } from '~/utils';
import { generatePaymentReport, generateReportNumber } from '~/utils/pdfReport';
import { getCurrentUser } from '~/utils/firebase';

definePageMeta({
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
const copied = ref(false);
const showAIInput = ref(false);
const showCreateModal = ref(false);
const createModalType = ref('expense');
const createModalPrefill = ref(null);
const showEditModal = ref(false);
const editingExpense = ref(null);
const showProjectEditModal = ref(false);
const tabSectionRef = ref(null);
const newDeliveryBtnRef = ref(null);
const highlightTab = ref(false);
const activeTab = ref('movimientos');
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
const isExportingPdf = ref(false);

const resolvedCategories = computed(() => {
  const id = route.params.id;
  return categoryStore.getResolved(id);
});

// Financial KPIs
const clientExpenses = computed(() =>
  expenseStore.expenses.filter(e => !e.type || e.type === 'expense')
);

const payments = computed(() =>
  expenseStore.expenses.filter(e => e.type === 'payment')
);

const providerExpensesList = computed(() =>
  expenseStore.expenses.filter(e => e.type === 'provider_expense')
);

const totalExpenses = computed(() =>
  clientExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  payments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalProviderExpenses = computed(() =>
  providerExpensesList.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

// When the project has items, the effective budget is the sum of item budgets.
// Otherwise fall back to the legacy project-level budget field.
const effectiveBudget = computed(() => {
  if (itemStore.items.length > 0) {
    return itemStore.items.reduce(
      (sum, item) => sum + effectiveItemBudget(item, materialStore).totalMidpoint,
      0
    );
  }
  return project.value?.budget || 0;
});

const budgetSpentPercent = computed(() => {
  if (effectiveBudget.value <= 0) return 0;
  return (totalExpenses.value / effectiveBudget.value) * 100;
});

const budgetCollectedPercent = computed(() => {
  if (effectiveBudget.value <= 0) return 0;
  return (totalPayments.value / effectiveBudget.value) * 100;
});

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
      recipientStore.fetchAll(),
      deliveryStore.fetchByProjectId(id),
      whatsappStore.fetchLinkedAccount(),
      providerStore.fetchOrCreate(),
      itemStore.fetchByProjectId(id),
      materialStore.fetchByProjectId(id)
    ]);
    managementFeePercent.value = providerStore.managementFeePercent;
    // Load all projects for the edit modal's "move" feature
    if (projectStore.projects.length === 0) {
      await projectStore.fetchProjects();
    }

    // Handle ?tab= query param — switch tab, scroll and highlight
    const tabParam = route.query.tab;
    if (tabParam === 'entregas' || tabParam === 'movimientos') {
      activeTab.value = tabParam;
      await nextTick();
      tabSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightTab.value = true;
      setTimeout(() => { highlightTab.value = false; }, 2000);
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

async function handleExportPdf() {
  if (!project.value || isExportingPdf.value) return;
  isExportingPdf.value = true;

  try {
    // Ensure report number exists on project
    let reportNumber = project.value.reportNumber;
    if (!reportNumber) {
      reportNumber = generateReportNumber();
      await projectStore.updateProject(project.value.id, { reportNumber });
      project.value.reportNumber = reportNumber;
    }

    // Get provider info from Firebase Auth + WhatsApp store
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

function openAIInput() {
  showAIInput.value = true;
}

function handleAIParsed(result) {
  showAIInput.value = false;
  const p = result.parsed || {};

  // Map AI result to the prefill format expected by ExpenseCreateModal
  const prefill = {
    title: p.title || '',
    totalAmount: p.totalAmount || (p.items?.length ? p.items.reduce((s, i) => s + (i.amount || 0), 0) : ''),
    category: p.category || 'materiales',
    items: p.items?.length ? p.items.map(i => ({ name: i.name, amount: i.amount })) : [],
    paymentMethod: p.paymentMethod || null,
    vendor: p.vendor || p.vendorName || '',
    installmentPercent: parseInt(p.installmentPercent, 10) || 0,
    applyManagementFee: p.applyManagementFee || false,
    // File URLs from the parse response
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

  // Calculate total amount from first installment in the group
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
  // Reverse-calculate total from any installment: amount / (percent / 100)
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
          await expenseStore.updateExpense(result.data.id, {
            linkedPaymentId: paymentResult.data.id
          });
        }
      }

      // Auto-add vendor to provider's vendor list
      if (formData.vendor) {
        vendorStore.addVendor(formData.vendor);
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

async function handleEditSave({ id, data, createLinkedPayment, deleteLinkedPaymentId }) {
  isEditingExpense.value = true;
  try {
    const result = await expenseStore.updateExpense(id, data);

    if (result.success) {
      // Delete linked payment when going from X% to 0% (discount from balance)
      if (deleteLinkedPaymentId) {
        await expenseStore.deleteExpense(deleteLinkedPaymentId);
        await expenseStore.updateExpense(id, { linkedPaymentId: null });
      }

      // Create linked payment when going from 0% to a higher percentage
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
          await expenseStore.updateExpense(id, {
            linkedPaymentId: paymentResult.data.id
          });
        }
      }

      // Auto-add vendor to provider's vendor list
      if (data.vendor) {
        vendorStore.addVendor(data.vendor);
      }

      useToast('success', 'Registro actualizado');
      showEditModal.value = false;

      // If moved to another project, remove from current list
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
    // Delete linked payment if exists
    if (expense.linkedPaymentId) {
      await expenseStore.deleteExpense(expense.linkedPaymentId);
    }

    // If this is a payment linked to an expense, clear the reference
    if (expense.linkedExpenseId) {
      await expenseStore.updateExpense(expense.linkedExpenseId, { linkedPaymentId: null });
    }

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
      // Edit
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
      // Create
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
    if (result) {
      useToast('success', 'Entrega eliminada');
    } else {
      useToast('error', 'Error al eliminar la entrega');
    }
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

    // Unassign removed
    for (const id of currentlyAssigned) {
      if (!expenseIds.includes(id)) {
        assignments.push({ expenseId: id, deliveryId: null });
      }
    }

    // Assign new
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

<style scoped>
.heartbeat {
  animation: heartbeat 2s ease-in-out;
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  10% { transform: scale(1.15); }
  20% { transform: scale(1); }
  30% { transform: scale(1.15); }
  40% { transform: scale(1); }
  100% { transform: scale(1); }
}
</style>
