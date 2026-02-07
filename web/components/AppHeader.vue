<template>
  <header class="w-full bg-base border-b border-gray-700">
    <div class="max-w-5xl m-auto px-3 sm:px-6 py-3 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <span class="text-xl font-bold text-primary">Gasto Obra</span>
      </NuxtLink>

      <div v-if="user" class="flex items-center gap-3">
        <span class="text-gray-400 text-sm hidden sm:inline">{{ user.displayName || user.email }}</span>
        <button
          @click="handleSignOut"
          class="text-gray-400 hover:text-white text-sm transition-colors"
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
