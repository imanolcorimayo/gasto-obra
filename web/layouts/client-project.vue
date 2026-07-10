<template>
  <div class="min-h-screen lg:h-screen bg-go-bg flex lg:grid lg:grid-cols-[220px_1fr] lg:overflow-hidden">
    <!-- Desktop sidebar -->
    <aside class="hidden lg:flex flex-col bg-go-bg-elevated border-r border-go-border-subtle">
      <!-- Brand -->
      <div class="px-4 pt-4 pb-3 border-b border-go-border-subtle">
        <div class="font-display font-extrabold text-[17px] text-go-primary tracking-tight leading-none">gastoobra</div>
      </div>

      <!-- Back to projects list -->
      <NuxtLink
        to="/client"
        class="px-4 py-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-go-text-secondary hover:text-go-primary hover:bg-go-surface-hover border-b border-go-border-subtle transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        Mis obras
      </NuxtLink>

      <!-- Primary nav -->
      <nav class="flex flex-col gap-0.5 p-2.5">
        <NuxtLink
          v-for="item in sidebarNavItems"
          :key="item.key"
          :to="item.to"
          class="sidebar-nav-link"
          :class="{ 'sidebar-nav-link-active': isActive(item.key) }"
        >
          <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- Active obra -->
      <div v-if="activeObra" class="mt-auto px-4 py-3 border-t border-go-border-subtle">
        <div class="text-[10.5px] font-bold text-go-text-muted tracking-wider uppercase mb-1.5">Obra</div>
        <div class="font-bold text-[13px] text-go-text truncate">{{ activeObra.name }}</div>
        <div class="text-[11px] text-go-text-muted font-mono">#{{ activeObra.tag }}</div>
      </div>

      <!-- User / sign out -->
      <div v-if="user" class="px-3 py-3 border-t border-go-border-subtle flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-full bg-go-surface border border-go-border flex items-center justify-center text-go-text-secondary text-sm font-semibold shrink-0">
          {{ userInitial }}
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-[12px] font-semibold text-go-text truncate">{{ user.displayName || user.email }}</div>
        </div>
        <button
          @click="handleSignOut"
          class="text-go-text-muted hover:text-go-danger transition-colors p-1"
          title="Salir"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <main class="flex-1 min-w-0 flex flex-col pb-[68px] lg:pb-0 lg:overflow-y-auto">
      <slot />
    </main>

    <!-- Mobile bottom nav -->
    <nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-go-bg-elevated border-t border-go-border-subtle grid grid-cols-3 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]">
      <NuxtLink
        v-for="item in navItems"
        :key="item.key"
        :to="item.to"
        class="bottom-nav-link"
        :class="{ 'bottom-nav-link-active': isActive(item.key) }"
      >
        <component :is="item.icon" class="w-5 h-5" :stroke-width="isActive(item.key) ? 2.3 : 1.8" />
        <span class="text-[10.5px] tracking-wide" :class="isActive(item.key) ? 'font-bold' : 'font-medium'">{{ item.label }}</span>
      </NuxtLink>
      <button class="bottom-nav-link" :class="{ 'bottom-nav-link-active': showMore }" @click="showMore = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
        <span class="text-[10.5px] font-medium tracking-wide">Más</span>
      </button>
    </nav>

    <!-- Mobile "Más" sheet -->
    <ClientOnly>
      <Transition name="more-sheet">
        <div
          v-if="showMore"
          class="lg:hidden fixed inset-0 z-50 bg-go-text/45 flex flex-col justify-end"
          @click.self="showMore = false"
        >
          <div class="bg-go-bg rounded-t-[22px] px-4 pt-3 pb-7 max-h-[82%] overflow-auto">
            <div class="w-[42px] h-1 rounded-full bg-go-border mx-auto mb-3"></div>
            <div v-if="user" class="flex items-center gap-3 pb-3 mb-2 border-b border-go-border-subtle">
              <span class="w-10 h-10 rounded-full bg-go-surface border border-go-border flex items-center justify-center text-go-text-secondary font-semibold shrink-0">
                {{ userInitial }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-go-text truncate">{{ user.displayName || user.email }}</div>
                <div v-if="user.displayName" class="text-xs text-go-text-muted truncate">{{ user.email }}</div>
              </div>
            </div>
            <NuxtLink to="/client" class="more-sheet-link" @click="showMore = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7l8.7 5 8.7-5M12 22V12"/></svg>
              Mis obras
            </NuxtLink>
            <NuxtLink to="/faq" class="more-sheet-link" @click="showMore = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
              Ayuda
            </NuxtLink>
            <button class="more-sheet-link w-full text-left text-go-danger" @click="handleSignOut">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </Transition>
    </ClientOnly>
  </div>
</template>

<script setup>
import { h } from 'vue';
import { useProjectStore } from '~/stores/project';
import { getCurrentUser, signOutUser } from '~/utils/firebase';

const route = useRoute();
const projectStore = useProjectStore();
const user = import.meta.server ? null : getCurrentUser();

const showMore = ref(false);

const userInitial = computed(() => {
  if (!user) return '';
  const name = user.displayName || user.email || '';
  return name.charAt(0).toUpperCase();
});

const activeObra = computed(() => projectStore.currentProject);
const projectId = computed(() => route.params.id);

const IconHome     = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z' })]);
const IconReceipt  = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('rect', { x: 2, y: 6, width: 20, height: 12, rx: 2 }), h('circle', { cx: 12, cy: 12, r: 3 }), h('path', { d: 'M6 10v.01M18 14v.01' })]);

const navItems = computed(() => [
  { key: 'resumen', label: 'Resumen', to: `/client/project/${projectId.value}/resumen`, icon: IconHome },
  { key: 'gastos',  label: 'Gastos',  to: `/client/project/${projectId.value}/gastos`,  icon: IconReceipt },
]);

const sidebarNavItems = computed(() => {
  const items = [...navItems.value];
  const resumen = items.find(i => i.key === 'resumen');
  return resumen ? [...items.filter(i => i.key !== 'resumen'), resumen] : items;
});

function isActive(key) {
  const path = route.path;
  if (key === 'resumen') return path.endsWith('/resumen') || /\/client\/project\/[^/]+\/?$/.test(path);
  if (key === 'gastos')  return path.endsWith('/gastos');
  return false;
}

async function handleSignOut() {
  await signOutUser();
  navigateTo('/');
}

watch(() => route.path, () => { showMore.value = false; });
</script>

<style scoped>
.sidebar-nav-link {
  @apply flex items-center gap-2.5 px-2.5 py-2 rounded-go-md text-[13px] font-medium text-go-text-secondary transition-colors;
}
.sidebar-nav-link:hover {
  @apply bg-go-surface-hover text-go-text;
}
.sidebar-nav-link-active {
  @apply bg-go-primary-muted text-go-primary font-bold;
}
.sidebar-nav-link-active:hover {
  @apply bg-go-primary-muted text-go-primary;
}

.bottom-nav-link {
  @apply flex flex-col items-center gap-0.5 py-1.5 text-go-text-muted transition-colors;
}
.bottom-nav-link-active {
  @apply text-go-primary;
}

.more-sheet-link {
  @apply flex items-center gap-3 px-2 py-3 text-[14px] font-semibold text-go-text rounded-go-md transition-colors;
}
.more-sheet-link:hover {
  @apply bg-go-surface-hover;
}

.more-sheet-enter-active,
.more-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.more-sheet-enter-from,
.more-sheet-leave-to {
  opacity: 0;
}
.more-sheet-enter-active > div,
.more-sheet-leave-active > div {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.more-sheet-enter-from > div,
.more-sheet-leave-to > div {
  transform: translateY(100%);
}
</style>
