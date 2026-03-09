<template>
  <div class="min-h-screen bg-go-bg">
    <!-- Branded mini-header -->
    <header class="bg-go-bg border-b border-go-border px-4 py-3 flex items-center justify-between">
      <NuxtLink to="/" class="font-display font-bold text-go-text">gasto<span class="text-go-primary">obra</span></NuxtLink>
      <button
        @click="toggleTheme"
        class="p-1.5 rounded-lg text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover transition-colors duration-200"
        :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      >
        <MdiSun v-if="isDark" class="text-base" />
        <MdiMoon v-else class="text-base" />
      </button>
    </header>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 class="font-display font-bold text-3xl text-go-text mb-1">Preguntas frecuentes</h1>
      <p class="text-go-text-secondary text-sm mb-8">Todo lo que necesitás saber sobre Gasto Obra.</p>

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
      <div v-else class="space-y-8">
        <section v-for="group in groupedFaq" :key="group.topic">
          <h2 class="font-display font-semibold text-lg text-go-text mb-3">{{ group.topicLabel }}</h2>
          <div class="space-y-2">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="bg-go-surface border border-go-border rounded-go-lg overflow-hidden"
            >
              <button
                @click="toggle(item.id)"
                class="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              >
                <span class="font-ui font-medium text-sm text-go-text">{{ item.question }}</span>
                <MdiChevronDown
                  class="text-go-text-muted shrink-0 transition-transform duration-200"
                  :class="{ 'rotate-180': openItems.has(item.id) }"
                />
              </button>
              <div
                v-show="openItems.has(item.id)"
                class="px-4 pb-4 text-go-text-secondary text-sm leading-relaxed faq-answer"
                v-html="item.answer"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FaqSchema } from '~/utils/odm/schemas/faqSchema'
import MdiSun from '~icons/mdi/weather-sunny'
import MdiMoon from '~icons/mdi/weather-night'
import MdiChevronDown from '~icons/mdi/chevron-down'

definePageMeta({ layout: 'landing' })
useHead({ title: 'Preguntas frecuentes — Gasto Obra' })

const { isDark, toggle: toggleTheme } = useTheme()

interface FaqItem {
  id: string
  topic: string
  topicLabel: string
  topicOrder: number
  question: string
  answer: string
  order: number
}

const isLoading = ref(true)
const error = ref(false)
const faqItems = ref<FaqItem[]>([])
const openItems = ref(new Set<string>())

const groupedFaq = computed(() => {
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

const faqSchema = new FaqSchema()

onMounted(async () => {
  try {
    const result = await faqSchema.fetchAll()
    if (result.success && result.data) {
      faqItems.value = result.data as FaqItem[]
    } else {
      error.value = true
    }
  } catch (e) {
    console.error('Error loading FAQ:', e)
    error.value = true
  } finally {
    isLoading.value = false
  }
})
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
