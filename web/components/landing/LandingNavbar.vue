<template>
  <nav
    ref="navRef"
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-go-bg/95 backdrop-blur-md border-b border-go-border-subtle' : 'bg-transparent border-b border-transparent'"
  >
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <NuxtLink to="/">
        <img src="/img/logo-horizontal.svg" alt="Gasto Obra" class="h-7" />
      </NuxtLink>
      <div class="flex items-center gap-2">
        <button
          @click="toggleTheme"
          class="p-2 rounded-lg text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover transition-colors duration-200"
          :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          :title="isDark ? 'Modo claro' : 'Modo oscuro'"
        >
          <MdiSun v-if="isDark" class="text-lg" />
          <MdiMoon v-else class="text-lg" />
        </button>
        <button
          v-if="showLogin"
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
import MdiSun from '~icons/mdi/white-balance-sunny'
import MdiMoon from '~icons/mdi/moon-waning-crescent'

defineProps<{
  showLogin?: boolean
  loginLoading?: boolean
}>()

defineEmits<{
  login: []
}>()

const { isDark, toggle: toggleTheme } = useTheme()

const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>
