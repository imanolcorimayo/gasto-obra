<script setup>
definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
await navigateTo(`/projects/${route.params.id}/items`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
