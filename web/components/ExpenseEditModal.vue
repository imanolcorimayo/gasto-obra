<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-go-surface rounded-go-xl border border-go-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="text-base font-semibold mb-4">Editar registro</h3>

      <form @submit.prevent="handleSave" class="flex flex-col gap-3">
        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Tipo</label>
          <div class="flex gap-2">
            <button
              v-for="t in typeOptions"
              :key="t.value"
              type="button"
              @click="form.type = t.value"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.type === t.value
                ? 'border-go-primary bg-go-primary/20 text-go-primary'
                : 'border-go-border text-go-text-tertiary hover:border-go-border'"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Titulo</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Monto</label>
          <input
            v-model="form.amount"
            type="number"
            required
            min="1"
            step="0.01"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <!-- Category (hidden for payments) -->
        <div v-if="form.type !== 'payment'">
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

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Descripcion</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Opcional"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary"
          />
        </div>

        <!-- Payment Status -->
        <div>
          <label class="block text-sm font-medium text-go-text mb-1">Estado de pago</label>
          <div class="flex gap-2">
            <button
              v-for="s in PAYMENT_STATUSES"
              :key="s.value"
              type="button"
              @click="form.paymentStatus = s.value"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === s.value
                ? s.value === 'paid'
                  ? 'border-go-success bg-go-success-muted text-go-success'
                  : 'border-go-danger bg-go-danger-muted text-go-danger'
                : 'border-go-border text-go-text-tertiary hover:border-go-border'"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Payment Method -->
        <div>
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

        <!-- Recipient -->
        <div>
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
              <button type="button" @click="removeItem(idx)" class="text-go-text-muted hover:text-go-danger p-1">
                <MdiClose class="text-base" />
              </button>
            </div>
            <button
              type="button"
              @click="addItem"
              class="text-sm text-go-primary hover:text-go-primary/80 self-start flex items-center gap-1"
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
            <select
              v-model="form.projectId"
              class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text focus:outline-none focus:border-go-primary text-sm"
            >
              <option v-for="p in projects" :key="p.id" :value="p.id">
                {{ p.name }} (#{{ p.tag }})
              </option>
            </select>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-3">
          <button type="submit" :disabled="isSaving" class="btn-primary flex-1">
            <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
            Guardar
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
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS, PAYMENT_STATUSES } from '~/utils';
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
  paymentStatus: 'paid',
  paymentMethod: null,
  recipientName: '',
  recipientBankInfo: '',
  recipientPlatform: '',
  recipientCuit: '',
  items: [],
  projectId: ''
});

watch(() => props.expense, (expense) => {
  if (expense) {
    form.title = expense.title || '';
    form.amount = expense.amount || '';
    form.category = expense.category || 'materiales';
    form.description = expense.description || '';
    form.type = expense.type || 'expense';
    form.paymentStatus = expense.paymentStatus || 'paid';
    form.paymentMethod = expense.paymentMethod || null;
    form.recipientName = expense.recipientName || '';
    form.recipientBankInfo = expense.recipientBankInfo || '';
    form.recipientPlatform = expense.recipientPlatform || '';
    form.recipientCuit = expense.recipientCuit || '';
    form.items = expense.items ? expense.items.map(i => ({ ...i })) : [];
    form.projectId = expense.projectId || '';
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
    const data = {
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.type === 'payment' ? 'pago' : form.category,
      description: form.description,
      type: form.type,
      paymentStatus: form.paymentStatus,
      paymentMethod: form.paymentMethod,
      recipientName: form.recipientName || null,
      recipientBankInfo: form.recipientBankInfo || null,
      recipientPlatform: form.recipientPlatform || null,
      recipientCuit: form.recipientCuit || null,
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null,
      projectId: form.projectId
    };
    emit('save', { id: props.expense.id, data });
  } finally {
    isSaving.value = false;
  }
}
</script>
