export default defineNuxtPlugin((nuxtApp) => {
  const pwa = (nuxtApp.$pwa as any) || null;
  if (!pwa) return;

  let triggered = false;
  watch(
    () => pwa.needRefresh,
    async (needRefresh) => {
      if (!needRefresh || triggered) return;
      triggered = true;
      useToast('info', 'Actualizando a la última versión...');
      await new Promise((r) => setTimeout(r, 1200));
      await pwa.updateServiceWorker(true);
    },
    { immediate: true }
  );
});
