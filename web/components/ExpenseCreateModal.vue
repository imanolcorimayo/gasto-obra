<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">{{ modalTitle }}</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ modalDescription }}</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <!-- Body + Footer inside form for submit -->
      <form @submit.prevent="handleSubmit">
        <div class="modal-body space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">
              {{ type === 'payment' ? 'Concepto' : 'Titulo' }}
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              :disabled="isLocked"
              :placeholder="type === 'payment' ? 'Concepto del pago' : 'Titulo del gasto'"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <!-- Amount + Installment percent -->
          <div>
            <div :class="type === 'expense' ? 'flex flex-col sm:flex-row sm:items-end gap-3' : ''">
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
                    :disabled="isLocked"
                    placeholder="0.00"
                    class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div v-if="type === 'expense'">
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5 whitespace-nowrap">
                  Pagado por cliente
                  <span v-if="installmentMaxPercent < 100" class="font-normal normal-case">(máx. {{ installmentMaxPercent }}%)</span>
                </label>
                <div class="flex">
                  <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-lg font-display font-semibold text-go-text-muted">%</span>
                  <input
                    v-model.number="form.installmentPercent"
                    type="number"
                    min="0"
                    :max="installmentMaxPercent"
                    @blur="form.installmentPercent = form.installmentPercent || 0"
                    class="flex-1 sm:w-16 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold text-go-text tabular-nums focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  />
                </div>
              </div>
            </div>
            <p v-if="type === 'expense'" class="text-xs mt-1.5 font-medium"
              :class="form.installmentPercent >= 100 ? 'text-go-success' : 'text-go-info'"
            >
              <template v-if="!form.installmentPercent">Sin pago directo — se descuenta del saldo del cliente</template>
              <template v-else-if="form.installmentPercent >= 100">Pagado — se genera un cobro automático por {{ form.amount ? formatPrice(parseFloat(form.amount)) : 'el monto' }}</template>
              <template v-else-if="form.amount">
                <span class="tabular-nums">Parcial — se genera un cobro automático de {{ formatPrice(installmentAmount) }}</span>
              </template>
            </p>
          </div>

          <!-- Scope type (expense only) -->
          <div v-if="type === 'expense'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-0.5">Alcance</label>
            <p class="text-[11px] text-go-text-muted mb-1.5">¿Es parte de la obra original o un trabajo adicional?</p>
            <div class="flex gap-2">
              <button
                v-for="s in SCOPE_TYPES"
                :key="s.value"
                type="button"
                @click="!isLocked && (form.scopeType = s.value)"
                :disabled="isLocked"
                class="text-xs font-medium px-2.5 py-1 rounded-go-sm border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                :class="form.scopeType === s.value
                  ? 'border-current bg-opacity-10'
                  : 'border-go-border text-go-text-muted hover:border-go-text-muted'"
                :style="form.scopeType === s.value ? getScopeTypeStyles(s.value) : {}"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- Delivery (expense only) -->
          <div v-if="type === 'expense' && deliveries.length > 0">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Entrega</label>
            <div class="relative">
              <select
                v-model="form.deliveryId"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
              >
                <option :value="null">Sin entrega</option>
                <option v-for="d in deliveries" :key="d.id" :value="d.id">
                  {{ d.number }}° Entrega{{ d.description ? ` — ${d.description}` : '' }}
                </option>
              </select>
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Category (expense + provider_expense only) -->
          <div v-if="type !== 'payment'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Categoria</label>
            <div class="relative">
              <select
                v-model="form.category"
                :disabled="isLocked"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option v-for="cat in resolvedCategories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
              <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-go-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Description (expense + provider_expense only) -->
          <div v-if="type !== 'payment'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Descripcion</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Opcional"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
            />
          </div>

          <hr class="border-go-border-subtle" />

          <!-- Payment method (expense + payment only, not provider_expense) -->
          <div v-if="type !== 'provider_expense'">
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

          <!-- Recipient (expense + payment only) -->
          <div v-if="type !== 'provider_expense'">
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

          <!-- Items (expense + provider_expense only) -->
          <div v-if="type !== 'payment'">
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
                  :disabled="isLocked"
                  class="flex-1 bg-go-bg border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="Monto"
                  min="0"
                  step="0.01"
                  :disabled="isLocked"
                  class="w-28 bg-go-bg border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button v-if="!isLocked" type="button" @click="form.items.splice(idx, 1)" class="text-go-text-muted hover:text-go-danger transition-colors p-1">
                  <MdiClose class="text-base" />
                </button>
              </div>
              <button
                v-if="!isLocked"
                type="button"
                @click="form.items.push({ name: '', amount: 0 })"
                class="btn-secondary text-xs w-full flex items-center justify-center gap-1 mt-2"
              >
                <MdiPlus class="text-base" />
                Agregar item
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">
            Cancelar
          </button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2">
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ submitLabel }}
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

const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'expense' },
  categories: { type: Array, default: () => [] },
  deliveries: { type: Array, default: () => [] },
  prefill: { type: Object, default: null }
});

const recipientStore = useRecipientStore();

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

const emit = defineEmits(['close', 'submit']);

const isLocked = computed(() => !!props.prefill?.locked);
const installmentMaxPercent = computed(() => props.prefill?.installmentMaxPercent || 100);

const isSubmitting = ref(false);
const showItems = ref(false);
const selectedRecipientIdx = ref(-1);

const form = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  scopeType: 'original',
  description: '',
  paymentMethod: null,
  recipientName: '',
  recipientBankInfo: '',
  recipientPlatform: '',
  recipientCuit: '',
  deliveryId: null,
  items: [],
  installmentPercent: 100,
  installmentGroupId: null
});

const isPartial = computed(() => form.installmentPercent > 0 && form.installmentPercent < 100);

const installmentAmount = computed(() => {
  const total = parseFloat(form.amount) || 0;
  return Math.round(total * form.installmentPercent / 100);
});

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

const modalTitle = computed(() => {
  switch (props.type) {
    case 'payment': return 'Registrar cobro';
    case 'provider_expense': return 'Registrar gasto propio';
    default: return 'Agregar gasto';
  }
});

const modalDescription = computed(() => {
  switch (props.type) {
    case 'payment': return 'Cobro al cliente. Se registra como ingreso a favor del proyecto.';
    case 'provider_expense': return 'Gasto personal del proveedor. No se cobra al cliente.';
    default: return 'Gasto de la obra que se cobra al cliente.';
  }
});

const submitLabel = computed(() => {
  switch (props.type) {
    case 'payment': return 'Registrar Cobro';
    case 'provider_expense': return 'Registrar Gasto Propio';
    default: return 'Agregar Gasto';
  }
});

// Clamp installment percent to allowed range
watch(() => form.installmentPercent, (val) => {
  if (val > installmentMaxPercent.value) {
    form.installmentPercent = installmentMaxPercent.value;
  } else if (val < 0) {
    form.installmentPercent = 0;
  }
});

// Auto-calculate amount from items
watch(() => form.items, (items) => {
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (total > 0) {
      form.amount = total;
    }
  }
}, { deep: true });

// Lock background scroll & reset form when modal opens
watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    const p = props.prefill;
    form.title = p?.title || '';
    form.amount = p?.totalAmount || '';
    form.category = p?.category || 'materiales';
    form.scopeType = p?.scopeType || 'original';
    form.description = '';
    form.paymentMethod = p?.paymentMethod || null;
    form.recipientName = p?.recipientName || '';
    form.recipientBankInfo = p?.recipientBankInfo || '';
    form.recipientPlatform = p?.recipientPlatform || '';
    form.recipientCuit = p?.recipientCuit || '';
    form.deliveryId = null;
    form.items = p?.items?.length ? p.items.map(i => ({ ...i })) : [];
    form.installmentPercent = p?.installmentPercent ?? 100;
    form.installmentGroupId = p?.installmentGroupId || null;
    showItems.value = form.items.length > 0;
    selectedRecipientIdx.value = -1;
    if (p?.recipientName && recipientStore.recipients.length > 0) {
      const idx = recipientStore.recipients.findIndex(r => r.name === p.recipientName);
      if (idx >= 0) selectedRecipientIdx.value = idx;
    }
    if (recipientStore.recipients.length === 0) {
      recipientStore.fetchAll();
    }
  }
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    const isProviderExpense = props.type === 'provider_expense';
    const percent = props.type === 'expense' ? form.installmentPercent : null;
    const effectiveAmount = (percent !== null && percent > 0 && percent < 100)
      ? installmentAmount.value
      : parseFloat(form.amount);
    const needsGroup = percent !== null && percent > 0 && percent < 100;

    const data = {
      title: form.title,
      amount: effectiveAmount,
      category: props.type === 'payment' ? 'pago' : form.category,
      description: form.description,
      type: props.type,
      scopeType: props.type === 'expense' ? form.scopeType : 'original',
      paymentMethod: isProviderExpense ? null : form.paymentMethod,
      recipientName: isProviderExpense ? null : (form.recipientName || null),
      recipientBankInfo: isProviderExpense ? null : (form.recipientBankInfo || null),
      recipientPlatform: isProviderExpense ? null : (form.recipientPlatform || null),
      recipientCuit: isProviderExpense ? null : (form.recipientCuit || null),
      createLinkedPayment: props.type === 'expense' && percent > 0,
      deliveryId: props.type === 'expense' ? (form.deliveryId || null) : null,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null,
      installmentPercent: percent,
      installmentGroupId: needsGroup ? (form.installmentGroupId || crypto.randomUUID()) : null
    };
    emit('submit', data);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
