<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">{{ isEdit ? 'Editar entrega' : 'Nueva entrega' }}</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ isEdit ? `${delivery.number}° Entrega` : 'Crea una entrega para agrupar gastos' }}</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body space-y-4">
          <!-- Preview -->
          <div class="bg-go-surface border border-go-border rounded-go-md px-4 py-3">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Vista previa</span>
            <div class="flex items-center gap-2">
              <span class="font-display font-semibold text-go-text">{{ displayNumber }}° Entrega</span>
              <span v-if="form.date" class="text-xs text-go-text-muted tabular-nums">{{ previewDate }}</span>
            </div>
            <p v-if="form.description" class="text-xs text-go-text-tertiary mt-0.5">{{ form.description }}</p>
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Fecha</label>
            <input
              v-model="form.date"
              type="date"
              required
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Descripcion</label>
            <p class="text-[11px] text-go-text-muted mb-1.5">Detalle adicional que aparece debajo del titulo de la entrega</p>
            <input
              v-model="form.description"
              type="text"
              placeholder="Ej: Materiales semana 1, Demolicion baño"
              maxlength="200"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>
        </div>

        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">
            Cancelar
          </button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2">
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ isEdit ? 'Guardar' : 'Crear entrega' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';

const props = defineProps({
  show: { type: Boolean, default: false },
  nextNumber: { type: Number, default: 1 },
  delivery: { type: Object, default: null }
});

const emit = defineEmits(['close', 'submit']);

const isSubmitting = ref(false);
const isEdit = computed(() => !!props.delivery);
const displayNumber = computed(() => isEdit.value ? props.delivery.number : props.nextNumber);

const form = reactive({
  date: '',
  description: ''
});

const previewDate = computed(() => {
  if (!form.date) return '';
  const d = new Date(form.date + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

function toDateInputValue(timestamp) {
  if (!timestamp) return new Date().toISOString().split('T')[0];
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0];
}

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    isSubmitting.value = false;
    if (props.delivery) {
      form.date = toDateInputValue(props.delivery.date);
      form.description = props.delivery.description || '';
    } else {
      form.date = new Date().toISOString().split('T')[0];
      form.description = '';
    }
  }
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    emit('submit', {
      id: props.delivery?.id || null,
      date: new Date(form.date + 'T12:00:00'),
      description: form.description
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>
