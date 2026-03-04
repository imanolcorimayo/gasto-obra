<template>
  <div class="mb-8">
    <div class="flex flex-col gap-6">
      <!-- Settings Sub-Nav -->
      <div class="flex gap-2 border-b border-go-border pb-3">
        <NuxtLink to="/settings/whatsapp" class="text-sm px-3 py-1.5 rounded-go-md transition-colors" :class="'bg-go-surface-alt text-go-text'">
          WhatsApp
        </NuxtLink>
        <NuxtLink to="/settings/categories" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
          Categorias
        </NuxtLink>
        <NuxtLink to="/settings/recipients" class="text-sm px-3 py-1.5 rounded-go-md transition-colors text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover">
          Destinatarios
        </NuxtLink>
      </div>

      <!-- Header -->
      <div>
        <h1 class="text-[28px] font-bold tracking-tight">WhatsApp</h1>
        <p class="text-go-text-tertiary text-sm mt-1">Vincula tu WhatsApp para registrar gastos por mensaje</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col gap-4 skeleton-shimmer">
        <div class="h-48 w-full bg-go-surface-alt rounded-go-xl"></div>
      </div>

      <!-- Linked Account -->
      <div v-else-if="linkedAccount" class="bg-go-surface rounded-go-xl border border-go-border p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-go-success-muted flex items-center justify-center shrink-0">
            <MdiWhatsapp class="text-2xl text-go-success" />
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-go-success">Cuenta Vinculada</h2>
            <p class="text-go-text-tertiary mt-1">
              Numero: <span class="text-go-text font-mono">+{{ formatPhoneNumber(linkedAccount.phoneNumber) }}</span>
            </p>
          </div>
        </div>

        <div class="mt-6 p-4 bg-go-surface-hover rounded-go-md">
          <h3 class="font-medium mb-2">Como registrar gastos:</h3>
          <p class="text-go-text-tertiary text-sm">Envia un mensaje con el formato:</p>
          <div class="mt-3 space-y-2">
            <code class="block bg-go-surface px-3 py-2 rounded-go-sm text-sm text-go-success">$500 Clavos #flores3b</code>
            <code class="block bg-go-surface px-3 py-2 rounded-go-sm text-sm text-go-success">$1200 Viaje ferreteria #flores3b</code>
            <code class="block bg-go-surface px-3 py-2 rounded-go-sm text-sm text-go-success">Foto de ticket + caption #flores3b</code>
          </div>
        </div>

        <button
          @click="handleUnlink"
          class="mt-6 btn-danger w-full flex items-center justify-center gap-2"
        >
          <MdiLinkOff />
          Desvincular Cuenta
        </button>
      </div>

      <!-- Not Linked -->
      <div v-else class="bg-go-surface rounded-go-xl border border-go-border p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-go-surface-alt flex items-center justify-center shrink-0">
            <MdiWhatsapp class="text-2xl text-go-text-tertiary" />
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold">Vincular WhatsApp</h2>
            <p class="text-go-text-tertiary mt-1">Vincula tu numero para registrar gastos por WhatsApp.</p>
          </div>
        </div>

        <!-- Code Display -->
        <div v-if="pendingCode" class="mt-6">
          <div class="p-4 bg-go-primary/10 border border-go-primary/30 rounded-go-md">
            <p class="text-sm text-go-text mb-3">
              Envia este mensaje al numero de WhatsApp de Gasto Obra:
            </p>
            <div class="flex items-center gap-3">
              <code class="flex-1 bg-go-surface px-4 py-3 rounded-go-md text-xl font-mono text-go-primary tracking-wider">
                VINCULAR {{ pendingCode }}
              </code>
              <button
                @click="copyCode"
                class="p-3 rounded-go-md bg-go-surface-alt hover:bg-go-surface-hover transition-colors"
                title="Copiar"
              >
                <MdiContentCopy v-if="!copied" />
                <MdiCheck v-else class="text-go-success" />
              </button>
            </div>
            <p class="text-xs text-go-text-muted mt-3">
              El codigo expira en {{ timeRemaining }}
            </p>
          </div>

          <button
            @click="generateCode"
            :disabled="isGenerating"
            class="mt-4 btn-secondary w-full flex items-center justify-center gap-2"
          >
            <MdiRefresh :class="{ 'animate-spin': isGenerating }" />
            Generar Nuevo Codigo
          </button>
        </div>

        <!-- Generate Code Button -->
        <button
          v-else
          @click="generateCode"
          :disabled="isGenerating"
          class="mt-6 btn-primary w-full flex items-center justify-center gap-2"
        >
          <span v-if="isGenerating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <MdiQrcode v-else />
          Generar Codigo de Vinculacion
        </button>
      </div>

      <!-- Instructions -->
      <div class="bg-go-surface rounded-go-xl border border-go-border p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <MdiInformation class="text-go-primary" />
          Como funciona
        </h3>
        <ol class="space-y-3 text-go-text-tertiary text-sm">
          <li class="flex gap-3">
            <span class="w-6 h-6 rounded-full bg-go-primary/20 text-go-primary text-xs flex items-center justify-center shrink-0">1</span>
            <span>Genera un codigo de vinculacion desde esta pagina</span>
          </li>
          <li class="flex gap-3">
            <span class="w-6 h-6 rounded-full bg-go-primary/20 text-go-primary text-xs flex items-center justify-center shrink-0">2</span>
            <span>Envia "VINCULAR codigo" al numero de WhatsApp de Gasto Obra</span>
          </li>
          <li class="flex gap-3">
            <span class="w-6 h-6 rounded-full bg-go-primary/20 text-go-primary text-xs flex items-center justify-center shrink-0">3</span>
            <span>Registra gastos enviando "$500 Clavos #tag" por WhatsApp</span>
          </li>
        </ol>

        <div class="mt-4 p-3 bg-go-warning-muted border border-go-warning/30 rounded-go-md">
          <p class="text-go-warning text-sm flex items-start gap-2">
            <MdiAlert class="shrink-0 mt-0.5" />
            <span>El codigo expira en 10 minutos. Si no lo usas a tiempo, genera uno nuevo.</span>
          </p>
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

  const success = await whatsappStore.unlinkAccount();
  if (success) {
    useToast('success', 'Cuenta desvinculada');
  } else {
    useToast('error', whatsappStore.error || 'Error al desvincular');
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
