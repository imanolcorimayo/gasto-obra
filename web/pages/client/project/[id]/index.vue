<script setup>
definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
await navigateTo(`/client/project/${route.params.id}/resumen`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
