<template>
  <div class="min-h-screen bg-go-bg flex flex-col">
    <LandingNavbar />

    <!-- Spacer for fixed navbar -->
    <div class="h-16"></div>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-go-primary/[0.04] rounded-full blur-[100px] pointer-events-none"></div>

      <div class="relative max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-10 text-center">
        <div class="flex justify-center mb-5">
          <CasquitoConfused :size="140" />
        </div>
        <h1 class="font-display font-bold text-4xl sm:text-5xl text-go-text tracking-tight mb-4">
          Preguntas frecuentes
        </h1>
        <p class="text-go-text-secondary text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
          Todo lo que necesitás saber sobre cómo registrar gastos, compartir reportes con tus clientes y sacarle el máximo provecho a Gasto Obra.
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 pb-12 flex-1 w-full">

      <!-- Loading -->
      <template v-if="isLoading">
        <div v-for="i in 3" :key="i" class="mb-6">
          <div class="h-5 w-48 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-3"></div>
          <div class="space-y-2">
            <div v-for="j in 2" :key="j" class="bg-go-surface border border-go-border rounded-go-lg h-12 skeleton-shimmer"></div>
          </div>
        </div>
      </template>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-16">
        <p class="text-go-text-secondary">No se pudieron cargar las preguntas frecuentes.</p>
      </div>

      <!-- FAQ grouped by topic -->
      <div v-else class="space-y-10">
        <section v-for="group in groupedFaq" :key="group.topic">
          <h2 class="font-display font-semibold text-lg text-go-text mb-3">{{ group.topicLabel }}</h2>
          <div class="space-y-2">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="bg-go-surface border border-go-border rounded-go-lg overflow-hidden transition-shadow hover:shadow-go-sm"
            >
              <button
                @click="toggle(item.id)"
                class="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3"
              >
                <span class="font-ui font-medium text-sm text-go-text">{{ item.question }}</span>
                <MdiChevronDown
                  class="text-go-text-muted shrink-0 transition-transform duration-200"
                  :class="{ 'rotate-180': openItems.has(item.id) }"
                />
              </button>
              <div
                v-show="openItems.has(item.id)"
                class="px-5 pb-4 text-go-text-secondary text-sm leading-relaxed faq-answer"
                v-html="item.answer"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <LandingFooter />
  </div>
</template>

<script setup lang="ts">
import { FaqSchema } from '~/utils/odm/schemas/faqSchema'
import MdiChevronDown from '~icons/mdi/chevron-down'

definePageMeta({ layout: 'landing' })

useHead({
  title: 'Preguntas frecuentes — Gasto Obra',
  link: [{ rel: 'canonical', href: 'https://gastoobra.com/faq' }],
})

useSeoMeta({
  description: 'Preguntas frecuentes sobre Gasto Obra: cómo registrar gastos de obra o reforma por WhatsApp, compartir reportes con clientes, categorías de gastos y más.',
  ogTitle: 'Preguntas frecuentes — Gasto Obra',
  ogDescription: 'Dudas sobre control de gastos de obra desde WhatsApp: registro, reportes, categorías y más.',
  ogType: 'website',
  ogUrl: 'https://gastoobra.com/faq',
  ogImage: 'https://gastoobra.com/img/logo.png',
  twitterCard: 'summary',
  twitterTitle: 'Preguntas frecuentes — Gasto Obra',
  twitterDescription: 'Dudas sobre control de gastos de obra desde WhatsApp.',
})

interface FaqItem {
  id: string
  topic: string
  topicLabel: string
  topicOrder: number
  question: string
  answer: string
  order: number
}

const openItems = ref(new Set<string>())

const faqSchema = new FaqSchema()

const { data: faqItems, status, error } = await useAsyncData('faq', async () => {
  const result = await faqSchema.fetchAll()
  if (!result.success || !result.data) throw new Error('Failed to load FAQ')
  return result.data.map((item: any) => ({
    id: item.id,
    topic: item.topic,
    topicLabel: item.topicLabel,
    topicOrder: item.topicOrder,
    question: item.question,
    answer: item.answer,
    order: item.order,
  })) as FaqItem[]
})

const isLoading = computed(() => status.value === 'pending')

const groupedFaq = computed(() => {
  if (!faqItems.value) return []
  const groups = new Map<string, { topic: string; topicLabel: string; topicOrder: number; items: FaqItem[] }>()
  for (const item of faqItems.value) {
    if (!groups.has(item.topic)) {
      groups.set(item.topic, {
        topic: item.topic,
        topicLabel: item.topicLabel,
        topicOrder: item.topicOrder,
        items: [],
      })
    }
    groups.get(item.topic)!.items.push(item)
  }
  const sorted = Array.from(groups.values()).sort((a, b) => a.topicOrder - b.topicOrder)
  sorted.forEach((g) => g.items.sort((a, b) => a.order - b.order))
  return sorted
})

function toggle(id: string) {
  const next = new Set(openItems.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  openItems.value = next
}
</script>

<style scoped>
.faq-answer :deep(p) {
  margin-bottom: 0.5rem;
}
.faq-answer :deep(p:last-child) {
  margin-bottom: 0;
}
.faq-answer :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.faq-answer :deep(li) {
  margin-bottom: 0.25rem;
}
.faq-answer :deep(strong) {
  color: var(--go-text);
  font-weight: 600;
}
.faq-answer :deep(a) {
  color: var(--go-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.faq-answer :deep(a:hover) {
  opacity: 0.8;
}
.faq-answer :deep(code) {
  background: var(--go-surface-alt);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}
</style>
