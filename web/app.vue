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
</script>
