<template>
  <div class="bg-go-bg min-h-screen flex items-start justify-center px-4">
    <div class="bg-go-surface border border-go-border rounded-go-xl p-8 max-w-md w-full mt-16 sm:mt-24">
      <!-- Logo wordmark -->
      <div class="text-center mb-6">
        <span class="font-display font-bold text-xl text-go-text">gasto<span class="text-go-primary">obra</span></span>
      </div>

      <!-- Loading -->
      <AppLoader v-if="isLoading" />

      <!-- Already joined -->
      <div v-else-if="alreadyJoined" class="text-center">
        <div class="w-12 h-12 rounded-full bg-go-success-muted flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-success"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 class="font-display font-semibold text-lg text-go-text mb-1">Ya sos cliente de este proyecto</h2>
        <p class="text-go-text-tertiary text-sm mb-6">{{ project?.name }}</p>
        <NuxtLink :to="`/client/project/${project?.id}`" class="btn-primary w-full inline-flex items-center justify-center">
          Ver mi obra
        </NuxtLink>
      </div>

      <!-- Project found - can join -->
      <div v-else-if="project">
        <!-- Project info -->
        <h2 class="font-display font-semibold text-xl text-go-text text-center">{{ project.name }}</h2>
        <div class="text-center mt-1 mb-6">
          <span v-if="project.tag" class="text-go-text-muted text-sm font-mono">#{{ project.tag }}</span>
          <span v-if="project.tag && project.address" class="text-go-text-muted text-sm"> · </span>
          <span v-if="project.address" class="text-go-text-muted text-sm">{{ project.address }}</span>
        </div>

        <!-- Not authenticated -->
        <div v-if="!user">
          <h3 class="font-display font-semibold text-lg text-go-text mb-1">Te invitaron a ver esta obra</h3>
          <p class="text-go-text-muted text-sm mb-6">Ingresa con Google para acceder a tu historial personalizado.</p>
          <button @click="signIn" class="btn-primary w-full flex items-center justify-center gap-2">
            <MdiGoogle class="text-lg" />
            Iniciar sesión con Google
          </button>
          <p class="text-go-text-muted text-xs text-center mt-3">También podés ver la obra sin cuenta desde el link original.</p>
        </div>

        <!-- Authenticated - ready to join -->
        <div v-else>
          <p class="text-go-text-secondary text-sm mb-1">
            Sesión iniciada como
          </p>
          <p class="text-go-text font-medium text-sm mb-4">{{ user.email }}</p>
          <button
            @click="joinProject"
            :disabled="isJoining"
            class="btn-primary w-full flex items-center justify-center gap-2"
          >
            <span v-if="isJoining" class="w-4 h-4 border-2 border-go-primary-on border-t-transparent rounded-full animate-spin"></span>
            Unirme como cliente
          </button>
        </div>
      </div>

      <!-- Project not found -->
      <div v-else class="text-center py-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <p class="text-go-text-muted text-sm mt-1">El link puede ser inválido o el proyecto ya no está disponible.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiGoogle from '~icons/mdi/google';
import { useProjectStore } from '~/stores/project';
import { signInWithGoogle, getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({
  middleware: []
});

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const isLoading = ref(true);
const isJoining = ref(false);
const project = ref(null);
const user = ref(null);
const alreadyJoined = ref(false);

useHead({
  title: 'Unirme como cliente'
});

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    isLoading.value = false;
    return;
  }

  // Fetch project by share token
  const result = await projectStore.fetchProjectByShareToken(token);
  project.value = result;

  // Check auth
  user.value = await getCurrentUserAsync();

  // Check if already joined
  if (user.value && result?.clientUserId === user.value.uid) {
    alreadyJoined.value = true;
  }

  isLoading.value = false;
});

async function signIn() {
  try {
    user.value = await signInWithGoogle();

    // Check if already joined after sign-in
    if (user.value && project.value?.clientUserId === user.value.uid) {
      alreadyJoined.value = true;
    }
  } catch (error) {
    console.error('Error signing in:', error);
    useToast('error', 'Error al iniciar sesión');
  }
}

async function joinProject() {
  if (!user.value || !project.value) return;

  isJoining.value = true;
  try {
    const result = await projectStore.joinAsClient(project.value.id, user.value.uid);

    if (result.success) {
      useToast('success', 'Te uniste como cliente');
      router.push(`/client/project/${project.value.id}`);
    } else {
      useToast('error', result.error || 'Error al unirse');
    }
  } catch (error) {
    console.error('Error joining project:', error);
    useToast('error', 'Error al unirse');
  } finally {
    isJoining.value = false;
  }
}
</script>
