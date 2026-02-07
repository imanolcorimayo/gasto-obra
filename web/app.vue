<template>
  <div>
    <NuxtLoadingIndicator color="#E67E22" :height="10" :throttle="0" :rtl="false" :continuous="true" />
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
