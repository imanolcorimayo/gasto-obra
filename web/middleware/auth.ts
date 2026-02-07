import { getCurrentUserAsync } from '~/utils/firebase';

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return;

  const user = await getCurrentUserAsync();

  if (user) {
    return;
  }

  return navigateTo({
    path: '/',
  });
});
