<template>
  <div class="min-h-screen bg-go-bg flex flex-col items-center justify-center px-6 text-center">
    <CasquitoConfused v-if="isNotFound" :size="160" />
    <CasquitoAlert v-else :size="160" />

    <p
      class="font-ui font-semibold text-sm tracking-wider uppercase mt-8 mb-2"
      :style="{ color: 'var(--go-text-tertiary)' }"
    >
      Error {{ statusCode }}
    </p>

    <h1 class="font-display font-bold text-3xl sm:text-4xl text-go-text mb-3">
      {{ title }}
    </h1>

    <p class="font-ui text-go-text-muted max-w-md mb-8 leading-relaxed">
      {{ description }}
    </p>

    <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:w-auto">
      <button type="button" class="btn-primary" @click="goHome">
        Volver al inicio
      </button>
      <button v-if="!isNotFound" type="button" class="btn-secondary" @click="retry">
        Reintentar
      </button>
    </div>

    <p
      v-if="devDetails"
      class="font-ui text-xs text-go-text-tertiary mt-10 max-w-lg break-words opacity-70"
    >
      {{ devDetails }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

const statusCode = computed(() => props.error?.statusCode ?? 500)
const isNotFound = computed(() => statusCode.value === 404)

const title = computed(() => {
  if (isNotFound.value) return 'Esta página no existe'
  if (statusCode.value >= 500) return 'Algo salió mal de nuestro lado'
  return 'No pudimos cargar esta página'
})

const description = computed(() => {
  if (isNotFound.value) return 'La dirección que buscás se mudó o nunca existió. Volvé al inicio y seguimos desde ahí.'
  if (statusCode.value >= 500) return 'Tuvimos un problema procesando tu pedido. Probá de nuevo en unos segundos.'
  return props.error?.statusMessage || 'Intentá recargar o volvé al inicio.'
})

const devDetails = computed(() => {
  if (!import.meta.dev || isNotFound.value) return null
  return props.error?.statusMessage || props.error?.message || null
})

const goHome = () => {
  clearError({ redirect: '/' })
}

const retry = () => {
  if (typeof window !== 'undefined') window.location.reload()
}

useHead({ title: computed(() => `${title.value} — Gasto Obra`) })
</script>
