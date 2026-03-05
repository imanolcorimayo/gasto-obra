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
              :placeholder="type === 'payment' ? 'Concepto del pago' : 'Titulo del gasto'"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>

          <!-- Amount -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Monto</label>
            <div class="flex">
              <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
              <input
                v-model="form.amount"
                type="number"
                required
                min="1"
                step="0.01"
                placeholder="0.00"
                class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
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
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors appearance-none"
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
            <input
              v-model="form.description"
              type="text"
              placeholder="Opcional"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>

          <hr class="border-go-border-subtle" />

          <!-- Payment status (expense only, not provider_expense) -->
          <div v-if="type === 'expense'">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Estado de pago</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="form.paymentStatus = 'paid'"
                class="text-xs font-medium px-2.5 py-1 rounded-go-sm border transition-colors"
                :class="form.paymentStatus === 'paid'
                  ? 'border-go-success bg-go-success-muted text-go-success'
                  : 'border-go-border text-go-text-muted hover:border-go-text-muted'"
              >
                Pagado
              </button>
              <button
                type="button"
                @click="form.paymentStatus = 'pending'"
                class="text-xs font-medium px-2.5 py-1 rounded-go-sm border transition-colors"
                :class="form.paymentStatus === 'pending'
                  ? 'border-go-danger bg-go-danger-muted text-go-danger'
                  : 'border-go-border text-go-text-muted hover:border-go-text-muted'"
              >
                Pendiente
              </button>
            </div>

            <!-- Auto-create payment toggle -->
            <div
              v-if="form.paymentStatus === 'paid'"
              class="flex items-center gap-3 p-3 bg-go-surface rounded-go-md border border-go-border mt-3"
            >
              <label class="flex items-center justify-between cursor-pointer flex-1">
                <div>
                  <span class="text-sm text-go-text">Registrar cobro del cliente</span>
                  <p class="text-xs text-go-text-muted mt-0.5">Crea automaticamente un ingreso vinculado a este gasto</p>
                </div>
                <button
                  type="button"
                  @click="form.createLinkedPayment = !form.createLinkedPayment"
                  class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out"
                  :class="form.createLinkedPayment ? 'bg-go-success' : 'bg-go-surface-alt'"
                >
                  <span
                    class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out mt-0.5"
                    :class="form.createLinkedPayment ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'"
                  />
                </button>
              </label>
            </div>
          </div>

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

            <div v-if="showItems" class="mt-2 flex flex-col gap-2">
              <div
                v-for="(item, idx) in form.items"
                :key="idx"
                class="flex items-center gap-2 p-2 bg-go-bg rounded-go-md border border-go-border-subtle"
              >
                <input
                  v-model="item.name"
                  type="text"
                  placeholder="Nombre"
                  class="flex-1 bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                />
                <input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="Monto"
                  min="0"
                  step="0.01"
                  class="w-28 bg-transparent border border-go-border rounded-go-md px-3 py-1.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                />
                <button type="button" @click="form.items.splice(idx, 1)" class="text-go-text-muted hover:text-go-danger transition-colors p-1">
                  <MdiClose class="text-base" />
                </button>
              </div>
              <button
                type="button"
                @click="form.items.push({ name: '', amount: 0 })"
                class="btn-secondary text-xs w-full mt-2 flex items-center justify-center gap-1"
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
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS, SCOPE_TYPES, getScopeTypeStyles } from '~/utils';
import { useRecipientStore } from '~/stores/recipient';

const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'expense' },
  categories: { type: Array, default: () => [] },
  deliveries: { type: Array, default: () => [] }
});

const recipientStore = useRecipientStore();

const resolvedCategories = computed(() =>
  props.categories.length > 0 ? props.categories : DEFAULT_EXPENSE_CATEGORIES
);

const emit = defineEmits(['close', 'submit']);

const isSubmitting = ref(false);
const showItems = ref(false);
const selectedRecipientIdx = ref(-1);

const form = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  scopeType: 'original',
  description: '',
  paymentStatus: 'paid',
  paymentMethod: null,
  createLinkedPayment: true,
  recipientName: '',
  recipientBankInfo: '',
  recipientPlatform: '',
  recipientCuit: '',
  deliveryId: null,
  items: []
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

// Auto-toggle createLinkedPayment when paymentStatus changes
watch(() => form.paymentStatus, (status) => {
  form.createLinkedPayment = status === 'paid';
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
    form.title = '';
    form.amount = '';
    form.category = 'materiales';
    form.scopeType = 'original';
    form.description = '';
    form.paymentStatus = 'paid';
    form.paymentMethod = null;
    form.createLinkedPayment = true;
    form.recipientName = '';
    form.recipientBankInfo = '';
    form.recipientPlatform = '';
    form.recipientCuit = '';
    form.deliveryId = null;
    form.items = [];
    showItems.value = false;
    selectedRecipientIdx.value = -1;
    if (recipientStore.recipients.length === 0) {
      recipientStore.fetchAll();
    }
  }
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    const isProviderExpense = props.type === 'provider_expense';
    const data = {
      title: form.title,
      amount: parseFloat(form.amount),
      category: props.type === 'payment' ? 'pago' : form.category,
      description: form.description,
      type: props.type,
      scopeType: props.type === 'expense' ? form.scopeType : 'original',
      paymentStatus: isProviderExpense ? 'paid' : form.paymentStatus,
      paymentMethod: isProviderExpense ? null : form.paymentMethod,
      recipientName: isProviderExpense ? null : (form.recipientName || null),
      recipientBankInfo: isProviderExpense ? null : (form.recipientBankInfo || null),
      recipientPlatform: isProviderExpense ? null : (form.recipientPlatform || null),
      recipientCuit: isProviderExpense ? null : (form.recipientCuit || null),
      createLinkedPayment: props.type === 'expense' && form.paymentStatus === 'paid' && form.createLinkedPayment,
      deliveryId: props.type === 'expense' ? (form.deliveryId || null) : null,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null
    };
    emit('submit', data);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
