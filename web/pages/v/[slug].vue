<template>
  <div class="min-h-screen bg-go-bg">
    <!-- Slim header, aligned to the content column. Subtle invite lives here. -->
    <header class="border-b border-go-border-subtle">
      <div class="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
        <span class="font-display font-bold text-go-text">gasto<span class="text-go-primary">obra</span></span>
        <NuxtLink
          v-if="shareToken"
          :to="`/view/${shareToken}`"
          class="group inline-flex items-center gap-1 text-xs font-medium text-go-text-muted hover:text-go-primary transition-colors"
        >
          Ver la obra completa
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-0.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </NuxtLink>
      </div>
    </header>

    <div class="max-w-md mx-auto px-5 pt-8 pb-16" :class="{ 'reveal-on': revealed }">
      <!-- Loading -->
      <template v-if="isLoading">
        <div class="bg-go-surface border border-go-border rounded-go-xl p-8">
          <div class="h-4 w-40 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-4 mx-auto"></div>
          <div class="h-9 w-56 skeleton-shimmer bg-go-surface-alt rounded-go-md mb-6 mx-auto"></div>
          <div class="h-12 w-44 skeleton-shimmer bg-go-surface-alt rounded-go-md mx-auto"></div>
        </div>
      </template>

      <!-- Not found / expired -->
      <div v-else-if="!payload" class="text-center py-16">
        <CasquitoConfused :size="72" class="mx-auto mb-4" />
        <h2 class="font-display text-xl font-semibold text-go-text-secondary">Enlace no disponible</h2>
        <p class="text-go-text-muted text-sm mt-1">Puede ser inválido o haber vencido. Pedile uno nuevo a tu proveedor.</p>
      </div>

      <!-- ════════════ SINGLE EXPENSE ════════════ -->
      <template v-else-if="payload.kind === 'movement'">
        <section class="reveal bg-go-surface border border-go-border rounded-go-xl shadow-go-sm overflow-hidden">
          <div class="px-6 pt-6 pb-7 text-center">
            <p v-if="payload.providerName" class="text-go-text-muted text-sm">
              <span class="font-semibold text-go-text">{{ payload.providerName }}</span> te comparte un gasto de
            </p>
            <p class="font-display font-semibold text-go-text-secondary mt-0.5">
              {{ payload.project.name }}<span v-if="payload.project.tag" class="font-mono text-go-text-muted text-sm"> · #{{ payload.project.tag }}</span>
            </p>

            <p class="font-display font-bold text-[2.6rem] leading-none tabular-nums mt-6" :class="exp.type === 'payment' ? 'text-go-success' : 'text-go-text'">
              {{ exp.type === 'payment' ? '+' : '' }}{{ formatPrice(exp.amount) }}
            </p>
            <h1 class="font-display font-semibold text-lg text-go-text mt-2">{{ exp.title || (exp.type === 'payment' ? 'Pago' : 'Gasto') }}</h1>

            <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
              <span v-if="exp.category" class="inline-flex items-center gap-1.5 text-xs font-medium text-go-text-secondary bg-go-surface-alt rounded-go-sm px-2 py-1">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: catColor(exp.category) }"></span>
                <span class="capitalize">{{ exp.category }}</span>
              </span>
              <span v-if="exp.scopeType === 'addition'" class="text-xs font-semibold text-go-warning bg-go-warning-muted rounded-go-sm px-2 py-1">Adicional</span>
            </div>
          </div>

          <!-- Detail rows -->
          <dl class="border-t border-go-border-subtle divide-y divide-go-border-subtle text-sm">
            <div v-for="row in detailRows" :key="row.label" class="flex items-center justify-between gap-4 px-6 py-3">
              <dt class="text-go-text-muted">{{ row.label }}</dt>
              <dd class="text-go-text font-medium text-right">{{ row.value }}</dd>
            </div>
          </dl>

          <p v-if="exp.description" class="px-6 py-4 text-sm text-go-text-secondary border-t border-go-border-subtle">{{ exp.description }}</p>

          <!-- Receipt: thumbnail, tap to enlarge (not expanded by default) -->
          <div v-if="exp.imageUrl" class="px-6 py-5 border-t border-go-border-subtle">
            <p class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-2">Comprobante</p>
            <button class="group relative block w-full overflow-hidden rounded-go-md border border-go-border" @click="lightbox = true">
              <img :src="exp.imageUrl" alt="Comprobante" class="w-full max-h-56 object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
              <span class="absolute inset-0 flex items-end justify-end p-2">
                <span class="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-black/55 rounded-go-sm px-2 py-1 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                  Tocá para ampliar
                </span>
              </span>
            </button>
          </div>
        </section>
      </template>

      <!-- ════════════ WHOLE-OBRA SUMMARY ════════════ -->
      <template v-else>
        <section class="reveal bg-go-surface border border-go-border rounded-go-xl shadow-go-sm overflow-hidden">
          <div class="px-6 pt-6 pb-7 text-center">
            <p v-if="payload.providerName" class="text-go-text-muted text-sm">
              <span class="font-semibold text-go-text">{{ payload.providerName }}</span> te comparte cómo va
            </p>
            <h1 class="font-display font-bold text-2xl text-go-text mt-1 leading-tight">{{ payload.project.name }}</h1>
            <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1.5 text-sm">
              <span v-if="payload.project.tag" class="font-mono text-go-text-muted">#{{ payload.project.tag }}</span>
              <span v-if="payload.project.address" class="flex items-center gap-1 text-go-text-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="truncate max-w-[200px]">{{ payload.project.address }}</span>
              </span>
            </div>

            <div class="mt-7">
              <p class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">{{ balance.label }}</p>
              <p class="font-display font-bold text-[2.6rem] leading-none tabular-nums mt-1.5" :class="balance.color">
                {{ formatPrice(displayBalance) }}
              </p>
              <p class="text-xs text-go-text-muted mt-2">estado actual de la obra</p>
            </div>
          </div>

          <div class="grid grid-cols-2 border-t border-go-border-subtle divide-x divide-go-border-subtle">
            <div class="px-5 py-4 text-center">
              <p class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-1">Gastos de la obra</p>
              <p class="font-display font-semibold text-lg tabular-nums text-go-text">{{ formatPrice(obra.totalExpenses) }}</p>
              <p class="text-[11px] text-go-text-muted mt-0.5">{{ obra.count }} {{ obra.count === 1 ? 'movimiento' : 'movimientos' }}</p>
            </div>
            <div class="px-5 py-4 text-center">
              <p class="text-xs font-semibold uppercase tracking-wider text-go-text-muted mb-1">Tus pagos</p>
              <p class="font-display font-semibold text-lg tabular-nums text-go-success">{{ formatPrice(obra.totalPayments) }}</p>
              <p class="text-[11px] text-go-text-muted mt-0.5">lo que aportaste</p>
            </div>
          </div>
        </section>

        <!-- Progressive disclosure -->
        <div class="reveal mt-3 bg-go-surface border border-go-border rounded-go-xl overflow-hidden">
          <div v-if="categories.length">
            <button class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-go-surface-hover transition-colors" @click="openCat = !openCat">
              <span class="text-sm font-semibold text-go-text-secondary">Por categoría</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted transition-transform duration-300" :class="{ 'rotate-180': openCat }"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="grid transition-[grid-template-rows] duration-300 ease-out" :class="openCat ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
              <div class="overflow-hidden">
                <div class="px-5 pb-5 space-y-3">
                  <div v-for="c in categories" :key="c.name">
                    <div class="flex items-center justify-between text-sm mb-1">
                      <span class="text-go-text-secondary capitalize">{{ c.name }}</span>
                      <span class="tabular-nums text-go-text">{{ formatPrice(c.amount) }}</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-go-surface-alt overflow-hidden">
                      <div class="h-full rounded-full" :style="{ width: c.pct + '%', backgroundColor: catColor(c.name) }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div :class="categories.length ? 'border-t border-go-border-subtle' : ''">
            <button class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-go-surface-hover transition-colors" @click="openMov = !openMov">
              <span class="text-sm font-semibold text-go-text-secondary">Últimos movimientos</span>
              <span class="flex items-center gap-2">
                <span class="text-xs text-go-text-muted tabular-nums">{{ shownCount }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-go-text-muted transition-transform duration-300" :class="{ 'rotate-180': openMov }"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="grid transition-[grid-template-rows] duration-300 ease-out" :class="openMov ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
              <div class="overflow-hidden">
                <div v-if="movements.length" class="divide-y divide-go-border-subtle">
                  <div v-for="(m, i) in movements" :key="i" class="flex items-center justify-between gap-3 px-5 py-3">
                    <div class="min-w-0">
                      <p class="text-sm text-go-text truncate">{{ m.title || (m.type === 'payment' ? 'Pago' : 'Gasto') }}</p>
                      <p class="text-xs text-go-text-muted">{{ m.date ? formatDate(m.date) : '' }}<span v-if="m.vendor"> · {{ m.vendor }}</span></p>
                    </div>
                    <span class="text-sm font-semibold tabular-nums whitespace-nowrap" :class="m.type === 'payment' ? 'text-go-success' : 'text-go-text'">
                      {{ m.type === 'payment' ? '+' : '' }}{{ formatPrice(m.amount) }}
                    </span>
                  </div>
                </div>
                <p v-else class="px-5 pb-5 text-sm text-go-text-muted">Todavía no hay movimientos.</p>
                <p v-if="payload.movementsTotal > movements.length" class="px-5 py-3 text-center text-xs text-go-text-muted border-t border-go-border-subtle">
                  Mostrando los últimos {{ movements.length }} de {{ payload.movementsTotal }}. Verlos todos en la obra completa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <footer class="py-6 border-t border-go-border-subtle text-center text-go-text-muted text-xs">
      Generado por <span class="font-display">gasto<span class="text-go-text-tertiary">obra</span></span>
    </footer>

    <!-- Image lightbox -->
    <Transition name="fade">
      <div v-if="lightbox" class="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" @click="lightbox = false">
        <button class="absolute top-4 right-4 text-white/80 hover:text-white" @click="lightbox = false" aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img :src="exp?.imageUrl" alt="Comprobante" class="max-w-full max-h-[88vh] rounded-go-md object-contain" @click.stop />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { formatPrice, formatDate } from '~/utils';

definePageMeta({ layout: 'landing' });

const config = useRuntimeConfig();
const route = useRoute();

const isLoading = ref(true);
const payload = ref(null);
const openCat = ref(false);
const openMov = ref(false);
const lightbox = ref(false);
const revealed = ref(false);

const shareToken = computed(() => payload.value?.project?.shareToken || null);

// ── single expense ──
const exp = computed(() => payload.value?.expense || null);
const PAY_LABEL = { transferencia: 'Transferencia', efectivo: 'Efectivo', tarjeta: 'Tarjeta', mercadopago: 'Mercado Pago' };
const detailRows = computed(() => {
  const e = exp.value;
  if (!e) return [];
  return [
    e.date && { label: 'Fecha', value: formatDate(e.date) },
    e.vendor && { label: 'Proveedor', value: e.vendor },
    e.recipient && { label: 'Para', value: e.recipient },
    e.paymentMethod && { label: 'Pago', value: PAY_LABEL[e.paymentMethod] || e.paymentMethod },
  ].filter(Boolean);
});

// ── whole-obra summary ──
const obra = computed(() => payload.value?.obra || null);
const movements = computed(() => payload.value?.movements || []);
const shownCount = computed(() => movements.value.length);

const balance = computed(() => {
  const b = obra.value?.balance ?? 0;
  if (b > 0) return { label: 'A tu favor', color: 'text-go-success' };
  if (b < 0) return { label: 'Saldo a pagar', color: 'text-go-text' };
  return { label: 'Al día', color: 'text-go-text-secondary' };
});
const displayBalance = computed(() => Math.abs(obra.value?.balance ?? 0));

const categories = computed(() => {
  const by = obra.value?.byCategory || {};
  const rows = Object.entries(by).map(([name, amount]) => ({ name, amount }));
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return rows.sort((a, b) => b.amount - a.amount).map((r) => ({ ...r, pct: Math.round((r.amount / max) * 100) }));
});

const CAT_TOKEN = {
  materiales: '--go-cat-materiales', herramientas: '--go-cat-herramientas', transporte: '--go-cat-transporte',
  'mano de obra': '--go-cat-mano-de-obra', comida: '--go-cat-comida', otros: '--go-cat-otros',
};
const catColor = (name) => `var(${CAT_TOKEN[name?.toLowerCase()] || '--go-cat-otros'})`;

onMounted(async () => {
  try {
    const res = await fetch(`${config.public.apiBase}/api/snapshot/${route.params.slug}`);
    if (res.ok) payload.value = (await res.json()).payload || null;
  } catch (e) {
    console.error('Error fetching snapshot:', e);
  } finally {
    isLoading.value = false;
    await nextTick();
    requestAnimationFrame(() => { revealed.value = true; });
  }
});

useHead({ title: 'Resumen de obra — Gasto Obra' });
</script>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.reveal-on .reveal { opacity: 1; transform: none; }
.reveal-on .reveal:nth-child(2) { transition-delay: 90ms; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
</style>
