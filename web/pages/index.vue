<template>
  <div class="min-h-screen bg-go-bg flex flex-col items-center justify-center px-4">
    <div class="max-w-md w-full text-center">
      <!-- Logo / Brand -->
      <div class="mb-8">
        <img src="/img/logo-vertical.svg" alt="Gasto Obra" class="h-40 mx-auto mb-4" />
        <p class="text-go-text-secondary text-lg">Control de gastos de obra y refacción</p>
      </div>

      <!-- Description -->
      <div class="mb-8 text-go-text-secondary text-sm space-y-3">
        <p>Registrá gastos de tu obra por WhatsApp.</p>
        <p>Tu cliente recibe un resumen diario y un link para ver todos los gastos en tiempo real.</p>
      </div>

      <!-- Features -->
      <div class="grid grid-cols-1 gap-3 mb-8 text-left">
        <div class="flex items-start gap-3 bg-go-surface border border-go-border rounded-go-md p-3">
          <MdiWhatsapp class="text-go-success text-xl mt-0.5 shrink-0" />
          <div>
            <p class="font-medium text-sm text-go-text">WhatsApp</p>
            <p class="text-go-text-tertiary text-xs">Registrá gastos enviando un mensaje</p>
          </div>
        </div>
        <div class="flex items-start gap-3 bg-go-surface border border-go-border rounded-go-md p-3">
          <MdiCamera class="text-go-primary text-xl mt-0.5 shrink-0" />
          <div>
            <p class="font-medium text-sm text-go-text">Fotos de tickets</p>
            <p class="text-go-text-tertiary text-xs">Enviá una foto y la IA extrae los datos</p>
          </div>
        </div>
        <div class="flex items-start gap-3 bg-go-surface border border-go-border rounded-go-md p-3">
          <MdiLinkVariant class="text-go-info text-xl mt-0.5 shrink-0" />
          <div>
            <p class="font-medium text-sm text-go-text">Link para el cliente</p>
            <p class="text-go-text-tertiary text-xs">Compartí un link de solo lectura con el dueño</p>
          </div>
        </div>
      </div>

      <!-- Login Button -->
      <button
        @click="handleLogin"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3 px-6 rounded-go-md hover:bg-gray-100 transition-colors"
      >
        <MdiGoogle class="text-xl" />
        <span v-if="!isLoading">Ingresar con Google</span>
        <span v-else class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></span>
          Ingresando...
        </span>
      </button>

      <p class="text-go-text-muted text-xs mt-4">
        Al ingresar, aceptás los términos del servicio.
      </p>
    </div>
  </div>
</template>

<script setup>
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiCamera from '~icons/mdi/camera';
import MdiLinkVariant from '~icons/mdi/link-variant';
import MdiGoogle from '~icons/mdi/google';
import { signInWithGoogle, getCurrentUserAsync } from '~/utils/firebase';
import { useProjectStore } from '~/stores/project';

definePageMeta({
  layout: 'landing'
});

useHead({
  title: 'Gasto Obra - Control de gastos de obra'
});

const isLoading = ref(false);

async function redirectUser(user) {
  // Check if user has client projects
  const projectStore = useProjectStore();
  await projectStore.fetchClientProjects(user.uid);

  if (projectStore.clientProjects.length > 0) {
    // Check if they also have provider projects
    await projectStore.fetchProjects();
    if (projectStore.projects.length > 0) {
      navigateTo('/projects');
    } else {
      navigateTo('/client');
    }
  } else {
    navigateTo('/projects');
  }
}

// Redirect if already logged in
onMounted(async () => {
  const user = await getCurrentUserAsync();
  if (user) {
    await redirectUser(user);
  }
});

async function handleLogin() {
  isLoading.value = true;
  try {
    const user = await signInWithGoogle();
    if (user) {
      await redirectUser(user);
    }
  } catch (error) {
    console.error('Login error:', error);
    useToast('error', 'Error al iniciar sesion');
  } finally {
    isLoading.value = false;
  }
}
</script>
