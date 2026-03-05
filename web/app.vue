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
      children: `(function(){try{var t=localStorage.getItem('go-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()`,
      type: 'text/javascript',
    },
  ],
});

// Initialize theme composable to keep singleton in sync
useTheme();
</script>
