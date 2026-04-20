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
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Título</label>
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
              <template v-else-if="form.installmentPercent >= 100">Pagado — se genera un cobro automático por {{ formatPrice(totalWithFee) }}</template>
              <template v-else-if="form.amount">
                <span class="tabular-nums">Parcial — se genera un cobro automático de {{ formatPrice(editInstallmentAmount) }}</span>
              </template>
            </p>
          </div>

          <!-- Management fee toggle (expense only, when provider has fee > 0 or expense already has fee) -->
          <div v-if="form.type === 'expense' && (managementFeePercent > 0 || form.existingFeePercent > 0)">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.applyManagementFee"
                class="w-4 h-4 rounded border-go-border text-go-primary focus:ring-go-primary/40"
              />
              <span class="text-sm text-go-text">Aplicar gestión ({{ activeFeePercent || managementFeePercent }}%)</span>
            </label>
            <p v-if="form.applyManagementFee && form.amount" class="text-xs text-go-text-muted mt-1 tabular-nums ml-6">
              {{ formatPrice(parseFloat(form.amount)) }} + {{ activeFeePercent }}% gestión = {{ formatPrice(totalWithFee) }}
            </p>
          </div>

          <!-- Category (hidden for payments) -->
          <div v-if="form.type !== 'payment'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Categoría</label>
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

          <!-- Vendor -->
          <div v-if="form.type !== 'payment'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Comercio</label>
            <VendorCombobox v-model="form.vendor" :vendors="vendorStore.vendors" />
          </div>

          <!-- Item assignment (expense only) -->
          <div v-if="form.type === 'expense' && items.length > 0">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Item de la obra</label>
            <div class="relative">
              <select
                v-model="form.itemId"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
              >
                <option :value="null">Sin asignar</option>
                <option v-for="i in items" :key="i.id" :value="i.id">{{ i.name }}</option>
              </select>
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Descripción</label>
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
          <button
            type="button"
            @click="handleDelete"
            :disabled="isDeleting || isSaving"
            class="text-go-danger hover:bg-go-danger/10 border border-go-danger/30 rounded-go-md px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 order-3 sm:order-1 disabled:opacity-50"
          >
            <span v-if="isDeleting" class="btn-spinner"></span>
            <MdiDeleteOutline v-else class="text-base" />
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
          <div class="flex-1 flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            <button type="button" @click="$emit('close')" class="btn-secondary sm:ml-auto">
              Cancelar
            </button>
            <button type="submit" :disabled="isSaving || isDeleting" class="btn-primary flex items-center justify-center gap-2">
              <span v-if="isSaving" class="btn-spinner"></span>
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import MdiDeleteOutline from '~icons/mdi/delete-outline';
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS, SCOPE_TYPES, getScopeTypeStyles, formatPrice } from '~/utils';
import { useRecipientStore } from '~/stores/recipient';
import { useVendorStore } from '~/stores/vendor';

const recipientStore = useRecipientStore();
const vendorStore = useVendorStore();

const props = defineProps({
  show: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  projects: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  isSaving: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false },
  managementFeePercent: { type: Number, default: 0 }
});

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

const emit = defineEmits(['close', 'save', 'delete']);

const showItems = ref(false);
const selectedRecipientIdx = ref(-1);
const showMoveProject = ref(false);

const isPartial = computed(() => form.installmentPercent > 0 && form.installmentPercent < 100);

const activeFeePercent = computed(() => {
  if (!form.applyManagementFee) return 0;
  return form.existingFeePercent ?? props.managementFeePercent;
});

const totalWithFee = computed(() => {
  const base = parseFloat(form.amount) || 0;
  if (activeFeePercent.value > 0) {
    return Math.round(base * (1 + activeFeePercent.value / 100));
  }
  return base;
});

const editInstallmentAmount = computed(() => {
  return Math.round(totalWithFee.value * form.installmentPercent / 100);
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
  itemId: null,
  projectId: '',
  installmentPercent: 100,
  installmentGroupId: null,
  vendor: '',
  applyManagementFee: false,
  existingFeePercent: null
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
    form.itemId = expense.itemId || null;
    form.projectId = expense.projectId || '';
    form.installmentPercent = percent;
    form.installmentGroupId = expense.installmentGroupId || null;
    form.vendor = expense.vendor || '';
    form.applyManagementFee = expense.managementFeePercent != null && expense.managementFeePercent > 0;
    form.existingFeePercent = expense.managementFeePercent ?? null;
    // If expense has fee, show base amount (without fee) in the amount field
    if (expense.amountBase != null && expense.managementFeePercent > 0) {
      form.amount = expense.amountBase;
    }
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

function handleSave() {
  const percent = form.type === 'expense' ? form.installmentPercent : null;
  const hasFee = form.applyManagementFee && activeFeePercent.value > 0 && form.type === 'expense';
  const baseAmount = parseFloat(form.amount) || 0;
  const amountWithFee = hasFee ? Math.round(baseAmount * (1 + activeFeePercent.value / 100)) : baseAmount;
  const partialCalc = percent !== null && percent > 0 && percent < 100;
  const needsGroup = partialCalc;

  const originalPercent = props.expense?.installmentPercent;
  const shouldCreatePayment = form.type === 'expense'
    && originalPercent === 0
    && percent > 0
    && !props.expense?.linkedPaymentId;

  const shouldDeletePayment = form.type === 'expense'
    && originalPercent > 0
    && percent === 0
    && !!props.expense?.linkedPaymentId;

  const data = {
    title: form.title,
    amount: partialCalc ? Math.round(amountWithFee * percent / 100) : amountWithFee,
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
    itemId: form.type === 'expense' ? (form.itemId || null) : null,
    projectId: form.projectId,
    installmentPercent: percent,
    installmentGroupId: needsGroup ? (form.installmentGroupId || crypto.randomUUID()) : null,
    vendor: form.vendor || null,
    amountBase: hasFee ? baseAmount : null,
    managementFeePercent: hasFee ? activeFeePercent.value : null
  };
  emit('save', {
    id: props.expense.id,
    data,
    createLinkedPayment: shouldCreatePayment,
    deleteLinkedPaymentId: shouldDeletePayment ? props.expense.linkedPaymentId : null
  });
}

function handleDelete() {
  const label = form.type === 'payment' ? 'este cobro' : form.type === 'provider_expense' ? 'este gasto propio' : 'este gasto';
  if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
  emit('delete', props.expense);
}
</script>
