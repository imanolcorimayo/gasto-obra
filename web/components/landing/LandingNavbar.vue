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
      <div class="flex items-center gap-1 sm:gap-4">
        <NuxtLink
          to="/"
          class="nav-link hidden sm:inline-block text-sm transition-all px-3 py-1.5 rounded-go-md relative"
          :class="route.path === '/' ? 'nav-link--active text-go-text font-medium bg-go-primary/[0.07]' : 'text-go-text-secondary hover:text-go-text hover:bg-go-primary/[0.04]'"
        >
          Inicio
        </NuxtLink>
        <NuxtLink
          to="/faq"
          class="nav-link hidden sm:inline-block text-sm transition-all px-3 py-1.5 rounded-go-md relative"
          :class="route.path === '/faq' ? 'nav-link--active text-go-text font-medium bg-go-primary/[0.07]' : 'text-go-text-secondary hover:text-go-text hover:bg-go-primary/[0.04]'"
        >
          FAQ
        </NuxtLink>
        <NuxtLink
          to="/contactanos"
          class="nav-link hidden sm:inline-block text-sm transition-all px-3 py-1.5 rounded-go-md relative"
          :class="route.path === '/contactanos' ? 'nav-link--active text-go-text font-medium bg-go-primary/[0.07]' : 'text-go-text-secondary hover:text-go-text hover:bg-go-primary/[0.04]'"
        >
          Contacto
        </NuxtLink>
        <NuxtLink
          v-if="authenticated"
          to="/projects"
          class="px-4 py-2 rounded-go-md bg-go-primary text-white text-sm font-medium hover:bg-go-primary-hover transition-colors"
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
import { getCurrentUserAsync } from '~/utils/firebase'

const props = defineProps<{
  showLogin?: boolean
  loginLoading?: boolean
  isAuthenticated?: boolean
}>()

defineEmits<{
  login: []
}>()

const route = useRoute()
const scrolled = ref(false)
const authChecked = ref(false)

const authenticated = computed(() => props.isAuthenticated || authChecked.value)

onMounted(async () => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))

  // Self-detect auth when not provided by parent
  if (!props.isAuthenticated) {
    const user = await getCurrentUserAsync()
    authChecked.value = !!user
  }
})
</script>

<style scoped>
.nav-link--active::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 6px;
  right: 6px;
  height: 2px;
  background-color: var(--go-primary);
  border-radius: 2px 2px 0 0;
}
</style>
