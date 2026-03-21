<template>
  <div class="min-h-screen bg-go-bg flex flex-col">
    <LandingNavbar />

    <!-- Spacer for fixed navbar -->
    <div class="h-16"></div>

    <div class="max-w-xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
      <h1 class="font-display font-bold text-3xl text-go-text mb-1">Contactanos</h1>
      <p class="text-go-text-secondary text-sm mb-8">Escribinos y te respondemos a la brevedad.</p>

      <!-- Success state -->
      <div v-if="sent" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-go-success/10 mb-5">
          <MdiCheckCircle class="w-8 h-8 text-go-success" />
        </div>
        <h2 class="font-display font-semibold text-xl text-go-text mb-2">Mensaje enviado</h2>
        <p class="text-go-text-secondary text-sm mb-6">Gracias por escribirnos. Te responderemos lo antes posible.</p>
        <NuxtLink to="/" class="btn-secondary text-sm px-5 py-2.5 inline-block">
          Volver al inicio
        </NuxtLink>
      </div>

      <!-- Contact form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label for="contact-name" class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">
            Nombre *
          </label>
          <input
            id="contact-name"
            v-model="form.name"
            type="text"
            required
            maxlength="100"
            placeholder="Tu nombre"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          />
        </div>

        <div>
          <label for="contact-email" class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">
            Email *
          </label>
          <input
            id="contact-email"
            v-model="form.email"
            type="email"
            required
            maxlength="254"
            placeholder="tu@email.com"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
          />
        </div>

        <div>
          <label for="contact-message" class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">
            Mensaje *
          </label>
          <textarea
            id="contact-message"
            v-model="form.message"
            required
            minlength="10"
            maxlength="2000"
            rows="5"
            placeholder="Contanos en qué podemos ayudarte..."
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-y"
          />
          <p class="text-[11px] text-go-text-muted mt-1">Mínimo 10 caracteres</p>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting || !isValid"
          class="btn-primary w-full py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="isSubmitting" class="inline-flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-go-text-inverse border-t-transparent rounded-full animate-spin"></span>
            Enviando...
          </span>
          <span v-else>Enviar mensaje</span>
        </button>
      </form>
    </div>

    <LandingFooter />
  </div>
</template>

<script setup lang="ts">
import MdiCheckCircle from '~icons/mdi/check-circle'
import { getCurrentUserAsync } from '~/utils/firebase'

definePageMeta({ layout: 'landing' })

useHead({
  title: 'Contactanos — Gasto Obra',
  link: [{ rel: 'canonical', href: 'https://gastoobra.com/contactanos' }],
})

useSeoMeta({
  description: 'Escribinos para consultas, sugerencias o soporte sobre Gasto Obra. Te respondemos a la brevedad.',
  ogTitle: 'Contactanos — Gasto Obra',
  ogDescription: 'Escribinos para consultas, sugerencias o soporte sobre Gasto Obra.',
  ogType: 'website',
  ogUrl: 'https://gastoobra.com/contactanos',
  ogImage: 'https://gastoobra.com/img/logo.png',
  twitterCard: 'summary',
  twitterTitle: 'Contactanos — Gasto Obra',
  twitterDescription: 'Escribinos para consultas, sugerencias o soporte.',
})

const config = useRuntimeConfig()

const form = reactive({
  name: '',
  email: '',
  message: '',
})

const isSubmitting = ref(false)
const sent = ref(false)

onMounted(async () => {
  const user = await getCurrentUserAsync()
  if (user) {
    if (user.email) form.email = user.email
    if (user.displayName) form.name = user.displayName
  }
})

const isValid = computed(() =>
  form.name.trim().length > 0 &&
  form.email.trim().length > 0 &&
  form.message.trim().length >= 10
)

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    const res = await fetch(`${config.public.apiBase}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      useToast('error', data.error || 'No se pudo enviar el mensaje')
      return
    }

    sent.value = true
  } catch {
    useToast('error', 'Error de conexión. Intentá de nuevo.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
