<template>
  <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-300 mb-1">Nombre del proyecto *</label>
      <input
        v-model="form.name"
        type="text"
        required
        placeholder="Ej: Depto Flores 3B"
        class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-300 mb-1">Tag (para WhatsApp) *</label>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">#</span>
        <input
          v-model="form.tag"
          type="text"
          required
          placeholder="flores3b"
          class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          @input="normalizeTag"
        />
      </div>
      <p class="text-gray-500 text-xs mt-1">Solo letras y numeros, sin espacios ni acentos</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-300 mb-1">Descripcion</label>
      <textarea
        v-model="form.description"
        rows="2"
        placeholder="Descripcion opcional del proyecto"
        class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
      ></textarea>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-300 mb-1">Direccion</label>
      <input
        v-model="form.address"
        type="text"
        placeholder="Ej: Av. Rivadavia 1234, CABA"
        class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Nombre del cliente</label>
        <input
          v-model="form.clientName"
          type="text"
          placeholder="Nombre del dueno"
          class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Telefono del cliente</label>
        <input
          v-model="form.clientPhone"
          type="tel"
          placeholder="5491155512345"
          class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
        />
        <p class="text-gray-500 text-xs mt-1">Para enviar resumenes diarios por WhatsApp</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Presupuesto</label>
        <input
          v-model="form.budget"
          type="number"
          min="0"
          step="1"
          placeholder="Monto total estimado"
          class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
        />
        <p class="text-gray-500 text-xs mt-1">Solo referencia</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Fecha estimada de fin</label>
        <input
          v-model="form.estimatedEndDate"
          type="date"
          class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
        />
        <p class="text-gray-500 text-xs mt-1">Solo referencia</p>
      </div>
    </div>

    <div class="flex gap-3 mt-2">
      <button
        type="submit"
        :disabled="isSubmitting"
        class="btn-primary flex-1 flex items-center justify-center gap-2"
      >
        <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        {{ submitLabel }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="btn-secondary"
      >
        Cancelar
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
  if (data.estimatedEndDate) {
    data.estimatedEndDate = new Date(data.estimatedEndDate);
  } else {
    data.estimatedEndDate = null;
  }
  emit('submit', data);
}
</script>
