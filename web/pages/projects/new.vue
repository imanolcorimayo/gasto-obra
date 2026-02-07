<template>
  <div class="mb-8">
    <div class="mb-6">
      <NuxtLink to="/projects" class="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1">
        <MdiArrowLeft class="text-lg" />
        Volver a proyectos
      </NuxtLink>
      <h1 class="text-2xl font-bold mt-2">Nuevo Proyecto</h1>
      <p class="text-gray-400 text-sm mt-1">Crea un nuevo proyecto de obra o refaccion</p>
    </div>

    <div class="max-w-xl mx-auto">
      <div class="bg-surface rounded-xl border border-gray-700 p-6">
        <ProjectForm
          submit-label="Crear Proyecto"
          :is-submitting="isSubmitting"
          @submit="handleCreate"
          @cancel="navigateTo('/projects')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import { useProjectStore } from '~/stores/project';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'Nuevo Proyecto'
});

const projectStore = useProjectStore();
const isSubmitting = ref(false);

async function handleCreate(formData) {
  isSubmitting.value = true;

  try {
    const result = await projectStore.createProject(formData);

    if (result.success) {
      useToast('success', 'Proyecto creado');
      navigateTo('/projects');
    } else {
      useToast('error', result.error || 'Error al crear el proyecto');
    }
  } catch (error) {
    console.error('Error creating project:', error);
    useToast('error', 'Error al crear el proyecto');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
