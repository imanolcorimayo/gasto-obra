<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-surface rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="mb-4">
        <h3 class="font-semibold text-lg">{{ modalTitle }}</h3>
        <p class="text-gray-500 text-sm mt-1">{{ modalDescription }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Title + Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">{{ type === 'payment' ? 'Concepto' : 'Titulo' }}</label>
          <input
            v-model="form.title"
            type="text"
            required
            :placeholder="type === 'payment' ? 'Concepto del pago' : 'Titulo del gasto'"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Monto</label>
          <input
            v-model="form.amount"
            type="number"
            required
            min="1"
            step="0.01"
            placeholder="Monto"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Category (expense + provider_expense only) -->
        <div v-if="type !== 'payment'">
          <label class="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
          <select
            v-model="form.category"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          >
            <option v-for="cat in EXPENSE_CATEGORIES" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- Description (expense + provider_expense only) -->
        <div v-if="type !== 'payment'">
          <label class="block text-sm font-medium text-gray-300 mb-1">Descripcion</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Opcional"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Payment status (expense only, not provider_expense) -->
        <div v-if="type === 'expense'">
          <label class="block text-sm font-medium text-gray-300 mb-1">Estado de pago</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="form.paymentStatus = 'paid'"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === 'paid'
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'"
            >
              Pagado
            </button>
            <button
              type="button"
              @click="form.paymentStatus = 'pending'"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === 'pending'
                ? 'border-red-500 bg-red-500/20 text-red-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'"
            >
              Pendiente
            </button>
          </div>

          <!-- Auto-create payment toggle -->
          <div
            v-if="form.paymentStatus === 'paid'"
            class="mt-3 p-3 rounded-lg border transition-colors"
            :class="form.createLinkedPayment
              ? 'border-green-600/50 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50'"
          >
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="text-sm font-medium text-white">Registrar pago del cliente</span>
                <p class="text-xs text-gray-500 mt-0.5">Crea automaticamente un ingreso vinculado a este gasto</p>
              </div>
              <button
                type="button"
                @click="form.createLinkedPayment = !form.createLinkedPayment"
                class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out"
                :class="form.createLinkedPayment ? 'bg-green-500' : 'bg-gray-600'"
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
          <label class="block text-sm font-medium text-gray-300 mb-1">Medio de pago</label>
          <select
            v-model="form.paymentMethod"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-sm"
          >
            <option :value="null">Sin especificar</option>
            <option v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>

        <!-- Items (expense + provider_expense only) -->
        <div v-if="type !== 'payment'">
          <button
            type="button"
            @click="showItems = !showItems"
            class="text-sm text-gray-400 hover:text-white flex items-center gap-1"
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
                class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
              />
              <input
                v-model.number="item.amount"
                type="number"
                placeholder="Monto"
                min="0"
                step="0.01"
                class="w-28 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
              />
              <button type="button" @click="form.items.splice(idx, 1)" class="text-gray-500 hover:text-red-400 p-1">
                <MdiClose class="text-base" />
              </button>
            </div>
            <button
              type="button"
              @click="form.items.push({ name: '', amount: 0 })"
              class="text-sm text-primary hover:text-primary/80 self-start flex items-center gap-1"
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'expense' }
});

const emit = defineEmits(['close', 'submit']);

const isSubmitting = ref(false);
const showItems = ref(false);

const form = reactive({
  title: '',
  amount: '',
  category: 'materiales',
  description: '',
  paymentStatus: 'paid',
  paymentMethod: null,
  createLinkedPayment: true,
  items: []
});

const modalTitle = computed(() => {
  switch (props.type) {
    case 'payment': return 'Registrar pago del cliente';
    case 'provider_expense': return 'Registrar gasto propio';
    default: return 'Agregar gasto';
  }
});

const modalDescription = computed(() => {
  switch (props.type) {
    case 'payment': return 'Dinero recibido del cliente. Se registra como ingreso a favor del proyecto.';
    case 'provider_expense': return 'Gasto personal del proveedor. No se cobra al cliente.';
    default: return 'Gasto de la obra que se cobra al cliente.';
  }
});

const submitLabel = computed(() => {
  switch (props.type) {
    case 'payment': return 'Registrar Pago';
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
    form.items = [];
    showItems.value = false;
  }
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    const data = {
      title: form.title,
      amount: parseFloat(form.amount),
      category: props.type === 'payment' ? 'pago' : form.category,
      description: form.description,
      type: props.type,
      paymentStatus: props.type === 'provider_expense' ? 'paid' : form.paymentStatus,
      paymentMethod: props.type === 'provider_expense' ? null : form.paymentMethod,
      createLinkedPayment: props.type === 'expense' && form.paymentStatus === 'paid' && form.createLinkedPayment,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null
    };
    emit('submit', data);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
