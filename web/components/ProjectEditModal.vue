<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
    <div class="bg-surface rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="font-semibold text-lg mb-4">Editar proyecto</h3>

      <ProjectForm
        :initial-data="formData"
        submit-label="Guardar"
        :is-submitting="isSaving"
        @submit="handleSave"
        @cancel="$emit('close')"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  project: { type: Object, default: null }
});

const emit = defineEmits(['close', 'save']);
const isSaving = ref(false);

const formData = computed(() => {
  if (!props.project) return {};

  // Convert Firestore timestamp or Date to YYYY-MM-DD string for date input
  let estimatedEndDate = '';
  if (props.project.estimatedEndDate) {
    const date = props.project.estimatedEndDate.toDate
      ? props.project.estimatedEndDate.toDate()
      : new Date(props.project.estimatedEndDate);
    estimatedEndDate = date.toISOString().split('T')[0];
  }

  return {
    name: props.project.name || '',
    tag: props.project.tag || '',
    description: props.project.description || '',
    address: props.project.address || '',
    clientName: props.project.clientName || '',
    clientPhone: props.project.clientPhone || '',
    budget: props.project.budget || '',
    estimatedEndDate
  };
});

async function handleSave(data) {
  isSaving.value = true;
  try {
    emit('save', data);
  } finally {
    isSaving.value = false;
  }
}
</script>
