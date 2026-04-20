<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">{{ isEdit ? 'Editar material' : 'Nuevo material' }}</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ isEdit ? 'Editá los datos del material.' : 'Agregá un material necesario para este item.' }}</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body space-y-4">
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Nombre *</label>
            <input
              v-model="form.name"
              type="text"
              required
              maxlength="200"
              placeholder='Ej: "5 m² de cerámica blanca 30x30"'
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
            <p class="text-[11px] text-go-text-muted mt-1">Si necesitás cantidad o medida, sumala al nombre.</p>
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Notas</label>
            <textarea
              v-model="form.notes"
              rows="2"
              maxlength="500"
              placeholder="Opcional: marca preferida, color, link de referencia, etc."
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">Cancelar</button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <span v-if="isSubmitting" class="btn-spinner"></span>
            {{ isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear material') }}
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
  material: { type: Object, default: null },
  isSubmitting: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'submit']);

const isEdit = computed(() => !!props.material);

const form = reactive({
  name: '',
  notes: ''
});

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    if (props.material) {
      form.name = props.material.name || '';
      form.notes = props.material.notes || '';
    } else {
      form.name = '';
      form.notes = '';
    }
  }
});

function handleSubmit() {
  emit('submit', {
    name: form.name.trim(),
    notes: form.notes.trim() || null
  });
}
</script>
