<template>
  <div>
    <NuxtLoadingIndicator color="var(--go-primary)" :height="3" :throttle="0" :rtl="false" :continuous="true" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
useHead({
  titleTemplate: "%s | Gasto Obra",
});

// Default SEO meta for all pages (overridden per-page where needed)
useSeoMeta({
  description: 'Gasto Obra - Gestión y control de gastos de obra, reformas y remodelaciones desde WhatsApp. Para proveedores de servicios en Argentina.',
  ogSiteName: 'Gasto Obra',
  ogLocale: 'es_AR',
});
</script>
