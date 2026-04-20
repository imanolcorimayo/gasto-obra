<template>
  <div class="min-h-screen bg-go-bg flex flex-col items-center justify-center px-4 text-center">
    <CasquitoSleeping :size="160" />
    <h1 class="font-display font-bold text-2xl text-go-text mt-6 mb-2">
      Sin conexión
    </h1>
    <p class="font-ui text-go-text-muted max-w-sm mb-6 leading-relaxed">
      No pudimos conectarnos a internet. Revisá tu conexión y volvé a intentar.
    </p>
    <button
      type="button"
      class="font-ui font-medium text-sm px-4 py-2 bg-go-primary text-go-primary-on rounded-md hover:bg-go-primary-hover transition-colors"
      @click="retry"
    >
      Reintentar
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

useHead({ title: 'Sin conexión — Gasto Obra' })

const retry = () => {
  if (typeof window !== 'undefined') window.location.reload()
}
</script>
