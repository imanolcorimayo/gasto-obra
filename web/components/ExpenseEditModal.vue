<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-surface rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="font-semibold text-lg mb-4">Editar registro</h3>

      <form @submit.prevent="handleSave" class="flex flex-col gap-3">
        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
          <div class="flex gap-2">
            <button
              v-for="t in typeOptions"
              :key="t.value"
              type="button"
              @click="form.type = t.value"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.type === t.value
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Titulo</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Monto</label>
          <input
            v-model="form.amount"
            type="number"
            required
            min="1"
            step="0.01"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Category (hidden for payments) -->
        <div v-if="form.type !== 'payment'">
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

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Descripcion</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Opcional"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Payment Status -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Estado de pago</label>
          <div class="flex gap-2">
            <button
              v-for="s in PAYMENT_STATUSES"
              :key="s.value"
              type="button"
              @click="form.paymentStatus = s.value"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors"
              :class="form.paymentStatus === s.value
                ? s.value === 'paid'
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-red-500 bg-red-500/20 text-red-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Payment Method -->
        <div>
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

        <!-- Items (collapsible) -->
        <div>
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
              <button type="button" @click="removeItem(idx)" class="text-gray-500 hover:text-red-400 p-1">
                <MdiClose class="text-base" />
              </button>
            </div>
            <button
              type="button"
              @click="addItem"
              class="text-sm text-primary hover:text-primary/80 self-start flex items-center gap-1"
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
            class="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <MdiChevronDown class="transition-transform" :class="{ 'rotate-180': showMoveProject }" />
            Mover a otro proyecto
          </button>

          <div v-if="showMoveProject" class="mt-2">
            <select
              v-model="form.projectId"
              class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-sm"
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PAYMENT_STATUSES } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  projects: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'save']);

const showItems = ref(false);
const showMoveProject = ref(false);
const isSaving = ref(false);

const typeOptions = [
  { value: 'expense', label: 'Gasto' },
  { value: 'payment', label: 'Pago del cliente' },
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
    form.items = expense.items ? expense.items.map(i => ({ ...i })) : [];
    form.projectId = expense.projectId || '';
    showItems.value = form.items.length > 0;
    showMoveProject.value = false;
  }
}, { immediate: true });

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
      items: form.items.length > 0 ? form.items.filter(i => i.name) : null,
      projectId: form.projectId
    };
    emit('save', { id: props.expense.id, data });
  } finally {
    isSaving.value = false;
  }
}
</script>
