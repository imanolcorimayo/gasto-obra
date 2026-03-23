<template>
  <div class="mb-8">
    <!-- Step 1: Create project form -->
    <template v-if="!showLinkStep">
      <div class="mb-6">
        <NuxtLink to="/projects" class="text-go-text-tertiary hover:text-go-text text-sm mb-2 inline-flex items-center gap-1">
          <MdiArrowLeft class="text-lg" />
          Volver a proyectos
        </NuxtLink>
        <h1 class="text-[28px] font-bold tracking-tight mt-2">Nuevo Proyecto</h1>
        <p class="text-go-text-tertiary text-sm mt-1">Creá un nuevo proyecto de obra o refacción</p>
      </div>

      <div class="max-w-xl mx-auto">
        <div class="bg-go-surface rounded-go-xl border border-go-border p-6">
          <ProjectForm
            submit-label="Crear Proyecto"
            :is-submitting="isSubmitting"
            @submit="handleCreate"
            @cancel="navigateTo('/projects')"
          />
        </div>
      </div>
    </template>

    <!-- Step 2: WhatsApp linking prompt (first project only) -->
    <template v-else>
      <div class="flex flex-col items-center justify-center py-16 px-4">
        <CasquitoHappy :size="100" class="mb-6" />

        <h1 class="font-display font-bold text-2xl text-go-text text-center mb-2">
          ¡Proyecto creado!
        </h1>
        <p class="text-go-text-muted text-sm text-center max-w-md mb-10">
          ¿Cómo querés seguir?
        </p>

        <!-- Waiting for WA confirmation -->
        <div v-if="waitingConfirmation" class="w-full max-w-sm bg-go-surface border border-go-border rounded-go-xl p-6 text-center">
          <span class="inline-block w-5 h-5 border-2 border-go-primary border-t-transparent rounded-full animate-spin mb-3"></span>
          <p class="text-go-text text-sm font-medium">¿Enviaste el mensaje en WhatsApp?</p>
          <p class="text-go-text-muted text-xs mt-1">La vinculación se confirma automáticamente.</p>
          <button class="mt-4 text-go-text-muted text-xs hover:text-go-text-secondary transition-colors" @click="navigateTo('/projects')">
            Ir al proyecto
          </button>
        </div>

        <!-- Two options side by side -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <!-- WhatsApp option -->
          <button
            @click="handleLinkWhatsApp"
            :disabled="isGenerating"
            class="bg-go-surface border-2 border-go-border rounded-go-xl p-6 text-center transition-all duration-150 hover:border-[#25D366] hover:bg-go-surface-hover focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdiWhatsapp class="w-8 h-8 text-[#25D366] mx-auto mb-3" />
            <h3 class="font-display font-semibold text-go-text text-sm">Vincular WhatsApp</h3>
            <p class="text-go-text-muted text-xs mt-1.5 leading-relaxed">
              Registrá gastos con fotos, texto, audio o PDF desde el celular.
            </p>
          </button>

          <!-- Web option -->
          <button
            @click="navigateTo('/projects')"
            class="bg-go-surface border-2 border-go-border rounded-go-xl p-6 text-center transition-all duration-150 hover:border-go-primary hover:bg-go-surface-hover focus:outline-none focus:ring-2 focus:ring-go-primary/50"
          >
            <MdiMonitor class="w-8 h-8 text-go-primary mx-auto mb-3" />
            <h3 class="font-display font-semibold text-go-text text-sm">Continuar en la web</h3>
            <p class="text-go-text-muted text-xs mt-1.5 leading-relaxed">
              Cargá gastos desde la app con texto, fotos o PDF.
            </p>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiMonitor from '~icons/mdi/monitor';
import { useProjectStore } from '~/stores/project';
import { useWhatsappStore } from '~/stores/whatsapp';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'Nuevo Proyecto'
});

const config = useRuntimeConfig();
const projectStore = useProjectStore();
const whatsappStore = useWhatsappStore();

const isSubmitting = ref(false);
const showLinkStep = ref(false);
const waitingConfirmation = ref(false);
const isGenerating = computed(() => whatsappStore.isGenerating);
const isFirstProject = ref(false);

onMounted(async () => {
  isFirstProject.value = projectStore.projects.length === 0;
});

async function handleCreate(formData) {
  isSubmitting.value = true;

  try {
    const result = await projectStore.createProject(formData);

    if (result.success) {
      useToast('success', 'Proyecto creado');

      if (!isFirstProject.value) {
        navigateTo('/projects');
        return;
      }

      // First project — check if WhatsApp is already linked
      await whatsappStore.fetchLinkedAccount();
      if (whatsappStore.isLinked) {
        navigateTo('/projects');
        return;
      }

      // Show WhatsApp linking step
      whatsappStore.subscribeToChanges();
      showLinkStep.value = true;

      // Watch for successful linking
      watch(() => whatsappStore.isLinked, (linked) => {
        if (linked) {
          useToast('success', 'WhatsApp vinculado');
          navigateTo('/projects');
        }
      });
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

async function handleLinkWhatsApp() {
  const result = await whatsappStore.generateCode();

  if (result.success && result.code) {
    const digits = (config.public.whatsappNumber || '').replace(/\D/g, '');
    const message = encodeURIComponent(`VINCULAR ${result.code}`);
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank');
    waitingConfirmation.value = true;
  } else {
    useToast('error', result.error || 'Error al generar el código');
  }
}

onUnmounted(() => {
  whatsappStore.unsubscribe();
});
</script>
