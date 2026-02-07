<template>
  <div class="w-full min-h-screen">
    <AppHeader />

    <!-- Navigation -->
    <div v-if="user" class="w-full bg-base border-b border-gray-700 mb-4">
      <div class="max-w-5xl m-auto px-0 sm:px-6">
        <nav class="flex overflow-x-auto" aria-label="Navegacion principal">
          <NuxtLink to="/projects" class="nav-tab" :class="{ 'nav-tab-active': route.path.startsWith('/projects') }">
            Proyectos
          </NuxtLink>
          <NuxtLink to="/settings/whatsapp" class="nav-tab" :class="{ 'nav-tab-active': route.path.startsWith('/settings') }">
            Configuracion
          </NuxtLink>
        </nav>
      </div>
    </div>

    <div class="flex flex-col gap-12 max-w-5xl m-auto px-3 sm:px-6">
      <main>
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <footer class="mt-12 py-6 text-center text-gray-600 text-sm">
      <p>Gasto Obra - WiseUtils</p>
    </footer>
  </div>
</template>

<script setup>
import { getCurrentUserAsync } from '~/utils/firebase';

const user = import.meta.server ? null : await getCurrentUserAsync();
const route = useRoute();
</script>

<style scoped>
.nav-tab {
  @apply py-4 px-4 text-gray-300 border-b-2 border-transparent font-medium text-sm whitespace-nowrap;
  transition: color 0.2s, border-color 0.2s;
}

.nav-tab:hover {
  @apply text-white border-gray-500;
}

.nav-tab-active {
  @apply text-primary border-primary font-semibold;
}
</style>
