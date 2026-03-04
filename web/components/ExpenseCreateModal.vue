<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-go-surface rounded-go-xl border border-go-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="mb-4">
        <h3 class="text-base font-semibold">{{ modalTitle }}</h3>
        <p class="text-go-text-muted text-sm mt-1">{{ modalDescription }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Title + Amount -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">{{ type === 'payment' ? 'Concepto' : 'Titulo' }}</label>
          <input
            v-model="form.title"
            type="text"
            required
            :placeholder="type === 'payment' ? 'Concepto del pago' : 'Titulo del gasto'"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Monto</label>
          <input
            v-model="form.amount"
            type="number"
            required
            min="1"
            step="0.01"
            placeholder="Monto"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <!-- Category (expense + provider_expense only) -->
        <div v-if="type !== 'payment'">
          <label class="block text-sm font-medium text-go-text mb-1">Categoria</label>
          <select
            v-model="form.category"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text focus:outline-none focus:border-go-primary"
          >
            <option v-for="cat in resolvedCategories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- Description (expense + provider_expense only) -->
        <div v-if="type !== 'payment'">
          <label class="block text-sm font-medium text-go-text mb-1">Descripcion</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Opcional"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <!-- Payment status (expense only, not provider_expense) -->
        <div v-if="type === 'expense'">
          <label class="block text-sm font-medium text-go-text mb-1">Estado de pago</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="form.paymentStatus = 'paid'"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === 'paid'
                ? 'border-go-success bg-go-success-muted text-go-success'
                : 'border-go-border text-go-text-tertiary hover:border-go-border'"
            >
              Pagado
            </button>
            <button
              type="button"
              @click="form.paymentStatus = 'pending'"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === 'pending'
                ? 'border-go-danger bg-go-danger-muted text-go-danger'
                : 'border-go-border text-go-text-tertiary hover:border-go-border'"
            >
              Pendiente
            </button>
          </div>

          <!-- Auto-create payment toggle -->
          <div
            v-if="form.paymentStatus === 'paid'"
            class="mt-3 p-3 rounded-go-md border transition-colors"
            :class="form.createLinkedPayment
              ? 'border-go-success/50 bg-go-success-muted'
              : 'border-go-border bg-go-surface'"
          >
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="text-sm font-medium text-go-text">Registrar cobro del cliente</span>
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
          <label class="block text-sm font-medium text-go-text mb-1">Medio de pago</label>
          <select
            v-model="form.paymentMethod"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text focus:outline-none focus:border-go-primary text-sm"
          >
            <option :value="null">Sin especificar</option>
            <option v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>

        <!-- Recipient (expense + payment only) -->
        <div v-if="type !== 'provider_expense'">
          <label class="block text-sm font-medium text-go-text mb-1">Destinatario</label>
          <template v-if="recipientStore.recipients.length > 0">
            <select
              v-model="selectedRecipientIdx"
              class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text focus:outline-none focus:border-go-primary text-sm"
            >
              <option :value="-1">Sin destinatario</option>
              <option v-for="(r, idx) in recipientStore.recipients" :key="idx" :value="idx">
                {{ r.name }}{{ r.platform ? ` (${r.platform})` : '' }}
              </option>
            </select>
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
              class="flex gap-2 items-center"
            >
              <input
                v-model="item.name"
                type="text"
                placeholder="Nombre"
                class="flex-1 bg-go-surface border border-go-border rounded-go-md px-3 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
              />
              <input
                v-model.number="item.amount"
                type="number"
                placeholder="Monto"
                min="0"
                step="0.01"
                class="w-28 bg-go-surface border border-go-border rounded-go-md px-3 py-1.5 text-go-text text-sm placeholder-go-text-muted focus:outline-none focus:border-go-primary"
              />
              <button type="button" @click="form.items.splice(idx, 1)" class="text-go-text-muted hover:text-go-danger p-1">
                <MdiClose class="text-base" />
              </button>
            </div>
            <button
              type="button"
              @click="form.items.push({ name: '', amount: 0 })"
              class="text-sm text-go-primary hover:text-go-primary/80 self-start flex items-center gap-1"
            >
              <MdiPlus class="text-base" />
              Agregar item
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-2">
          <button type="submit" :disabled="isSubmitting" class="btn-primary flex-1 flex items-center justify-center gap-2">
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ submitLabel }}
          </button>
          <button type="button" @click="$emit('close')" class="btn-secondary">
            Cancelar
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
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS } from '~/utils';
import { useRecipientStore } from '~/stores/recipient';

const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'expense' },
  categories: { type: Array, default: () => [] }
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
  description: '',
  paymentStatus: 'paid',
  paymentMethod: null,
  createLinkedPayment: true,
  recipientName: '',
  recipientBankInfo: '',
  recipientPlatform: '',
  recipientCuit: '',
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

// Reset form when modal opens
watch(() => props.show, (show) => {
  if (show) {
    form.title = '';
    form.amount = '';
    form.category = 'materiales';
    form.description = '';
    form.paymentStatus = 'paid';
    form.paymentMethod = null;
    form.createLinkedPayment = true;
    form.recipientName = '';
    form.recipientBankInfo = '';
    form.recipientPlatform = '';
    form.recipientCuit = '';
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
      paymentStatus: isProviderExpense ? 'paid' : form.paymentStatus,
      paymentMethod: isProviderExpense ? null : form.paymentMethod,
      recipientName: isProviderExpense ? null : (form.recipientName || null),
      recipientBankInfo: isProviderExpense ? null : (form.recipientBankInfo || null),
      recipientPlatform: isProviderExpense ? null : (form.recipientPlatform || null),
      recipientCuit: isProviderExpense ? null : (form.recipientCuit || null),
      createLinkedPayment: props.type === 'expense' && form.paymentStatus === 'paid' && form.createLinkedPayment,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null
    };
    emit('submit', data);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
