<template>
  <footer class="bg-go-bg-elevated border-t border-go-border-subtle">
    <div class="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <span class="font-display text-go-text-secondary text-sm">
        gasto<span class="text-go-primary">obra</span>
      </span>
      <nav class="flex items-center gap-4 text-xs text-go-text-muted">
        <NuxtLink to="/faq" class="hover:text-go-text-secondary transition-colors">
          Preguntas frecuentes
        </NuxtLink>
        <NuxtLink to="/privacy" class="hover:text-go-text-secondary transition-colors">
          Privacidad
        </NuxtLink>
      </nav>
      <span class="text-go-text-muted text-xs">
        &copy; {{ new Date().getFullYear() }} Gasto Obra
      </span>
    </div>
  </footer>
</template>
