<template>
  <header class="w-full bg-go-bg-elevated border-b border-go-border">
    <div class="max-w-5xl m-auto px-3 sm:px-6 py-3 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="/img/logo.png" alt="Gasto Obra" class="h-8 w-8" />
        <span class="text-xl font-bold font-display text-go-primary">gasto obra</span>
      </NuxtLink>

      <div v-if="user" class="flex items-center gap-3">
        <span class="text-go-text-secondary text-sm hidden sm:inline">{{ user.displayName || user.email }}</span>
        <button
          @click="handleSignOut"
          class="text-go-text-tertiary hover:text-go-text text-sm transition-colors"
        >
          Salir
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { getCurrentUser, signOutUser } from '~/utils/firebase';

const user = import.meta.server ? null : getCurrentUser();

async function handleSignOut() {
  await signOutUser();
  navigateTo('/');
}
</script>
