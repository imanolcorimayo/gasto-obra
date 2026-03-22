<template>
  <div class="mb-8">
    <AppLoader v-if="isLoading" />

    <div v-else-if="!project" class="text-center py-16">
      <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
      <NuxtLink to="/projects" class="text-go-primary text-sm mt-4 inline-block hover:underline">&larr; Volver a proyectos</NuxtLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink
        :to="`/projects/${route.params.id}`"
        class="text-go-text-muted text-sm hover:text-go-text inline-flex items-center gap-1 mb-4"
      >
        <MdiArrowLeft class="text-lg" />
        Volver al proyecto
      </NuxtLink>

      <h1 class="font-display font-bold text-2xl text-go-text mb-1">Resumen financiero</h1>
      <p class="text-sm text-go-text-muted mb-6">{{ project.name }}</p>

      <!-- ==================== 1. BUDGET CONSUMPTION TRACKER ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Presupuesto</h3>

        <template v-if="project.budget">
          <div class="flex items-end justify-between mb-2">
            <div>
              <span class="font-display font-bold text-2xl tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
              <span class="text-sm text-go-text-muted"> / {{ formatPrice(project.budget) }}</span>
            </div>
            <span
              class="text-sm font-semibold tabular-nums"
              :class="budgetSpentPercent > 100 ? 'text-go-danger' : budgetSpentPercent > 80 ? 'text-go-warning' : 'text-go-primary'"
            >{{ budgetSpentPercent.toFixed(0) }}%</span>
          </div>

          <!-- Budget bar -->
          <div class="w-full bg-go-surface-alt rounded-full h-3 mb-4">
            <div
              class="h-3 rounded-full transition-all duration-500"
              :class="budgetSpentPercent > 100 ? 'bg-go-danger' : budgetSpentPercent > 80 ? 'bg-go-warning' : 'bg-go-primary'"
              :style="{ width: Math.min(budgetSpentPercent, 100) + '%' }"
            ></div>
          </div>

          <!-- Projection -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-go-border">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Gastos</span>
              <span class="font-display font-bold text-lg tabular-nums text-go-text">{{ formatPrice(totalExpenses) }}</span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Ingresos</span>
              <span class="font-display font-bold text-lg tabular-nums text-go-secondary">{{ formatPrice(totalPayments) }}</span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Restante</span>
              <span
                class="font-display font-bold text-lg tabular-nums"
                :class="budgetRemaining >= 0 ? 'text-go-secondary' : 'text-go-danger'"
              >{{ formatPrice(Math.abs(budgetRemaining)) }}</span>
              <span class="text-xs text-go-text-muted block">{{ budgetRemaining >= 0 ? 'del presupuesto' : 'excedido del presupuesto' }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Gastos propios</span>
              <span class="font-display font-bold text-lg tabular-nums" :class="totalProviderExpenses > 0 ? 'text-go-text' : 'text-go-text-muted'">{{ formatPrice(totalProviderExpenses) }}</span>
              <button @click="showBalanceModal = true" class="text-xs px-2.5 py-1 mt-auto pt-1.5 rounded-go-sm bg-go-primary text-go-primary-on hover:opacity-90 transition-opacity cursor-pointer self-start">
                {{ balanceCalculated ? 'Recalcular' : 'Calcular' }}
              </button>
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center py-4">
          <CasquitoNeutral :size="180" />
          <p class="text-sm text-go-text-muted mt-3">Definí un presupuesto para ver proyecciones y seguimiento.</p>
          <NuxtLink :to="`/projects/${route.params.id}`" class="text-sm text-go-primary hover:underline mt-1 inline-block">Editar proyecto →</NuxtLink>
        </div>
      </section>

      <!-- ==================== 2. TU BALANCE ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-1">Tu balance en esta obra</h3>
        <p class="text-xs text-go-text-muted mb-4">De todo lo que el cliente te paga, solo cuenta como ingreso lo que no fue para cubrir compras de materiales. A eso sumale tus honorarios y restale lo que pusiste de tu bolsillo.</p>

        <template v-if="balanceCalculated">
          <div class="sm:flex sm:gap-4 mb-3">
            <!-- Result highlight — hero number first -->
            <div
              class="rounded-go-lg p-5 mb-4 sm:mb-0 sm:w-auto sm:flex-shrink-0"
              :class="netBalance >= 0
                ? 'bg-gradient-to-br from-go-secondary/10 to-go-secondary/5 border border-go-secondary/20'
                : 'bg-gradient-to-br from-go-danger/10 to-go-danger/5 border border-go-danger/20'"
            >
              <div class="flex items-center gap-4">
                <div>
                  <span class="text-xs font-semibold uppercase tracking-wider block mb-1" :class="netBalance >= 0 ? 'text-go-secondary' : 'text-go-danger'">
                    {{ netBalance >= 0 ? 'Te quedó en el bolsillo' : 'Estás poniendo de más' }}
                  </span>
                  <span
                    class="font-display font-bold text-3xl tabular-nums"
                    :class="netBalance >= 0 ? 'text-go-secondary' : 'text-go-danger'"
                  >{{ formatPrice(Math.abs(netBalance)) }}</span>
                </div>
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="netBalance >= 0 ? 'bg-go-secondary/15' : 'bg-go-danger/15'"
                >
                  <component
                    :is="netBalance >= 0 ? TrendingUpIcon : TrendingDownIcon"
                    class="text-xl"
                    :class="netBalance >= 0 ? 'text-go-secondary' : 'text-go-danger'"
                  />
                </div>
              </div>
            </div>

            <!-- Formula breakdown -->
            <div class="rounded-go-md bg-go-surface-alt/50 p-4 sm:flex-1 sm:flex sm:items-center">
              <div class="space-y-2.5 text-sm w-full">
                <div class="flex items-center justify-between">
                  <span class="text-go-text-muted">Cobros del cliente</span>
                  <span class="font-display font-semibold tabular-nums text-go-text">{{ formatPrice(totalPayments) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1 h-1 rounded-full bg-go-danger"></span>
                    <span class="text-go-text-muted">Compras/materiales</span>
                    <span class="text-[10px] text-go-text-muted/70 tabular-nums">({{ passThroughCount }})</span>
                  </div>
                  <span class="font-display font-medium tabular-nums text-go-danger">−{{ formatPrice(totalPassThrough) }}</span>
                </div>
                <div v-if="totalManagementFee > 0" class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1 h-1 rounded-full bg-go-secondary"></span>
                    <span class="text-go-text-muted">Honorarios de gestión</span>
                  </div>
                  <span class="font-display font-medium tabular-nums text-go-secondary">+{{ formatPrice(totalManagementFee) }}</span>
                </div>
                <div v-if="totalProviderExpenses > 0" class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1 h-1 rounded-full bg-go-danger"></span>
                    <span class="text-go-text-muted">Gastos propios</span>
                  </div>
                  <span class="font-display font-medium tabular-nums text-go-danger">−{{ formatPrice(totalProviderExpenses) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-go-text-muted">{{ passThroughCount }} gastos marcados como pass-through</span>
            <button @click="showBalanceModal = true" class="text-xs text-go-primary hover:underline cursor-pointer font-medium">
              Recalcular
            </button>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col items-center py-4">
            <CasquitoNeutral :size="120" />
            <p class="text-sm text-go-text-muted mt-3 text-center max-w-sm">
              Marcá qué gastos son "de paso" (materiales, compras) y calculamos cuánto te queda a vos de esta obra.
            </p>
            <button @click="showBalanceModal = true" class="btn-primary mt-4 cursor-pointer">
              Calculá tu balance
            </button>
          </div>
        </template>
      </section>

      <!-- Balance Calculator Modal -->
      <BalanceCalculatorModal
        :show="showBalanceModal"
        :expenses="clientExpenses"
        :categories="resolvedCategories"
        @close="showBalanceModal = false"
        @save="handleBalanceSave"
      />

      <!-- ==================== 3. SPENDING OVER TIME ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <h3 class="font-display font-semibold text-go-text">Gastos por semana</h3>
            <div v-if="totalProviderExpenses > 0" class="flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: #A35C0D"></span>
                <span class="text-go-text-muted">Cobrables</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: #8B847A"></span>
                <span class="text-go-text-muted">Propios</span>
              </div>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              v-for="mode in ['weekly', 'daily']"
              :key="mode"
              @click="timeChartMode = mode"
              class="text-xs px-2.5 py-1 rounded-go-sm transition-colors"
              :class="timeChartMode === mode
                ? 'bg-go-primary text-go-primary-on'
                : 'text-go-text-muted hover:text-go-text hover:bg-go-surface-alt'"
            >{{ mode === 'weekly' ? 'Semanal' : 'Diario' }}</button>
          </div>
        </div>
        <div class="h-64">
          <ClientOnly>
            <ChartsBarChart :data="spendingOverTimeData" :options="spendingChartOptions" />
          </ClientOnly>
        </div>
      </section>

      <!-- ==================== 3. PAYMENTS VS EXPENSES ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-go-text">Cobros vs Gastos</h3>
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-go-primary"></span>
              <span class="text-go-text-muted">Gastos</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-go-secondary"></span>
              <span class="text-go-text-muted">Cobros</span>
            </div>
            <div v-if="totalProviderExpenses > 0" class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: #8B847A"></span>
              <span class="text-go-text-muted">Propios</span>
            </div>
          </div>
        </div>
        <div class="h-64">
          <ClientOnly>
            <ChartsBarChart :data="paymentsVsExpensesData" :options="paymentsChartOptions" />
          </ClientOnly>
        </div>
        <!-- Running balance summary -->
        <div class="flex items-center justify-between pt-4 border-t border-go-border mt-4">
          <span class="text-sm text-go-text-muted">Balance acumulado</span>
          <span
            class="font-display font-bold text-lg tabular-nums"
            :class="balance >= 0 ? 'text-go-success' : 'text-go-danger'"
          >{{ formatPrice(balance) }}</span>
        </div>
      </section>

      <!-- ==================== 5. CATEGORY BREAKDOWN ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Gastos por categoría</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <!-- Doughnut chart -->
          <div class="flex items-center justify-center">
            <div class="w-56 h-56 relative">
              <ClientOnly>
                <ChartsDoughnutChart :data="categoryDoughnutData" />
              </ClientOnly>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="text-center">
                  <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ categoryBreakdown.length }}</span>
                  <span class="text-xs text-go-text-muted block">categorías</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Category list -->
          <div class="flex flex-col justify-center gap-2.5">
            <div
              v-for="cat in categoryBreakdown"
              :key="cat.name"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: cat.color }"
                  ></span>
                  <span class="text-sm text-go-text">{{ cat.label }}</span>
                  <span class="text-xs text-go-text-muted">({{ cat.count }})</span>
                </div>
                <div class="text-right">
                  <span class="text-sm tabular-nums font-medium text-go-text-secondary">{{ formatPrice(cat.total) }}</span>
                  <span class="text-xs text-go-text-muted ml-1">{{ cat.percent }}%</span>
                </div>
              </div>
              <!-- Proportion bar -->
              <div class="w-full bg-go-surface-alt rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full transition-all"
                  :style="{ width: cat.percent + '%', backgroundColor: cat.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Expandable detail per category -->
        <div class="mt-5 pt-5 border-t border-go-border space-y-2">
          <div
            v-for="cat in categoryBreakdown"
            :key="'detail-' + cat.name"
            class="border border-go-border rounded-go-md overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between px-4 py-3 hover:bg-go-surface-alt/50 transition-colors cursor-pointer"
              @click="toggleCategory(cat.name)"
            >
              <div class="flex items-center gap-2">
                <MdiChevronDown
                  class="text-base text-go-text-muted transition-transform"
                  :class="expandedCategories.has(cat.name) ? '' : '-rotate-90'"
                />
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: cat.color }"
                ></span>
                <span class="text-sm font-medium text-go-text">{{ cat.label }}</span>
                <span class="text-xs text-go-text-muted">({{ cat.count }})</span>
              </div>
              <span class="font-display font-bold text-sm tabular-nums text-go-text-secondary">{{ formatPrice(cat.total) }}</span>
            </button>
            <div v-show="expandedCategories.has(cat.name)" class="border-t border-go-border">
              <div
                v-for="expense in cat.expenses"
                :key="expense.id"
                class="flex items-center justify-between px-4 py-2 text-sm border-b border-go-border-subtle last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <span class="text-go-text truncate block">{{ expense.title }}</span>
                  <span class="text-xs text-go-text-muted tabular-nums">{{ formatExpenseDate(expense.date || expense.createdAt) }}</span>
                </div>
                <span class="font-display font-medium tabular-nums text-go-text-secondary ml-3">{{ formatPrice(expense.amount) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-go-border flex items-center justify-between text-sm text-go-text-muted">
            <span>{{ clientExpenseCount }} gastos cobrables en total</span>
            <span class="font-display font-bold tabular-nums text-go-primary">{{ formatPrice(totalExpenses) }}</span>
          </div>
        </div>
      </section>

      <!-- ==================== 8. DELIVERY OVERVIEW ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5 mb-6">
        <h3 class="font-display font-semibold text-go-text mb-4">Entregas</h3>

        <template v-if="deliveries.length > 0">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Entregas</span>
              <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ deliveries.length }}</span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Gastos asignados</span>
              <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ assignedExpenseCount }}</span>
              <span class="text-xs text-go-text-muted"> de {{ clientExpenseCount }}</span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Sin asignar</span>
              <span
                class="font-display font-bold text-xl tabular-nums"
                :class="unassignedExpenseCount > 0 ? 'text-go-warning' : 'text-go-success'"
              >{{ unassignedExpenseCount }}</span>
            </div>
          </div>

          <!-- Delivery list -->
          <div class="pt-4 border-t border-go-border space-y-2">
            <div
              v-for="d in deliverySummaries"
              :key="d.id"
              class="flex items-center justify-between text-sm px-3 py-2 rounded-go-md bg-go-surface-alt/50"
            >
              <div class="flex items-center gap-2">
                <span class="font-display font-semibold text-go-text">Entrega #{{ d.number }}</span>
                <span class="text-xs text-go-text-muted">{{ d.expenseCount }} gastos</span>
              </div>
              <span class="font-display font-medium tabular-nums text-go-text-secondary">{{ formatPrice(d.total) }}</span>
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center py-4">
          <CasquitoNeutral :size="180" />
          <p class="text-sm text-go-text-muted mt-3">Organizá los gastos en entregas para llevar un mejor control.</p>
          <NuxtLink :to="`/projects/${route.params.id}?tab=entregas`" class="text-sm text-go-primary hover:underline mt-1 inline-block">Crear entrega →</NuxtLink>
        </div>
      </section>

      <!-- ==================== SCOPE BREAKDOWN ==================== -->
      <section class="bg-go-surface border border-go-border rounded-go-xl p-5">
        <h3 class="font-display font-semibold text-go-text mb-4">Original vs Agregados</h3>

        <template v-if="hasAdditions">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="flex items-center justify-center">
              <div class="w-48 h-48 relative">
                <ClientOnly>
                  <ChartsDoughnutChart :data="scopeDoughnutData" />
                </ClientOnly>
              </div>
            </div>
            <div class="flex flex-col justify-center gap-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: '#5A8FB8' }"></span>
                  <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Original</span>
                </div>
                <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ formatPrice(totalOriginal) }}</span>
                <span class="text-xs text-go-text-muted ml-2">{{ originalCount }} gastos</span>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: '#D4793D' }"></span>
                  <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Agregados</span>
                </div>
                <span class="font-display font-bold text-xl tabular-nums text-go-text">{{ formatPrice(totalAddition) }}</span>
                <span class="text-xs text-go-text-muted ml-2">{{ additionCount }} gastos</span>
              </div>
              <div class="pt-3 border-t border-go-border">
                <span class="text-xs text-go-text-muted">Los agregados representan el </span>
                <span class="text-sm font-semibold tabular-nums" :style="{ color: '#D4793D' }">{{ additionPercent }}%</span>
                <span class="text-xs text-go-text-muted"> del gasto total</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center py-4">
          <CasquitoNeutral :size="180" />
          <p class="text-sm text-go-text-muted mt-3">Cuando cargues un gasto que está fuera del presupuesto original, marcalo como "Agregado" y acá vas a ver la comparación con lo pactado.</p>
          <NuxtLink :to="`/projects/${route.params.id}`" class="text-sm text-go-primary hover:underline mt-1 inline-block">Ir al proyecto →</NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiChevronDown from '~icons/mdi/chevron-down';
import TrendingUpIcon from '~icons/mdi/trending-up';
import TrendingDownIcon from '~icons/mdi/trending-down';
import { useProjectStore } from '~/stores/project';
import { useExpenseStore } from '~/stores/expense';
import { useCategoryStore } from '~/stores/category';
import { useDeliveryStore } from '~/stores/delivery';
import { useProviderStore } from '~/stores/provider';
import { formatPrice, getCategoryLabel, getCategoryColor, getManagementFeeAmount } from '~/utils';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const projectStore = useProjectStore();
const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();
const deliveryStore = useDeliveryStore();
const providerStore = useProviderStore();

const isLoading = ref(true);
const project = ref(null);
const timeChartMode = ref('weekly');
const expandedCategories = ref(new Set());
const showBalanceModal = ref(false);

const resolvedCategories = computed(() => categoryStore.getResolved(route.params.id));

useHead({
  title: computed(() => project.value ? `Resumen · ${project.value.name}` : 'Resumen')
});

// --- Data slices ---

const allExpenses = computed(() => expenseStore.expenses);

const clientExpenses = computed(() =>
  allExpenses.value.filter(e => !e.type || e.type === 'expense')
);

const payments = computed(() =>
  allExpenses.value.filter(e => e.type === 'payment')
);

const providerExpenses = computed(() =>
  allExpenses.value.filter(e => e.type === 'provider_expense')
);

const deliveries = computed(() => deliveryStore.deliveries);

// --- Financial KPIs ---

const totalExpenses = computed(() =>
  clientExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalPayments = computed(() =>
  payments.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalProviderExpenses = computed(() =>
  providerExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const balance = computed(() => totalPayments.value - totalExpenses.value);

const budgetSpentPercent = computed(() => {
  if (!project.value?.budget || project.value.budget <= 0) return 0;
  return (totalExpenses.value / project.value.budget) * 100;
});

const budgetRemaining = computed(() => {
  if (!project.value?.budget) return 0;
  return project.value.budget - totalExpenses.value;
});

// --- Scope breakdown ---

const originalExpenses = computed(() =>
  clientExpenses.value.filter(e => !e.scopeType || e.scopeType === 'original')
);

const additionExpenses = computed(() =>
  clientExpenses.value.filter(e => e.scopeType === 'addition')
);

const totalOriginal = computed(() =>
  originalExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const totalAddition = computed(() =>
  additionExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const originalCount = computed(() => originalExpenses.value.length);
const additionCount = computed(() => additionExpenses.value.length);
const hasAdditions = computed(() => totalAddition.value > 0);

const additionPercent = computed(() => {
  if (totalExpenses.value === 0) return 0;
  return Math.round((totalAddition.value / totalExpenses.value) * 100);
});

// --- Provider expenses ---

const providerExpenseCount = computed(() => providerExpenses.value.length);

const providerExpensePercent = computed(() => {
  const grandTotal = totalExpenses.value + totalProviderExpenses.value;
  if (grandTotal === 0) return 0;
  return Math.round((totalProviderExpenses.value / grandTotal) * 100);
});

const providerCategoryBreakdown = computed(() => {
  const grouped = {};
  for (const e of providerExpenses.value) {
    const cat = e.category || 'otros';
    if (!grouped[cat]) grouped[cat] = { total: 0, count: 0 };
    grouped[cat].total += e.amount || 0;
    grouped[cat].count++;
  }
  return Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      label: getCategoryLabel(name, resolvedCategories.value),
      color: getCategoryColor(name, resolvedCategories.value),
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
});

// --- Management fee ---

const totalManagementFee = computed(() =>
  clientExpenses.value
    .filter(e => e.managementFeePercent)
    .reduce((sum, e) => sum + getManagementFeeAmount(e), 0)
);

const managementFeePercent = computed(() => {
  if (totalExpenses.value === 0) return 0;
  return Math.round((totalManagementFee.value / totalExpenses.value) * 100);
});

// --- Balance calculation ---

const balanceCalculated = computed(() =>
  clientExpenses.value.some(e => e.passThrough === true || e.passThrough === false)
);

const passThroughExpenses = computed(() =>
  clientExpenses.value.filter(e => e.passThrough === true)
);

const passThroughCount = computed(() => passThroughExpenses.value.length);

const totalPassThrough = computed(() =>
  passThroughExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
);

const netIncome = computed(() =>
  totalPayments.value - totalPassThrough.value + totalManagementFee.value
);

const netBalance = computed(() =>
  netIncome.value - totalProviderExpenses.value
);

async function handleBalanceSave(selectedIds) {
  const assignments = clientExpenses.value.map(e => ({
    expenseId: e.id,
    passThrough: selectedIds.includes(e.id)
  }));

  const result = await expenseStore.batchUpdatePassThrough(assignments);
  showBalanceModal.value = false;

  if (!result.success) {
    console.error('Error saving pass-through:', result.error);
  }
}

// --- Weekly average & projection ---

function toDate(raw) {
  if (!raw) return null;
  return raw.toDate ? raw.toDate() : new Date(raw);
}

function getExpenseDate(e) {
  const raw = e.date || e.createdAt;
  if (!raw) return new Date(0);
  return raw.toDate ? raw.toDate() : new Date(raw);
}

// --- Counts ---

const clientExpenseCount = computed(() => clientExpenses.value.length);

// --- Delivery stats ---

const assignedExpenseCount = computed(() =>
  clientExpenses.value.filter(e => e.deliveryId).length
);

const unassignedExpenseCount = computed(() =>
  clientExpenses.value.filter(e => !e.deliveryId).length
);

const deliverySummaries = computed(() =>
  deliveries.value.map(d => {
    const dExpenses = clientExpenses.value.filter(e => e.deliveryId === d.id);
    return {
      id: d.id,
      number: d.number,
      expenseCount: dExpenses.length,
      total: dExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }).sort((a, b) => a.number - b.number)
);

// --- Time-based grouping helpers ---

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(date) {
  return getWeekStart(date).toISOString().slice(0, 10);
}

function formatWeekLabel(weekStartStr) {
  const start = new Date(weekStartStr + 'T00:00:00');
  return start.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatDayLabel(dayStr) {
  const d = new Date(dayStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// --- Spending over time chart ---

const spendingTimeSeries = computed(() => {
  const allItems = [...clientExpenses.value, ...providerExpenses.value];
  if (allItems.length === 0) return { labels: [], expenses: [], propios: [] };

  const isWeekly = timeChartMode.value === 'weekly';
  const expenseGrouped = {};
  const propioGrouped = {};

  for (const e of allItems) {
    const d = getExpenseDate(e);
    const key = isWeekly ? getWeekKey(d) : getDayKey(d);
    if (e.type === 'provider_expense') {
      propioGrouped[key] = (propioGrouped[key] || 0) + (e.amount || 0);
    } else {
      expenseGrouped[key] = (expenseGrouped[key] || 0) + (e.amount || 0);
    }
  }

  const allKeys = [...new Set([...Object.keys(expenseGrouped), ...Object.keys(propioGrouped)])].sort();
  return {
    labels: allKeys.map(k => isWeekly ? formatWeekLabel(k) : formatDayLabel(k)),
    expenses: allKeys.map(k => expenseGrouped[k] || 0),
    propios: allKeys.map(k => propioGrouped[k] || 0)
  };
});

const spendingOverTimeData = computed(() => {
  const datasets = [{
    label: 'Gastos',
    data: spendingTimeSeries.value.expenses,
    backgroundColor: '#A35C0D33',
    borderColor: '#A35C0D',
    borderWidth: 2,
    borderRadius: 4,
    barPercentage: 0.7
  }];
  // Only show propios dataset if there are any
  if (spendingTimeSeries.value.propios?.some(v => v > 0)) {
    datasets.push({
      label: 'Gastos propios',
      data: spendingTimeSeries.value.propios,
      backgroundColor: '#8B847A33',
      borderColor: '#8B847A',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    });
  }
  return {
    labels: spendingTimeSeries.value.labels,
    datasets
  };
});

const spendingChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatPrice(ctx.raw)}`
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (v) => formatPrice(v)
      }
    }
  }
};

// --- Payments vs Expenses chart ---

const paymentsVsExpensesTimeSeries = computed(() => {
  if (allExpenses.value.length === 0) return { labels: [], expenses: [], payments: [], propios: [] };

  const expenseGrouped = {};
  const paymentGrouped = {};
  const propioGrouped = {};

  for (const e of allExpenses.value) {
    const d = getExpenseDate(e);
    const key = getWeekKey(d);
    if (e.type === 'payment') {
      paymentGrouped[key] = (paymentGrouped[key] || 0) + (e.amount || 0);
    } else if (e.type === 'provider_expense') {
      propioGrouped[key] = (propioGrouped[key] || 0) + (e.amount || 0);
    } else {
      expenseGrouped[key] = (expenseGrouped[key] || 0) + (e.amount || 0);
    }
  }

  const allKeys = [...new Set([...Object.keys(expenseGrouped), ...Object.keys(paymentGrouped), ...Object.keys(propioGrouped)])].sort();

  return {
    labels: allKeys.map(k => formatWeekLabel(k)),
    expenses: allKeys.map(k => expenseGrouped[k] || 0),
    payments: allKeys.map(k => paymentGrouped[k] || 0),
    propios: allKeys.map(k => propioGrouped[k] || 0)
  };
});

const paymentsVsExpensesData = computed(() => {
  const datasets = [
    {
      label: 'Gastos',
      data: paymentsVsExpensesTimeSeries.value.expenses,
      backgroundColor: '#A35C0D33',
      borderColor: '#A35C0D',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    },
    {
      label: 'Cobros',
      data: paymentsVsExpensesTimeSeries.value.payments,
      backgroundColor: '#3D6B4533',
      borderColor: '#3D6B45',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    }
  ];
  if (paymentsVsExpensesTimeSeries.value.propios?.some(v => v > 0)) {
    datasets.push({
      label: 'Gastos propios',
      data: paymentsVsExpensesTimeSeries.value.propios,
      backgroundColor: '#8B847A33',
      borderColor: '#8B847A',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7
    });
  }
  return {
    labels: paymentsVsExpensesTimeSeries.value.labels,
    datasets
  };
});

const paymentsChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatPrice(ctx.raw)}`
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: (v) => formatPrice(v)
      }
    }
  }
};

// --- Category breakdown (client expenses only) ---

const categoryBreakdown = computed(() => {
  const grouped = {};
  for (const e of clientExpenses.value) {
    const cat = e.category || 'otros';
    if (!grouped[cat]) {
      grouped[cat] = { total: 0, count: 0, expenses: [] };
    }
    grouped[cat].total += e.amount || 0;
    grouped[cat].count++;
    grouped[cat].expenses.push(e);
  }

  return Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      label: getCategoryLabel(name, resolvedCategories.value),
      color: getCategoryColor(name, resolvedCategories.value),
      total: data.total,
      count: data.count,
      percent: totalExpenses.value > 0 ? Math.round((data.total / totalExpenses.value) * 100) : 0,
      expenses: [...data.expenses].sort((a, b) => getExpenseDate(b) - getExpenseDate(a))
    }))
    .sort((a, b) => b.total - a.total);
});

const categoryDoughnutData = computed(() => ({
  labels: categoryBreakdown.value.map(c => c.label),
  datasets: [{
    data: categoryBreakdown.value.map(c => c.total),
    backgroundColor: categoryBreakdown.value.map(c => c.color),
    borderWidth: 0,
    hoverOffset: 6
  }]
}));

// --- Scope doughnut ---

const scopeDoughnutData = computed(() => ({
  labels: ['Original', 'Agregados'],
  datasets: [{
    data: [totalOriginal.value, totalAddition.value],
    backgroundColor: ['#5A8FB8', '#D4793D'],
    borderWidth: 0,
    hoverOffset: 6
  }]
}));

// --- Expandable category table ---

function toggleCategory(name) {
  const next = new Set(expandedCategories.value);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  expandedCategories.value = next;
}

function formatExpenseDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  if (result) {
    project.value = result;
    await Promise.all([
      expenseStore.fetchByProjectId(id),
      categoryStore.fetchGlobal(),
      categoryStore.fetchForProject(id),
      deliveryStore.fetchByProjectId(id),
      providerStore.fetchOrCreate()
    ]);
  }

  isLoading.value = false;
});
</script>
