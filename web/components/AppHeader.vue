<template>
  <header class="w-full bg-go-bg/90 backdrop-blur-sm border-b border-go-border sticky top-0 z-40">
    <div class="max-w-7xl m-auto px-3 sm:px-6 py-3 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <img src="/img/logo.png" alt="Gasto Obra" class="h-10 w-10" />
        <span class="font-display font-bold text-lg tracking-tight"><span class="text-go-text">gasto</span><span class="text-go-primary ml-0.5">obra</span></span>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <template v-if="user">
          <div class="flex items-center gap-2">
            <span class="bg-go-surface border border-go-border rounded-full w-8 h-8 flex items-center justify-center text-go-text-secondary text-sm font-medium shrink-0">
              {{ userInitial }}
            </span>
            <span class="text-go-text-secondary text-sm hidden sm:inline">{{ user.displayName || user.email }}</span>
          </div>
          <button
            @click="handleSignOut"
            class="text-go-text-muted hover:text-go-danger transition-colors p-1"
            title="Salir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { getCurrentUser, signOutUser } from '~/utils/firebase';
const user = import.meta.server ? null : getCurrentUser();

const userInitial = computed(() => {
  if (!user) return '';
  const name = user.displayName || user.email || '';
  return name.charAt(0).toUpperCase();
});

async function handleSignOut() {
  await signOutUser();
  navigateTo('/');
}
</script>
