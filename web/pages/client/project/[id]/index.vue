<script setup>
definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
await navigateTo(`/client/project/${route.params.id}/items`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
