<template>
  <div>
    <!-- Page header -->
    <header class="bg-go-bg-elevated border-b border-go-border-subtle">
      <div class="px-4 lg:px-6 py-3 lg:py-4 max-w-[1600px] mx-auto">
        <!-- Breadcrumb + prev/next -->
        <div class="flex items-center justify-between gap-3 min-w-0">
          <NuxtLink
            :to="`/projects/${route.params.id}/items`"
            class="flex items-center gap-1 text-[11.5px] text-go-text-muted hover:text-go-primary transition-colors shrink-0 min-w-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span class="truncate">Items de la obra</span>
          </NuxtLink>

          <div v-if="item" class="flex items-center gap-1 shrink-0">
            <span v-if="itemStore.items.length > 1" class="text-[10.5px] text-go-text-muted tabular-nums mr-1.5">
              {{ currentIndex + 1 }}/{{ itemStore.items.length }}
            </span>
            <NuxtLink
              v-if="prevItem"
              :to="`/projects/${route.params.id}/items/${prevItem.id}`"
              class="w-8 h-8 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-go-md transition-colors"
              :title="`Anterior: ${prevItem.name}`"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </NuxtLink>
            <span v-else class="w-8 h-8" />
            <NuxtLink
              v-if="nextItem"
              :to="`/projects/${route.params.id}/items/${nextItem.id}`"
              class="w-8 h-8 flex items-center justify-center text-go-text-muted hover:text-go-text hover:bg-go-surface-hover rounded-go-md transition-colors"
              :title="`Siguiente: ${nextItem.name}`"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </NuxtLink>
            <span v-else class="w-8 h-8" />
          </div>
        </div>

        <!-- Title + status + actions -->
        <div v-if="item" class="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase"
                :class="statusTextColor"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDotBg" />
                {{ statusLabel }}
              </span>
              <span class="text-go-border">·</span>
              <span class="text-[11px] text-go-text-muted tabular-nums">{{ dateRangeLabel }}</span>
            </div>
            <h1 class="font-display font-bold text-go-text text-[22px] lg:text-[28px] leading-[1.1] truncate">
              {{ item.name }}
            </h1>
          </div>

          <!-- Action toolbar -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              v-if="!item.actualStartDate"
              @click="markStarted"
              :disabled="busy"
              class="inline-flex items-center gap-1.5 h-9 px-3 rounded-go-md text-[12.5px] font-semibold transition-colors disabled:opacity-50 border border-go-info/40 text-go-info hover:bg-go-info/10"
            >
              <MdiPlayCircleOutline class="text-[15px]" />
              Iniciar
            </button>
            <button
              v-else-if="!item.actualEndDate"
              @click="markCompleted"
              :disabled="busy"
              class="inline-flex items-center gap-1.5 h-9 px-3 rounded-go-md text-[12.5px] font-semibold transition-colors disabled:opacity-50 border border-go-success/40 text-go-success hover:bg-go-success/10"
            >
              <MdiCheckCircleOutline class="text-[15px]" />
              Completar
            </button>

            <button
              @click="openAssign"
              class="inline-flex items-center gap-1.5 h-9 px-3 rounded-go-md text-[12.5px] font-semibold transition-colors border border-go-primary/40 text-go-primary hover:bg-go-primary/10"
            >
              <MdiPlaylistPlus class="text-[15px]" />
              <span class="hidden sm:inline">Asignar gastos</span>
              <span class="sm:hidden">Asignar</span>
            </button>

            <!-- Overflow menu -->
            <div class="relative" v-click-outside="() => showMenu = false">
              <button
                @click="showMenu = !showMenu"
                class="w-9 h-9 flex items-center justify-center rounded-go-md border border-go-border text-go-text-muted hover:text-go-text hover:bg-go-surface-hover transition-colors"
                title="Más acciones"
              >
                <MdiDotsVertical class="text-[17px]" />
              </button>
              <div
                v-if="showMenu"
                class="absolute right-0 top-full mt-1.5 w-56 bg-go-bg-elevated border border-go-border-subtle rounded-go-md shadow-go-lg py-1 z-30"
              >
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-go-text-secondary hover:bg-go-surface-hover hover:text-go-text transition-colors disabled:opacity-50"
                  @click="openEdit(); showMenu = false"
                >
                  <MdiPencil class="text-[15px]" />
                  Editar item
                </button>
                <button
                  v-if="item.actualStartDate || item.actualEndDate"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-go-text-secondary hover:bg-go-surface-hover hover:text-go-text transition-colors disabled:opacity-50"
                  @click="resetProgress(); showMenu = false"
                >
                  <MdiRestore class="text-[15px]" />
                  Reiniciar progreso
                </button>
                <div class="border-t border-go-border-subtle my-1" />
                <button
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-go-danger hover:bg-go-danger/10 transition-colors disabled:opacity-50"
                  @click="confirmDelete(); showMenu = false"
                  :disabled="busy"
                >
                  <MdiDelete class="text-[15px]" />
                  Eliminar item
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Body -->
    <AppLoader v-if="isLoading" text="Cargando item..." />

    <div v-else-if="!item" class="text-center py-16 px-4">
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Item no encontrado</h2>
      <NuxtLink
        :to="`/projects/${route.params.id}/items`"
        class="text-go-primary text-sm mt-4 inline-block hover:underline"
      >&larr; Volver a items</NuxtLink>
    </div>

    <main v-else class="px-4 lg:px-6 py-5 lg:py-6 max-w-[1600px] mx-auto">
      <ProjectItemDetailView
        :item="item"
        :is-client="false"
        @editExpense="openEditExpense"
      />
    </main>

    <!-- Modals -->
    <ProjectItemModal
      :show="showEditItemModal"
      :item="item"
      :has-materials="item ? hasMaterialsForItem(item.id) : false"
      :derived-materials-min="item ? effective(item).materialsMin : 0"
      :derived-materials-max="item ? effective(item).materialsMax : 0"
      :is-submitting="isSubmittingItem"
      @close="showEditItemModal = false"
      @submit="handleItemSubmit"
    />

    <ProjectItemAssignModal
      :show="showAssignModal"
      :item="item"
      :expenses="expenseStore.expenses"
      :items="itemStore.items"
      @close="showAssignModal = false"
      @save="handleAssignSave"
    />

    <ExpenseEditModal
      :show="showExpenseModal"
      :expense="editingExpense"
      :projects="projectStore.projects"
      :categories="resolvedCategories"
      :items="itemStore.items"
      :is-saving="isSavingExpense"
      :is-deleting="isDeletingExpense"
      :management-fee-percent="managementFeePercent"
      @close="showExpenseModal = false"
      @save="handleExpenseSave"
      @delete="handleExpenseDelete"
    />
  </div>
</template>

<script setup>
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
import MdiPlayCircleOutline from '~icons/mdi/play-circle-outline';
import MdiRestore from '~icons/mdi/restore';
import MdiPlaylistPlus from '~icons/mdi/playlist-plus';
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
import { useProjectTaskStore } from '~/stores/projectTask';
import { formatDate } from '~/utils';

definePageMeta({
  layout: 'project',
  middleware: ['auth']
});

const route = useRoute();
const router = useRouter();

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
const taskStore = useProjectTaskStore();

const isLoading = ref(true);
const project = ref(null);
const managementFeePercent = ref(0);

const busy = ref(false);
const showMenu = ref(false);
const showEditItemModal = ref(false);
const isSubmittingItem = ref(false);
const showAssignModal = ref(false);
const showExpenseModal = ref(false);
const editingExpense = ref(null);
const isSavingExpense = ref(false);
const isDeletingExpense = ref(false);

const item = computed(() => {
  const id = route.params.itemId;
  return itemStore.items.find(i => i.id === id) || null;
});

const currentIndex = computed(() => {
  if (!item.value) return -1;
  return itemStore.items.findIndex(i => i.id === item.value.id);
});
const prevItem = computed(() => {
  const idx = currentIndex.value;
  return idx > 0 ? itemStore.items[idx - 1] : null;
});
const nextItem = computed(() => {
  const idx = currentIndex.value;
  if (idx === -1) return null;
  return idx < itemStore.items.length - 1 ? itemStore.items[idx + 1] : null;
});

const effectiveState = computed(() => {
  if (!item.value) return 'pendiente';
  const counts = taskStore.itemTaskCounts(item.value.id);
  if (counts.total > 0) {
    if (counts.done === 0) return 'pendiente';
    if (counts.done === counts.total) return 'completada';
    return 'en_progreso';
  }
  if (item.value.actualEndDate) return 'completada';
  if (item.value.actualStartDate) return 'en_progreso';
  return 'pendiente';
});
const statusLabel = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'Completada';
  if (s === 'en_progreso') return 'En progreso';
  return 'Pendiente';
});
const statusTextColor = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'text-go-success';
  if (s === 'en_progreso') return 'text-go-info';
  return 'text-go-text-muted';
});
const statusDotBg = computed(() => {
  const s = effectiveState.value;
  if (s === 'completada') return 'bg-go-success';
  if (s === 'en_progreso') return 'bg-go-info';
  return 'bg-go-text-muted';
});
const dateRangeLabel = computed(() => {
  if (!item.value) return '';
  const start = formatDate(item.value.plannedStartDate);
  const end = formatDate(item.value.plannedEndDate);
  if (!start && !end) return '';
  return `${start} → ${end}`;
});

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

function effective(i) {
  return effectiveItemBudget(i, materialStore);
}
function hasMaterialsForItem(itemId) {
  return materialStore.materialsForItem(itemId).length > 0;
}

useHead({ title: computed(() => item.value?.name || 'Item') });

onMounted(async () => {
  const id = route.params.id;
  // Avoid refetching when stores are already populated for this project
  // (e.g., when navigating from the items list).
  const needsFetch = itemStore.items.length === 0
    || !itemStore.items.some(i => i.projectId === id);

  if (!needsFetch) {
    const cached = projectStore.projects.find(p => p.id === id);
    if (cached) project.value = cached;
    managementFeePercent.value = providerStore.managementFeePercent;
    isLoading.value = false;
    return;
  }

  const result = await projectStore.fetchProject(id);
  project.value = result;

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
      materialStore.fetchByProjectId(id),
      taskStore.fetchByProjectId(id)
    ]);
    managementFeePercent.value = providerStore.managementFeePercent;
    if (projectStore.projects.length === 0) {
      await projectStore.fetchProjects();
    }
  }
  isLoading.value = false;
});

function openEdit() { showEditItemModal.value = true; }
function openAssign() { showAssignModal.value = true; }
function openEditExpense(expense) {
  editingExpense.value = expense;
  showExpenseModal.value = true;
}

async function markStarted() {
  if (!item.value) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(item.value.id, { actualStartDate: new Date() });
    if (result.success) useToast('success', 'Item iniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function markCompleted() {
  if (!item.value) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(item.value.id, { actualEndDate: new Date() });
    if (result.success) useToast('success', 'Item completado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function resetProgress() {
  if (!item.value) return;
  if (!confirm('¿Reiniciar el progreso de este item? Se borrarán las fechas reales de inicio y fin.')) return;
  busy.value = true;
  try {
    const result = await itemStore.updateItem(item.value.id, {
      actualStartDate: null,
      actualEndDate: null
    });
    if (result.success) useToast('success', 'Progreso reiniciado');
    else useToast('error', result.error || 'Error al actualizar');
  } finally {
    busy.value = false;
  }
}

async function confirmDelete() {
  if (!item.value) return;
  const assigned = expenseStore.expenses.filter(
    e => e.itemId === item.value.id && (!e.type || e.type === 'expense')
  );
  const message = assigned.length > 0
    ? `¿Eliminar el item "${item.value.name}"? Los ${assigned.length} ${assigned.length === 1 ? 'gasto asignado quedará' : 'gastos asignados quedarán'} sin asignar. Esta acción no se puede deshacer.`
    : `¿Eliminar el item "${item.value.name}"? Esta acción no se puede deshacer.`;
  if (!confirm(message)) return;
  busy.value = true;
  try {
    if (assigned.length > 0) {
      await expenseStore.batchUpdateItemId(assigned.map(e => ({ expenseId: e.id, itemId: null })));
    }
    const ok = await itemStore.deleteItem(item.value.id);
    if (ok) {
      useToast('success', 'Item eliminado');
      router.replace(`/projects/${route.params.id}/items`);
    } else {
      useToast('error', itemStore.error || 'Error al eliminar');
    }
  } finally {
    busy.value = false;
  }
}

async function handleItemSubmit(data) {
  if (!item.value) return;
  isSubmittingItem.value = true;
  try {
    const result = await itemStore.updateItem(item.value.id, data);
    if (result.success) {
      useToast('success', 'Item actualizado');
      showEditItemModal.value = false;
    } else {
      useToast('error', result.error || 'Error al actualizar');
    }
  } finally {
    isSubmittingItem.value = false;
  }
}

async function handleAssignSave({ itemId, expenseIds }) {
  const previouslyAssigned = expenseStore.expenses
    .filter(e => e.itemId === itemId)
    .map(e => e.id);

  const assignments = [];
  for (const id of previouslyAssigned) {
    if (!expenseIds.includes(id)) assignments.push({ expenseId: id, itemId: null });
  }
  for (const id of expenseIds) {
    const expense = expenseStore.expenses.find(e => e.id === id);
    if (expense && expense.itemId !== itemId) assignments.push({ expenseId: id, itemId });
  }

  if (assignments.length === 0) {
    showAssignModal.value = false;
    return;
  }

  const result = await expenseStore.batchUpdateItemId(assignments);
  if (result.success) {
    useToast('success', 'Gastos asignados');
    showAssignModal.value = false;
  } else {
    useToast('error', result.error || 'Error al asignar gastos');
  }
}

async function handleExpenseSave({ id, data, createLinkedPayment, deleteLinkedPaymentId }) {
  isSavingExpense.value = true;
  try {
    const result = await expenseStore.updateExpense(id, data);
    if (result.success) {
      if (deleteLinkedPaymentId) {
        await expenseStore.deleteExpense(deleteLinkedPaymentId);
        await expenseStore.updateExpense(id, { linkedPaymentId: null });
      }
      if (createLinkedPayment) {
        const paymentData = {
          projectId: data.projectId || route.params.id,
          providerId: project.value?.providerId,
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
      showExpenseModal.value = false;
    } else {
      useToast('error', result.error || 'Error al actualizar');
    }
  } finally {
    isSavingExpense.value = false;
  }
}

async function handleExpenseDelete(expense) {
  isDeletingExpense.value = true;
  try {
    if (expense.linkedPaymentId) await expenseStore.deleteExpense(expense.linkedPaymentId);
    if (expense.linkedExpenseId) await expenseStore.updateExpense(expense.linkedExpenseId, { linkedPaymentId: null });
    const deleted = await expenseStore.deleteExpense(expense.id);
    if (deleted) {
      useToast('success', 'Registro eliminado');
      showExpenseModal.value = false;
    } else {
      useToast('error', 'Error al eliminar');
    }
  } finally {
    isDeletingExpense.value = false;
  }
}

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
