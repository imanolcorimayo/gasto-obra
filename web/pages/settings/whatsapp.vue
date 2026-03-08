<template>
  <div>
    <!-- Settings Sub-Nav -->
    <div class="flex gap-2 border-b border-go-border pb-3 mb-8">
      <NuxtLink to="/settings/whatsapp" class="text-sm px-3 py-1.5 rounded-go-md transition-colors bg-go-surface-alt text-go-text">
        WhatsApp
      </NuxtLink>
      <NuxtLink to="/settings/categories" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        Categorías
      </NuxtLink>
      <NuxtLink to="/settings/recipients" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        Destinatarios
      </NuxtLink>
      <NuxtLink to="/settings/vendors" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
        Comercios
      </NuxtLink>
    </div>

    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="font-display font-bold text-2xl text-go-text">WhatsApp</h1>
      <p class="text-go-text-muted text-sm mt-1">Vinculá tu número para registrar gastos y recibir resúmenes diarios.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-go-surface border border-go-border rounded-go-xl p-6">
      <div class="flex flex-col items-center justify-center py-8 gap-4">
        <div class="w-10 h-10 border-2 border-go-primary border-t-transparent rounded-full animate-spin"></div>
        <div class="w-full max-w-xs mx-auto space-y-3">
          <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-12 w-full"></div>
          <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-8 w-3/4 mx-auto"></div>
          <div class="skeleton-shimmer bg-go-surface-alt rounded-go-md h-8 w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>

    <!-- Linked Successfully -->
    <div v-else-if="linkedAccount" class="space-y-4">
      <!-- Success Banner + Account Details -->
      <div class="bg-go-surface border border-go-border rounded-go-xl p-6">
        <div class="bg-go-success/10 border border-go-success/30 rounded-go-xl p-5 flex items-start gap-4">
          <div class="bg-go-success/20 rounded-full p-2 shrink-0">
            <MdiCheck class="text-go-success text-lg" />
          </div>
          <div>
            <h2 class="font-display font-semibold text-go-text">WhatsApp vinculado</h2>
            <p class="text-go-text-muted text-sm mt-0.5">
              +{{ formatPhoneNumber(linkedAccount.phoneNumber) }}
              <span v-if="linkedAccount.contactName"> · {{ linkedAccount.contactName }}</span>
            </p>
          </div>
        </div>

        <!-- Account Details -->
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Teléfono</span>
            <span class="text-sm text-go-text font-mono">+{{ formatPhoneNumber(linkedAccount.phoneNumber) }}</span>
          </div>
          <div v-if="linkedAccount.contactName">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Contacto</span>
            <span class="text-sm text-go-text">{{ linkedAccount.contactName }}</span>
          </div>
          <div v-if="linkedAccount.linkedAt">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Vinculado</span>
            <span class="text-sm text-go-text">{{ linkedAccount.linkedAt }}</span>
          </div>
        </div>
      </div>

      <!-- How to Use -->
      <div class="bg-go-surface border border-go-border rounded-go-xl p-4">
        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-3">Formato de mensaje</h3>
        <div class="space-y-2">
          <code class="block font-mono text-sm text-go-primary bg-go-bg border border-go-border-subtle rounded-go-md px-3 py-2">$500 Clavos #flores3b</code>
          <code class="block font-mono text-sm text-go-primary bg-go-bg border border-go-border-subtle rounded-go-md px-3 py-2">$1200 Viaje ferretería #flores3b</code>
          <code class="block font-mono text-sm text-go-primary bg-go-bg border border-go-border-subtle rounded-go-md px-3 py-2">Foto de ticket + caption #flores3b</code>
        </div>
        <p class="text-go-text-muted text-xs mt-3">Formato: <span class="font-mono text-go-primary">$monto concepto #tag</span></p>
      </div>

      <!-- Unlink -->
      <div class="flex justify-end">
        <button
          @click="handleUnlink"
          :disabled="isUnlinking"
          class="btn-danger text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isUnlinking" class="btn-spinner"></span>
          <MdiLinkOff v-else class="text-base" />
          {{ isUnlinking ? 'Desvinculando...' : 'Desvincular cuenta' }}
        </button>
      </div>
    </div>

    <!-- Not Linked -->
    <div v-else>
      <!-- Pending Code -->
      <div v-if="pendingCode" class="bg-go-surface border border-go-border rounded-go-xl p-6 max-w-lg mx-auto">
        <!-- Step Indicator -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">1 · Generá el código</span>
          <span class="text-go-text-muted">→</span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-go-primary">2 · Envialo por WhatsApp</span>
        </div>

        <!-- Code Display Box -->
        <div class="bg-go-bg border border-go-border rounded-go-xl px-6 py-5 text-center my-6">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-2">Tu código de vinculación</span>
          <div class="font-display font-bold text-3xl tracking-[0.2em] text-go-primary">
            VINCULAR {{ pendingCode }}
          </div>
          <button
            @click="copyCode"
            class="btn-secondary text-sm mt-3 inline-flex items-center gap-2"
          >
            <MdiContentCopy v-if="!copied" class="text-base" />
            <MdiCheck v-else class="text-go-success text-base" />
            {{ copied ? 'Copiado' : 'Copiar código' }}
          </button>
        </div>

        <!-- Instructions Panel -->
        <div class="bg-go-bg border border-go-border-subtle rounded-go-xl p-4 text-sm text-go-text-secondary leading-relaxed">
          <ol class="space-y-2.5">
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">1.</span>
              <span>Copiá el código de arriba</span>
            </li>
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">2.</span>
              <span>Abrí WhatsApp y buscá el contacto de <strong class="text-go-text font-medium">Gasto Obra</strong></span>
            </li>
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">3.</span>
              <span>Enviá el mensaje <span class="font-mono text-go-primary">VINCULAR {{ pendingCode }}</span></span>
            </li>
          </ol>
        </div>

        <!-- Expiry Countdown -->
        <p class="text-go-warning text-xs text-center mt-4 flex items-center justify-center gap-1.5">
          <MdiAlert class="text-sm" />
          Expira en {{ timeRemaining }}
        </p>

        <!-- Regenerate -->
        <button
          @click="generateCode"
          :disabled="isGenerating"
          class="mt-3 text-go-text-muted text-sm hover:text-go-text underline block mx-auto"
        >
          Generar nuevo código
        </button>
      </div>

      <!-- Initial State: Not linked, no pending code -->
      <div v-else class="bg-go-surface border border-go-border rounded-go-xl p-6 max-w-lg mx-auto text-center">
        <!-- WhatsApp Chat Bubble Icon -->
        <div class="flex justify-center mb-5">
          <svg class="w-12 h-12 text-go-primary/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.98 3.8 13.46 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 13.98C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.6C10.27 9.48 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/>
          </svg>
        </div>

        <h2 class="font-display font-semibold text-xl text-go-text">Vinculá tu WhatsApp</h2>
        <p class="text-go-text-muted text-sm mt-2 mb-6 leading-relaxed">
          Conectá tu número para registrar gastos enviando mensajes por WhatsApp.
          <br>
          Recibí resúmenes diarios automáticos de cada obra.
        </p>

        <button
          @click="generateCode"
          :disabled="isGenerating"
          class="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span v-if="isGenerating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <MdiQrcode v-else />
          Generar código de vinculación
        </button>

        <!-- How it works -->
        <div class="mt-6 pt-5 border-t border-go-border-subtle text-left">
          <h3 class="text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-3">Cómo funciona</h3>
          <ol class="space-y-2 text-go-text-secondary text-sm">
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">1.</span>
              <span>Generá un código desde acá</span>
            </li>
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">2.</span>
              <span>Envialo al WhatsApp de Gasto Obra</span>
            </li>
            <li class="flex gap-2.5">
              <span class="text-go-primary font-semibold shrink-0">3.</span>
              <span>Registrá gastos con <span class="font-mono text-go-primary">$500 Clavos #tag</span></span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiLinkOff from '~icons/mdi/link-off';
import MdiQrcode from '~icons/mdi/qrcode';
import MdiContentCopy from '~icons/mdi/content-copy';
import MdiCheck from '~icons/mdi/check';
import MdiRefresh from '~icons/mdi/refresh';
import MdiInformation from '~icons/mdi/information';
import MdiAlert from '~icons/mdi/alert';
import { useWhatsappStore } from '~/stores/whatsapp';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'WhatsApp'
});

const whatsappStore = useWhatsappStore();
const { linkedAccount, pendingCode, codeExpiresAt, isLoading, isGenerating } = storeToRefs(whatsappStore);

const timeRemaining = ref('10:00');
const copied = ref(false);
const isUnlinking = ref(false);
let countdownInterval = null;

async function generateCode() {
  const result = await whatsappStore.generateCode();

  if (result.success) {
    startCountdown();
    useToast('success', 'Codigo generado');
  } else {
    useToast('error', result.error || 'Error al generar el codigo');
  }
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    if (!codeExpiresAt.value) {
      clearInterval(countdownInterval);
      return;
    }

    const now = new Date();
    const diff = codeExpiresAt.value.getTime() - now.getTime();

    if (diff <= 0) {
      whatsappStore.clearPendingCode();
      timeRemaining.value = '00:00';
      clearInterval(countdownInterval);
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timeRemaining.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

async function copyCode() {
  if (!pendingCode.value) return;

  try {
    await navigator.clipboard.writeText(`VINCULAR ${pendingCode.value}`);
    copied.value = true;
    useToast('success', 'Codigo copiado');
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    useToast('error', 'Error al copiar');
  }
}

async function handleUnlink() {
  if (!confirm('Estas seguro de desvincular tu WhatsApp?')) return;

  isUnlinking.value = true;
  try {
    const success = await whatsappStore.unlinkAccount();
    if (success) {
      useToast('success', 'Cuenta desvinculada');
    } else {
      useToast('error', whatsappStore.error || 'Error al desvincular');
    }
  } finally {
    isUnlinking.value = false;
  }
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
}

onMounted(async () => {
  await whatsappStore.fetchLinkedAccount();

  const pendingResult = await whatsappStore.fetchPendingCode();
  if (pendingResult.success) {
    startCountdown();
  }

  whatsappStore.subscribeToChanges();
});

onUnmounted(() => {
  whatsappStore.unsubscribe();
  if (countdownInterval) clearInterval(countdownInterval);
});
</script>
