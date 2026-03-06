<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h3 class="font-display font-semibold text-base text-go-text">Editar registro</h3>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <!-- Body + Footer inside form for submit -->
      <form @submit.prevent="handleSave">
        <div class="modal-body space-y-4">
          <!-- Type selector — segmented control -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Tipo</label>
            <div class="flex bg-go-bg border border-go-border rounded-go-md p-0.5 gap-0.5">
              <button
                v-for="t in typeOptions"
                :key="t.value"
                type="button"
                @click="form.type = t.value"
                class="flex-1 text-xs font-medium py-1.5 px-2 rounded-[5px] transition-colors"
                :class="form.type === t.value
                  ? 'bg-go-surface text-go-text shadow-sm'
                  : 'text-go-text-muted hover:text-go-text'"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Scope type (expense only) -->
          <div v-if="form.type === 'expense'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-0.5">Alcance</label>
            <p class="text-[11px] text-go-text-muted mb-1.5">¿Es parte de la obra original o un trabajo adicional?</p>
            <div class="flex gap-2">
              <button
                v-for="s in SCOPE_TYPES"
                :key="s.value"
                type="button"
                @click="form.scopeType = s.value"
                class="text-xs font-medium px-2.5 py-1 rounded-go-sm border transition-colors"
                :class="form.scopeType === s.value
                  ? 'border-current bg-opacity-10'
                  : 'border-go-border text-go-text-muted hover:border-go-text-muted'"
                :style="form.scopeType === s.value ? getScopeTypeStyles(s.value) : {}"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Titulo</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>

          <!-- Amount + Installment percent -->
          <div>
            <div :class="form.type === 'expense' ? 'flex flex-col sm:flex-row sm:items-end gap-3' : ''">
              <div class="sm:flex-1">
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">
                  {{ isPartial ? 'Monto total' : 'Monto' }}
                </label>
                <div class="flex">
                  <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
                  <input
                    v-model="form.amount"
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  />
                </div>
              </div>
              <div v-if="form.type === 'expense'">
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5 whitespace-nowrap">Pagado por cliente</label>
                <div class="flex">
                  <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-lg font-display font-semibold text-go-text-muted">%</span>
                  <input
                    v-model.number="form.installmentPercent"
                    type="number"
                    min="0"
                    max="100"
                    @blur="form.installmentPercent = form.installmentPercent || 0"
                    class="flex-1 sm:w-16 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold text-go-text tabular-nums focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  />
                </div>
              </div>
            </div>
            <p v-if="form.type === 'expense'" class="text-xs mt-1.5 font-medium"
              :class="form.installmentPercent >= 100 ? 'text-go-success' : 'text-go-info'"
            >
              <template v-if="!form.installmentPercent">Sin pago directo — se descuenta del saldo del cliente</template>
              <template v-else-if="form.installmentPercent >= 100">Pagado — se genera un cobro automático por {{ form.amount ? formatPrice(parseFloat(form.amount)) : 'el monto' }}</template>
              <template v-else-if="form.amount">
                <span class="tabular-nums">Parcial — se genera un cobro automático de {{ formatPrice(editInstallmentAmount) }}</span>
              </template>
            </p>
          </div>

          <!-- Category (hidden for payments) -->
          <div v-if="form.type !== 'payment'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Categoria</label>
            <div class="relative">
              <select
                v-model="form.category"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
              >
                <option v-for="cat in resolvedCategories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Descripcion</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Opcional"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
            />
          </div>

          <hr class="border-go-border-subtle" />

          <!-- Payment Method -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Medio de pago</label>
            <div class="relative">
              <select
                v-model="form.paymentMethod"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
              >
                <option :value="null">Sin especificar</option>
                <option v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Recipient -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Destinatario</label>
            <template v-if="recipientStore.recipients.length > 0">
              <div class="relative">
                <select
                  v-model="selectedRecipientIdx"
                  class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
                >
                  <option :value="-1">Sin destinatario</option>
                  <option v-for="(r, idx) in recipientStore.recipients" :key="idx" :value="idx">
                    {{ r.name }}{{ r.platform ? ` (${r.platform})` : '' }}
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <p v-if="selectedRecipientIdx >= 0 && recipientStore.recipients[selectedRecipientIdx]" class="text-xs text-go-text-muted mt-1">
                {{ recipientStore.recipients[selectedRecipientIdx].bankInfo }}
                <template v-if="recipientStore.recipients[selectedRecipientIdx].cuit">
                  · CUIT: {{ recipientStore.recipients[selectedRecipientIdx].cuit }}
                </template>
              </p>
            </template>
            <p v-else class="text-sm text-go-text-muted">
              No hay destinatarios configurados.
              <NuxtLink to="/settings/recipients" class="text-go-primary hover:text-go-primary/80">Configurar destinatarios</NuxtLink>
            </p>
          </div>

          <!-- Items (collapsible) -->
          <div>
            <button
              type="button"
              @click="showItems = !showItems"
              class="text-sm text-go-text-tertiary hover:text-go-text flex items-center gap-1"
            >
              <MdiChevronDown class="transition-transform" :class="{ 'rotate-180': showItems }" />
              Items ({{ form.items.length }})
            </button>

            <div v-if="showItems" class="mt-2">
              <div
                v-for="(item, idx) in form.items"
                :key="idx"
                class="flex items-center gap-2 py-2"
                :class="{ 'border-b border-go-border-subtle': idx < form.items.length - 1 }"
              >
                <input
                  v-model="item.name"
                  type="text"
                  placeholder="Nombre"
                  class="flex-1 bg-go-bg border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                />
                <input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="Monto"
                  min="0"
                  step="0.01"
                  class="w-28 bg-go-bg border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                />
                <button type="button" @click="removeItem(idx)" class="text-go-text-muted hover:text-go-danger transition-colors p-1">
                  <MdiClose class="text-base" />
                </button>
              </div>
              <button
                type="button"
                @click="addItem"
                class="btn-secondary text-xs w-full flex items-center justify-center gap-1 mt-2"
              >
                <MdiPlus class="text-base" />
                Agregar item
              </button>
            </div>
          </div>

          <!-- Move to another project (collapsed) -->
          <div>
            <button
              type="button"
              @click="showMoveProject = !showMoveProject"
              class="text-sm text-go-text-tertiary hover:text-go-text flex items-center gap-1"
            >
              <MdiChevronDown class="transition-transform" :class="{ 'rotate-180': showMoveProject }" />
              Mover a otro proyecto
            </button>

            <div v-if="showMoveProject" class="mt-2">
              <div class="relative">
                <select
                  v-model="form.projectId"
                  class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
                >
                  <option v-for="p in projects" :key="p.id" :value="p.id">
                    {{ p.name }} (#{{ p.tag }})
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">
            Cancelar
          </button>
          <button type="submit" :disabled="isSaving" class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2">
            <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS, SCOPE_TYPES, getScopeTypeStyles, formatPrice } from '~/utils';
import { useRecipientStore } from '~/stores/recipient';

const recipientStore = useRecipientStore();

const props = defineProps({
  show: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  projects: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

const emit = defineEmits(['close', 'save']);

const showItems = ref(false);
const selectedRecipientIdx = ref(-1);
const showMoveProject = ref(false);
const isSaving = ref(false);

const isPartial = computed(() => form.installmentPercent > 0 && form.installmentPercent < 100);

const editInstallmentAmount = computed(() => {
  const total = parseFloat(form.amount) || 0;
  return Math.round(total * form.installmentPercent / 100);
});

const typeOptions = [
  { value: 'expense', label: 'Gasto' },
  { value: 'payment', label: 'Cobro' },
  { value: 'provider_expense', label: 'Gasto propio' }
];

const form = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  description: '',
  type: 'expense',
  scopeType: 'original',
  paymentMethod: null,
  recipientName: '',
  recipientBankInfo: '',
  recipientPlatform: '',
  recipientCuit: '',
  items: [],
  projectId: '',
  installmentPercent: 100,
  installmentGroupId: null
});

// Lock background scroll
watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
});

watch(() => props.expense, (expense) => {
  if (expense) {
    form.title = expense.title || '';
    const percent = expense.installmentPercent ?? 100;
    const hasPartial = percent > 0 && percent < 100;
    form.amount = hasPartial
      ? Math.round((expense.amount || 0) / (percent / 100))
      : (expense.amount || '');
    form.category = expense.category || 'materiales';
    form.description = expense.description || '';
    form.type = expense.type || 'expense';
    form.scopeType = expense.scopeType || 'original';
    form.paymentMethod = expense.paymentMethod || null;
    form.recipientName = expense.recipientName || '';
    form.recipientBankInfo = expense.recipientBankInfo || '';
    form.recipientPlatform = expense.recipientPlatform || '';
    form.recipientCuit = expense.recipientCuit || '';
    form.items = expense.items ? expense.items.map(i => ({ ...i })) : [];
    form.projectId = expense.projectId || '';
    form.installmentPercent = percent;
    form.installmentGroupId = expense.installmentGroupId || null;
    showItems.value = form.items.length > 0;
    showMoveProject.value = false;

    // Pre-select matching recipient
    if (expense.recipientName) {
      const idx = recipientStore.recipients.findIndex(r => r.name === expense.recipientName);
      selectedRecipientIdx.value = idx >= 0 ? idx : -1;
    } else {
      selectedRecipientIdx.value = -1;
    }
  }
}, { immediate: true });

watch(selectedRecipientIdx, (idx) => {
  if (idx >= 0) {
    const r = recipientStore.recipients[idx];
    if (r) {
      form.recipientName = r.name || '';
      form.recipientBankInfo = r.bankInfo || '';
      form.recipientPlatform = r.platform || '';
      form.recipientCuit = r.cuit || '';
      return;
    }
  }
  form.recipientName = '';
  form.recipientBankInfo = '';
  form.recipientPlatform = '';
  form.recipientCuit = '';
});

function addItem() {
  form.items.push({ name: '', amount: 0 });
}

function removeItem(idx) {
  form.items.splice(idx, 1);
}

// Auto-calculate amount from items when items change
watch(() => form.items, (items) => {
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (total > 0) {
      form.amount = total;
    }
  }
}, { deep: true });

async function handleSave() {
  isSaving.value = true;
  try {
    const percent = form.type === 'expense' ? form.installmentPercent : null;
    const partialCalc = percent !== null && percent > 0 && percent < 100;
    const needsGroup = partialCalc;

    const data = {
      title: form.title,
      amount: partialCalc ? editInstallmentAmount.value : parseFloat(form.amount),
      category: form.type === 'payment' ? 'pago' : form.category,
      description: form.description,
      type: form.type,
      scopeType: form.type === 'expense' ? form.scopeType : 'original',
      paymentMethod: form.paymentMethod,
      recipientName: form.recipientName || null,
      recipientBankInfo: form.recipientBankInfo || null,
      recipientPlatform: form.recipientPlatform || null,
      recipientCuit: form.recipientCuit || null,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null,
      projectId: form.projectId,
      installmentPercent: percent,
      installmentGroupId: needsGroup ? (form.installmentGroupId || crypto.randomUUID()) : null
    };
    emit('save', { id: props.expense.id, data });
  } finally {
    isSaving.value = false;
  }
}
</script>
