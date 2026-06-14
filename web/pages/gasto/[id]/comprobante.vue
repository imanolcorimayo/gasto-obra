<template>
  <div class="min-h-screen bg-go-bg flex flex-col items-center justify-center px-4 text-center">
    <!-- Success -->
    <template v-if="state === 'done'">
      <CasquitoHappy :size="150" />
      <h1 class="font-display font-bold text-2xl text-go-text mt-6 mb-2">¡Comprobante guardado!</h1>
      <p class="font-ui text-go-text-muted max-w-sm mb-6 leading-relaxed">
        Quedó adjunto al gasto<template v-if="title"> “{{ title }}”</template>. Ya podés cerrar esta página.
      </p>
      <img
        v-if="preview"
        :src="preview"
        alt="Comprobante"
        class="max-h-52 rounded-lg border border-go-border mb-6 object-contain"
      />
      <NuxtLink to="/" class="font-ui font-medium text-sm text-go-primary hover:underline">
        Ir a Gasto Obra
      </NuxtLink>
    </template>

    <!-- Idle / uploading -->
    <template v-else>
      <CasquitoWorking v-if="state === 'uploading'" :size="150" />
      <CasquitoNeutral v-else :size="150" />
      <h1 class="font-display font-bold text-2xl text-go-text mt-6 mb-2">Adjuntar comprobante</h1>
      <p class="font-ui text-go-text-muted max-w-sm mb-2 leading-relaxed">
        Subí la foto del comprobante de este gasto.
      </p>
      <p v-if="title" class="font-ui text-sm text-go-text mb-6">
        <span class="font-medium">{{ title }}</span><template v-if="amountFmt"> · {{ amountFmt }}</template>
      </p>
      <div v-else class="mb-6" />

      <button
        type="button"
        :disabled="state === 'uploading'"
        class="font-ui font-medium text-sm px-5 py-2.5 bg-go-primary text-go-primary-on rounded-md hover:bg-go-primary-hover transition-colors disabled:opacity-60 inline-flex items-center gap-2"
        @click="triggerInput"
      >
        <MdiCameraPlus />
        {{ state === 'uploading' ? 'Subiendo…' : 'Elegir foto' }}
      </button>
      <p class="font-ui text-xs text-go-text-muted mt-4 max-w-xs">
        Es opcional — también podés hacerlo más tarde desde la app.
      </p>

      <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onFile" />
    </template>
  </div>
</template>

<script setup lang="ts">
import MdiCameraPlus from '~icons/mdi/camera-plus';
import { getCurrentUserAsync } from '~/utils/firebase';

definePageMeta({ middleware: 'auth', layout: false });
useHead({ title: 'Adjuntar comprobante — Gasto Obra' });

const route = useRoute();
const config = useRuntimeConfig();

const expenseId = computed(() => route.params.id as string);
const title = computed(() => (route.query.t as string) || '');
const amount = computed(() => Number(route.query.a) || 0);
const amountFmt = computed(() =>
  amount.value
    ? amount.value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
    : ''
);

const state = ref<'idle' | 'uploading' | 'done'>('idle');
const preview = ref<string | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

function triggerInput() {
  inputRef.value?.click();
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  state.value = 'uploading';
  try {
    const user = await getCurrentUserAsync();
    if (!user) {
      useToast('error', 'Sesión expirada. Recargá la página.');
      state.value = 'idle';
      return;
    }
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${config.public.apiBase}/api/expenses/${expenseId.value}/receipt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      useToast('error', data.error || 'No se pudo subir el comprobante.');
      state.value = 'idle';
      return;
    }
    preview.value = data.imageUrl || URL.createObjectURL(file);
    state.value = 'done';
  } catch (err) {
    console.error('Receipt upload error:', err);
    useToast('error', 'Error de conexión.');
    state.value = 'idle';
  }
}
</script>
