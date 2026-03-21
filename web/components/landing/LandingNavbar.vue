<template>
  <nav
    ref="navRef"
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-go-bg/95 backdrop-blur-md border-b border-go-border-subtle' : 'bg-transparent border-b border-transparent'"
  >
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <img src="/img/logo.png" alt="Gasto Obra" class="h-10 w-10" />
        <span class="font-display font-bold text-lg tracking-tight"><span class="text-go-text">gasto</span><span class="text-go-primary ml-0.5">obra</span></span>
      </NuxtLink>
      <div class="flex items-center gap-2">
        <NuxtLink
          v-if="isAuthenticated"
          to="/projects"
          class="px-4 py-2 rounded-go-md bg-go-primary text-go-text-inverse text-sm font-medium hover:bg-go-primary-hover transition-colors"
        >
          Ir al dashboard
        </NuxtLink>
        <button
          v-else-if="showLogin"
          @click="$emit('login')"
          :disabled="loginLoading"
          class="px-4 py-2 rounded-go-md border border-go-border text-go-text-secondary text-sm font-medium hover:border-go-primary hover:text-go-primary transition-colors"
        >
          Ingresar
        </button>
        <NuxtLink
          v-else
          to="/"
          class="px-4 py-2 rounded-go-md border border-go-border text-go-text-secondary text-sm font-medium hover:border-go-primary hover:text-go-primary transition-colors"
        >
          Ingresar
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  showLogin?: boolean
  loginLoading?: boolean
  isAuthenticated?: boolean
}>()

defineEmits<{
  login: []
}>()

const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>
