<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Project info -->
    <div>
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Nombre del proyecto *</label>
      <input
        v-model="form.name"
        type="text"
        required
        placeholder="Ej: Depto Flores 3B"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
      />
    </div>

    <div>
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Tag (para WhatsApp) *</label>
      <div class="flex">
        <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">#</span>
        <input
          v-model="form.tag"
          type="text"
          required
          placeholder="flores3b"
          class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          @input="normalizeTag"
        />
      </div>
      <p class="text-[11px] text-go-text-muted mt-1">Solo letras y numeros, sin espacios.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Presupuesto</label>
        <div class="flex">
          <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
          <input
            v-model="form.budget"
            type="number"
            min="0"
            step="1"
            placeholder="Monto total estimado"
            class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          />
        </div>
        <p class="text-[11px] text-go-text-muted mt-1">Solo referencia</p>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Fecha de inicio</label>
        <input
          v-model="form.startDate"
          type="date"
          class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        />
      </div>
    </div>

    <div>
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Fecha estimada de fin</label>
      <input
        v-model="form.estimatedEndDate"
        type="date"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors sm:max-w-[calc(50%-0.5rem)]"
      />
    </div>

    <div>
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Direccion</label>
      <input
        v-model="form.address"
        type="text"
        placeholder="Ej: Av. Rivadavia 1234, CABA"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
      />
    </div>

    <div>
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Descripcion</label>
      <textarea
        v-model="form.description"
        rows="3"
        placeholder="Descripcion opcional del proyecto"
        class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
      ></textarea>
    </div>

    <hr class="border-go-border-subtle !my-5" />

    <!-- Client info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Nombre del cliente</label>
        <input
          v-model="form.clientName"
          type="text"
          placeholder="Nombre del dueño"
          class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Telefono del cliente</label>
        <input
          v-model="form.clientPhone"
          type="tel"
          placeholder="5491155512345"
          class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
        />
        <p class="text-[11px] text-go-text-muted mt-1">Para enviar resumenes diarios por WhatsApp</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 pt-2 sm:justify-end">
      <button
        type="button"
        @click="$emit('cancel')"
        class="btn-secondary order-2 sm:order-1"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="btn-primary flex items-center justify-center gap-2 order-1 sm:order-2"
      >
        <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup>
const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
  submitLabel: { type: String, default: 'Crear Proyecto' },
  isSubmitting: { type: Boolean, default: false }
});

const emit = defineEmits(['submit', 'cancel']);

const form = reactive({
  name: props.initialData.name || '',
  tag: props.initialData.tag || '',
  description: props.initialData.description || '',
  address: props.initialData.address || '',
  clientName: props.initialData.clientName || '',
  clientPhone: props.initialData.clientPhone || '',
  budget: props.initialData.budget || '',
  startDate: props.initialData.startDate || '',
  estimatedEndDate: props.initialData.estimatedEndDate || ''
});

function normalizeTag() {
  form.tag = form.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function handleSubmit() {
  const data = { ...form };
  if (data.budget) {
    data.budget = parseFloat(data.budget);
  } else {
    data.budget = null;
  }
  if (data.startDate) {
    data.startDate = new Date(data.startDate);
  } else {
    data.startDate = null;
  }
  if (data.estimatedEndDate) {
    data.estimatedEndDate = new Date(data.estimatedEndDate);
  } else {
    data.estimatedEndDate = null;
  }
  emit('submit', data);
}
</script>
