<template>
  <div class="w-full min-h-screen bg-go-bg flex flex-col">
    <AppHeader />

    <!-- Navigation -->
    <div v-if="user" class="w-full bg-go-bg-elevated border-b border-go-border mb-4">
      <div class="max-w-7xl m-auto px-3 sm:px-6">
        <nav class="flex overflow-x-auto" aria-label="Navegacion principal">
          <NuxtLink to="/projects" class="nav-tab" :class="{ 'nav-tab-active': route.path.startsWith('/projects') }">
            Proyectos
          </NuxtLink>
          <NuxtLink
            v-if="hasClientProjects"
            to="/client"
            class="nav-tab"
            :class="{ 'nav-tab-active': route.path.startsWith('/client') }"
          >
            Mis Obras (Cliente)
          </NuxtLink>
          <NuxtLink to="/settings/whatsapp" class="nav-tab" :class="{ 'nav-tab-active': route.path.startsWith('/settings') }">
            Configuración
          </NuxtLink>
        </nav>
      </div>
    </div>

    <div class="flex-1 flex flex-col gap-12 max-w-7xl w-full m-auto px-3 sm:px-6">
      <main>
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <footer class="mt-auto bg-go-bg border-t border-go-border-subtle py-4 text-go-text-muted text-xs">
      <div class="max-w-7xl m-auto px-3 sm:px-6 text-center">
        <p>gasto obra</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { getCurrentUserAsync } from '~/utils/firebase';
import { useProjectStore } from '~/stores/project';

const user = import.meta.server ? null : await getCurrentUserAsync();
const route = useRoute();
const projectStore = useProjectStore();

const hasClientProjects = computed(() => projectStore.clientProjects.length > 0);

onMounted(async () => {
  if (user) {
    await projectStore.fetchClientProjects(user.uid);
  }
});
</script>

<style scoped>
.nav-tab {
  @apply py-4 px-4 font-ui font-medium text-sm text-go-text-muted border-b-2 border-transparent whitespace-nowrap transition-colors duration-150;
}

.nav-tab:hover {
  @apply text-go-text;
}

.nav-tab-active {
  @apply text-go-primary border-go-primary;
}
</style>
