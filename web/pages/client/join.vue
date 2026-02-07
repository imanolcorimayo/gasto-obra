<template>
  <div class="mb-8">
    <div class="max-w-md mx-auto">
      <h1 class="text-2xl font-bold mb-6">Unirme como cliente</h1>

      <!-- Loading -->
      <AppLoader v-if="isLoading" />

      <!-- Already joined -->
      <div v-else-if="alreadyJoined" class="bg-surface rounded-xl border border-gray-700 p-6 text-center">
        <h2 class="text-lg font-semibold text-green-400 mb-2">Ya sos cliente de este proyecto</h2>
        <p class="text-gray-400 mb-4">{{ project?.name }}</p>
        <NuxtLink :to="`/client/project/${project?.id}`" class="btn-primary inline-block">
          Ir al proyecto
        </NuxtLink>
      </div>

      <!-- Project found - can join -->
      <div v-else-if="project" class="bg-surface rounded-xl border border-gray-700 p-6">
        <h2 class="text-lg font-semibold mb-2">{{ project.name }}</h2>
        <div class="flex flex-col gap-2 text-sm text-gray-400 mb-6">
          <p v-if="project.address">{{ project.address }}</p>
          <p>
            Estado:
            <span :class="project.status === 'active' ? 'text-green-400' : 'text-gray-400'">
              {{ project.status === 'active' ? 'En curso' : project.status === 'completed' ? 'Finalizado' : 'Pausado' }}
            </span>
          </p>
        </div>

        <!-- Not authenticated -->
        <div v-if="!user">
          <p class="text-gray-300 mb-4">Para unirte como cliente, inicia sesion con Google:</p>
          <button @click="signIn" class="btn-primary w-full flex items-center justify-center gap-2">
            <MdiGoogle class="text-lg" />
            Iniciar sesion con Google
          </button>
        </div>

        <!-- Authenticated - ready to join -->
        <div v-else>
          <p class="text-gray-300 mb-4">
            Sesion iniciada como <span class="text-white font-medium">{{ user.email }}</span>
          </p>
          <button
            @click="joinProject"
            :disabled="isJoining"
            class="btn-primary w-full flex items-center justify-center gap-2"
          >
            <span v-if="isJoining" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Unirme como cliente
          </button>
        </div>
      </div>

      <!-- Project not found -->
      <div v-else class="text-center py-16">
        <h2 class="text-xl font-semibold text-gray-400">Proyecto no encontrado</h2>
        <p class="text-gray-500 mt-2">El link puede ser invalido o el proyecto ya no esta disponible.</p>
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
    useToast('error', 'Error al iniciar sesion');
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
