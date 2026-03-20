<template>
  <div class="min-h-screen bg-go-bg">
    <!-- Branded mini-header -->
    <header class="bg-go-bg border-b border-go-border px-4 py-3 flex items-center justify-between">
      <span class="font-display font-bold text-go-text">gasto<span class="text-go-primary">obra</span></span>
      <div class="flex items-center gap-2">
        <button
          @click="toggleTheme"
          class="p-1.5 rounded-lg text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover transition-colors duration-200"
          :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <MdiSun v-if="isDark" class="text-base" />
          <MdiMoon v-else class="text-base" />
        </button>
        <span class="bg-go-surface border border-go-border rounded-go-sm px-2 py-1 text-[11px] text-go-text-muted">Vista previa</span>
      </div>
    </header>

    <div class="max-w-md mx-auto px-4 py-12">
      <!-- Loading skeleton -->
      <template v-if="isLoading">
        <div class="bg-go-surface border border-go-border rounded-go-xl p-6">
          <div class="h-7 w-48 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-3 mx-auto"></div>
          <div class="h-4 w-32 skeleton-shimmer bg-go-surface-alt rounded-go-md mx-auto"></div>
        </div>
      </template>

      <!-- Not found -->
      <div v-else-if="!project" class="text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-go-text-muted/30 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Proyecto no encontrado</h2>
        <p class="text-go-text-muted text-sm mt-1">El link puede ser inválido o el proyecto ya no está disponible.</p>
      </div>

      <!-- Project preview -->
      <template v-else>
        <div class="bg-go-surface border border-go-border rounded-go-xl p-6 text-center">
          <!-- Project name & tag -->
          <h1 class="font-display font-bold text-2xl text-go-text">{{ project.name }}</h1>
          <div class="flex items-center justify-center gap-2 mt-2">
            <span v-if="project.tag" class="font-mono text-sm text-go-text-muted">#{{ project.tag }}</span>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-go-sm"
              :class="statusClasses"
            >
              {{ statusLabel }}
            </span>
          </div>

          <!-- Metadata (address, client name) -->
          <div v-if="project.address || project.clientName" class="flex flex-wrap items-center justify-center gap-3 mt-4 text-sm text-go-text-tertiary">
            <div v-if="project.address" class="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ project.address }}</span>
            </div>
            <div v-if="project.clientName" class="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{{ project.clientName }}</span>
            </div>
          </div>

          <!-- Budget teaser (if set) -->
          <div v-if="project.budget" class="mt-6 bg-go-bg border border-go-border-subtle rounded-go-md px-3 py-2.5">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-0.5">Presupuesto</span>
            <span class="font-display font-bold text-lg tabular-nums text-go-text">{{ formatPrice(project.budget) }}</span>
          </div>

          <!-- Timeline if available -->
          <div v-if="project.startDate || project.estimatedEndDate" class="mt-4 text-sm text-go-text-tertiary">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ project.startDate ? formatDate(project.startDate) : '—' }}
            →
            {{ project.estimatedEndDate ? formatDate(project.estimatedEndDate) : '—' }}
          </div>

          <!-- Divider -->
          <div class="border-t border-go-border my-6"></div>

          <!-- CTA -->
          <p class="text-go-text-secondary text-sm mb-4">Unite como cliente para ver el detalle completo de gastos, pagos y el estado financiero de tu obra.</p>
          <button
            @click="handleJoin"
            :disabled="isJoining"
            class="btn-primary inline-flex items-center gap-2 w-full justify-center"
          >
            <span v-if="isJoining" class="w-4 h-4 border-2 border-go-primary-on border-t-transparent rounded-full animate-spin"></span>
            <MdiGoogle v-else class="text-lg" />
            Unirme como cliente
          </button>
          <p v-if="joinError" class="text-go-danger text-xs mt-2">{{ joinError }}</p>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <footer class="mt-12 py-6 border-t border-go-border-subtle text-center text-go-text-muted text-xs">
      Generado por <span class="font-display">gasto<span class="text-go-text-tertiary">obra</span></span>
    </footer>
  </div>
</template>

<script setup>
import MdiSun from '~icons/mdi/white-balance-sunny';
import MdiMoon from '~icons/mdi/moon-waning-crescent';
import MdiGoogle from '~icons/mdi/google';

const { isDark, toggle: toggleTheme } = useTheme();
import { useProjectStore } from '~/stores/project';
import { signInWithGoogle, getCurrentUserAsync } from '~/utils/firebase';
import { formatDate, formatPrice } from '~/utils';

definePageMeta({
  layout: 'landing'
});

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const isLoading = ref(true);
const isJoining = ref(false);
const project = ref(null);
const projectId = ref(null);
const joinError = ref(null);

useHead({
  title: computed(() => project.value?.name || 'Vista de Proyecto')
});

const statusLabel = computed(() => {
  if (!project.value) return '';
  switch (project.value.status) {
    case 'active': return 'Activo';
    case 'paused': return 'Pausado';
    case 'completed': return 'Completado';
    default: return project.value.status;
  }
});

const statusClasses = computed(() => {
  if (!project.value) return '';
  switch (project.value.status) {
    case 'active': return 'bg-go-secondary/20 text-go-secondary';
    case 'paused': return 'bg-go-warning/20 text-go-warning';
    case 'completed': return 'bg-go-text-muted/20 text-go-text-muted';
    default: return 'bg-go-text-muted/20 text-go-text-muted';
  }
});

async function handleJoin() {
  isJoining.value = true;
  joinError.value = null;

  try {
    // Sign in if needed
    let user = await getCurrentUserAsync();
    if (!user) {
      user = await signInWithGoogle();
    }
    if (!user) return;

    // Try to join directly — the update rule allows setting clientUserId
    // if it's currently null. If already joined, this will fail gracefully
    // (the rule also allows the current client to read).
    const result = await projectStore.joinAsClient(projectId.value, user.uid);
    if (result.success) {
      useToast('success', 'Te uniste como cliente');
      router.push(`/client/project/${projectId.value}`);
      return;
    }

    // Join failed — might be already joined, try reading the project
    const fullProject = await projectStore.fetchProject(projectId.value);
    if (fullProject?.clientUserId === user.uid) {
      router.push(`/client/project/${projectId.value}`);
      return;
    }

    joinError.value = result.error || 'Error al unirse';
  } catch (error) {
    console.error('Error joining:', error);
    joinError.value = 'Error al unirse al proyecto';
  } finally {
    isJoining.value = false;
  }
}

onMounted(async () => {
  const token = route.params.token;

  try {
    const apiBase = config.public.apiBase;
    const res = await fetch(`${apiBase}/api/project-preview/${token}`);
    if (res.ok) {
      const data = await res.json();
      projectId.value = data.id;
      project.value = data;
    }
  } catch (error) {
    console.error('Error fetching project preview:', error);
  }

  // If already signed in, try to read the project — if readable,
  // the user is a participant and we can redirect to the full view.
  if (projectId.value) {
    const user = await getCurrentUserAsync();
    if (user) {
      try {
        const fullProject = await projectStore.fetchProject(projectId.value);
        if (fullProject?.providerId === user.uid) {
          router.replace(`/projects/${projectId.value}`);
          return;
        }
        if (fullProject?.clientUserId === user.uid) {
          router.replace(`/client/project/${projectId.value}`);
          return;
        }
      } catch {
        // Not a participant — stay on preview page
      }
    }
  }

  isLoading.value = false;
});
</script>
