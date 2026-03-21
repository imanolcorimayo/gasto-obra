<template>
  <div class="mb-8">
    <AppLoader v-if="isLoading" />

    <div v-else-if="!project" class="text-center py-16">
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
      <NuxtLink to="/client" class="text-go-primary text-sm mt-4 inline-block hover:underline">← Volver a mis obras</NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink
        :to="`/client/project/${route.params.id}`"
        class="text-go-text-muted text-sm hover:text-go-text inline-flex items-center gap-1 mb-4"
      >
        <MdiArrowLeft class="text-lg" />
        Volver al proyecto
      </NuxtLink>

      <h1 class="font-display font-bold text-2xl text-go-text mb-1">Resumen financiero</h1>
      <p class="text-sm text-go-text-muted mb-6">{{ project.name }}</p>

      <!-- ==================== HERO KPIs ==================== -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

        <!-- Total Gastado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl p-5 flex flex-col items-center text-center">
          <div class="relative w-28 h-28 mb-4">
            <div
              class="absolute inset-0 rounded-full"
              :style="ringStyle(budgetSpentPercent, 'var(--go-primary)')"
            ></div>
            <div class="absolute inset-[6px] rounded-full bg-go-surface flex items-center justify-center">
              <span class="font-display font-bold text-xl tabular-nums text-go-primary">{{ budgetSpentPercent.toFixed(0) }}%</span>
            </div>
          </div>
          <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-1">Total gastado</span>
          <span class="font-display font-bold text-2xl tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
          <span v-if="project.budget" class="text-xs text-go-text-muted mt-1">de {{ formatPrice(project.budget) }} presupuestado</span>
        </div>

        <!-- Total Cobrado -->
        <div class="bg-go-surface border border-go-border rounded-go-xl p-5 flex flex-col items-center text-center">
          <div class="relative w-28 h-28 mb-4">
            <div
              class="absolute inset-0 rounded-full"
              :style="ringStyle(budgetCollectedPercent, 'var(--go-secondary)')"
            ></div>
            <div class="absolute inset-[6px] rounded-full bg-go-surface flex items-center justify-center">
              <span class="font-display font-bold text-xl tabular-nums text-go-secondary">{{ budgetCollectedPercent.toFixed(0) }}%</span>
            </div>
          </div>
          <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-1">Total cobrado</span>
          <span class="font-display font-bold text-2xl tabular-nums text-go-secondary">{{ formatPrice(totalPayments) }}</span>
          <span v-if="project.budget" class="text-xs text-go-text-muted mt-1">de {{ formatPrice(project.budget) }} presupuestado</span>
        </div>

        <!-- Saldo Pendiente -->
        <div
          class="border rounded-go-xl p-5 flex flex-col items-center justify-center text-center"
          :class="balance >= 0
            ? 'bg-go-success-muted border-go-success/30'
            : 'bg-go-danger-muted border-go-danger/30'"
        >
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            :class="balance >= 0 ? 'bg-go-success/15' : 'bg-go-danger/15'"
          >
            <MdiCheckCircle v-if="balance >= 0" class="text-3xl text-go-success" />
            <MdiAlertCircle v-else class="text-3xl text-go-danger" />
          </div>
          <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-1">Saldo pendiente</span>
          <span
            class="font-display font-bold text-3xl tabular-nums"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ formatPrice(Math.abs(balance)) }}</span>
          <span
            class="text-xs font-medium mt-1.5 px-2.5 py-0.5 rounded-full"
            :class="balance >= 0
              ? 'bg-go-success/15 text-go-success'
              : 'bg-go-danger/15 text-go-danger'"
          >{{ balance >= 0 ? 'Al día' : 'Falta abonar al proveedor' }}</span>
        </div>
      </div>

      <!-- ==================== SECONDARY KPIs ==================== -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <!-- Cronograma -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-5 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Cronograma</span>
            <span v-if="timelinePercent != null" class="text-xs font-semibold tabular-nums text-go-info">{{ timelinePercent.toFixed(0) }}%</span>
          </div>
          <template v-if="timelinePercent != null">
            <div class="w-full bg-go-surface-alt rounded-full h-2 mb-2">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :class="timelinePercent > 100 ? 'bg-go-danger' : timelinePercent > 80 ? 'bg-go-warning' : 'bg-go-info'"
                :style="{ width: Math.min(timelinePercent, 100) + '%' }"
              ></div>
            </div>
            <div class="flex justify-between text-[11px] text-go-text-muted tabular-nums">
              <span>{{ formatDate(project.startDate) }}</span>
              <span>{{ daysRemaining >= 0 ? `${daysRemaining} días restantes` : `${Math.abs(daysRemaining)} días de atraso` }}</span>
            </div>
          </template>
          <p v-else class="text-sm text-go-text-muted">Sin fechas definidas</p>
        </div>

        <!-- Gasto promedio semanal -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-5 py-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-2">Promedio semanal</span>
          <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ formatPrice(avgWeeklySpend) }}</span>
          <p class="text-[11px] text-go-text-muted mt-1">en {{ weeksElapsed }} {{ weeksElapsed === 1 ? 'semana' : 'semanas' }} de obra</p>
        </div>

        <!-- Cantidad de gastos -->
        <div class="bg-go-surface border border-go-border rounded-go-xl px-5 py-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-2">Cantidad de gastos</span>
          <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ expenseCount }}</span>
          <p class="text-[11px] text-go-text-muted mt-1">{{ paymentCount }} {{ paymentCount === 1 ? 'pago' : 'pagos' }} registrados</p>
        </div>
      </div>

      <!-- ==================== DETAILED SUMMARY ==================== -->
      <ExpenseSummary :expenses="allClientExpenses" :budget="project.budget" :categories="resolvedCategories" />
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { formatPrice, formatDate } from '~/utils';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();

const isLoading = ref(true);
const project = ref(null);

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

useHead({
  title: computed(() => project.value ? `Resumen · ${project.value.name}` : 'Resumen')
});

// --- Data slices ---

const allClientExpenses = computed(() =>
  expenseStore.expenses.filter(e => e.type !== 'provider_expense')
);

const onlyExpenses = computed(() =>
  allClientExpenses.value.filter(e => !e.type || e.type === 'expense')
);

const onlyPayments = computed(() =>
  allClientExpenses.value.filter(e => e.type === 'payment')
);

// --- Financial KPIs ---

const totalExpenses = computed(() =>
  onlyExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  onlyPayments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

const budgetSpentPercent = computed(() => {
  if (!project.value?.budget || project.value.budget <= 0) return 0;
  return (totalExpenses.value / project.value.budget) * 100;
});

const budgetCollectedPercent = computed(() => {
  if (!project.value?.budget || project.value.budget <= 0) return 0;
  return (totalPayments.value / project.value.budget) * 100;
});

// --- Timeline KPI ---

function toDate(raw) {
  if (!raw) return null;
  return raw.toDate ? raw.toDate() : new Date(raw);
}

const timelinePercent = computed(() => {
  const start = toDate(project.value?.startDate);
  const end = toDate(project.value?.estimatedEndDate);
  if (!start || !end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = Date.now() - start.getTime();
  return (elapsed / total) * 100;
});

const daysRemaining = computed(() => {
  const end = toDate(project.value?.estimatedEndDate);
  if (!end) return 0;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

// --- Weekly average KPI ---

const weeksElapsed = computed(() => {
  if (onlyExpenses.value.length === 0) return 0;
  const dates = onlyExpenses.value.map(e => {
    const raw = e.date || e.createdAt;
    if (!raw) return Date.now();
    return raw.toDate ? raw.toDate().getTime() : new Date(raw).getTime();
  });
  const earliest = Math.min(...dates);
  const diffMs = Date.now() - earliest;
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
});

const avgWeeklySpend = computed(() => {
  if (weeksElapsed.value === 0) return 0;
  return Math.round(totalExpenses.value / weeksElapsed.value);
});

// --- Counts ---

const expenseCount = computed(() => onlyExpenses.value.length);
const paymentCount = computed(() => onlyPayments.value.length);

// --- Circular progress ring ---

function ringStyle(percent, color) {
  const clamped = Math.max(0, Math.min(100, percent));
  const deg = (clamped / 100) * 360;
  return {
    background: `conic-gradient(${color} 0deg ${deg}deg, var(--go-surface-alt) ${deg}deg 360deg)`
  };
}

// --- Data loading ---

onMounted(async () => {
  const id = route.params.id;
  const user = await getCurrentUserAsync();

  if (!user) {
    isLoading.value = false;
    return;
  }

  const result = await projectStore.fetchProject(id);

  if (result && result.clientUserId === user.uid) {
    project.value = result;
    await Promise.all([
      expenseStore.fetchByProjectIdPublic(id),
      categoryStore.fetchForProjectFromAPI(id)
    ]);
  }

  isLoading.value = false;
});
</script>
