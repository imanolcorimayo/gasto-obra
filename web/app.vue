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
  script: [
    {
      children: `(function(){try{var t=localStorage.getItem('go-theme')||'light';if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()`,
      type: 'text/javascript',
    },
  ],
});

// Default SEO meta for all pages (overridden per-page where needed)
useSeoMeta({
  description: 'Gasto Obra - Control de gastos de obra desde WhatsApp.',
  ogSiteName: 'Gasto Obra',
  ogLocale: 'es_AR',
});

// Initialize theme composable to keep singleton in sync
useTheme();
</script>
