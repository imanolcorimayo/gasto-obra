<template>
  <div
    v-if="visible"
    class="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-40 bg-go-bg-elevated border border-go-border rounded-lg shadow-lg p-3 flex items-center gap-3"
    role="dialog"
    aria-label="Instalar aplicación"
  >
    <img src="/img/icon-192.png" alt="" class="w-10 h-10 rounded-md flex-shrink-0" />
    <div class="flex-1 min-w-0">
      <p class="font-ui font-medium text-sm text-go-text leading-tight">
        {{ mode === 'ios' ? 'Instalá Gasto Obra' : 'Instalar como app' }}
      </p>
      <p class="font-ui text-xs text-go-text-muted mt-0.5 leading-snug">
        {{ mode === 'ios' ? 'Tocá Compartir y elegí "Añadir a pantalla de inicio".' : 'Acceso rápido desde tu pantalla de inicio.' }}
      </p>
    </div>
    <button
      v-if="mode === 'prompt'"
      type="button"
      class="font-ui font-medium text-xs px-3 py-2 bg-go-primary text-go-primary-on rounded-md hover:bg-go-primary-hover transition-colors flex-shrink-0"
      @click="install"
    >
      Instalar
    </button>
    <button
      type="button"
      aria-label="Cerrar"
      class="text-go-text-muted hover:text-go-text p-1 flex-shrink-0"
      @click="dismiss"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const DISMISS_KEY = 'go.installBannerDismissed'

const visible = ref(false)
const mode = ref<'prompt' | 'ios'>('prompt')
const deferredPrompt = ref<any>(null)

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
}

const isIOS = () => {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    && !(window as any).MSStream
}

const onBeforeInstall = (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
  mode.value = 'prompt'
  visible.value = true
}

const install = async () => {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
  visible.value = false
}

const dismiss = () => {
  visible.value = false
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {}
}

onMounted(() => {
  if (isStandalone()) return

  let dismissed = false
  try {
    const stored = localStorage.getItem(DISMISS_KEY)
    if (stored) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      dismissed = Date.now() - Number(stored) < thirtyDays
    }
  } catch {}
  if (dismissed) return

  if (isIOS()) {
    mode.value = 'ios'
    visible.value = true
    return
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstall)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
})
</script>
