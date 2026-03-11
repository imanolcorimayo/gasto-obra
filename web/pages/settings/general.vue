<template>
  <div>
    <!-- Settings Sub-Nav -->
    <div class="flex gap-2 border-b border-go-border pb-3 mb-8">
      <NuxtLink to="/settings/general" class="text-sm px-3 py-1.5 rounded-go-md transition-colors bg-go-surface-alt text-go-text">
        General
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
      <h1 class="font-display font-bold text-2xl text-go-text">General</h1>
      <p class="text-go-text-muted text-sm mt-1">Configurá tu cuenta de WhatsApp y porcentaje de gestión.</p>
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
    <div v-else-if="linkedAccount" class="space-y-6">
      <!-- Success Banner -->
      <div class="bg-go-surface border border-go-success/40 rounded-go-xl p-5 flex items-start gap-4">
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

      <!-- Account Details (directly on page bg) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <span class="text-sm text-go-text">{{ formatTimestamp(linkedAccount.linkedAt) }}</span>
        </div>
      </div>

      <!-- Info: AYUDA -->
      <div class="bg-go-surface border border-go-border rounded-go-xl p-4 flex items-start gap-3">
        <MdiInformation class="text-go-primary text-lg shrink-0 mt-0.5" />
        <div>
          <p class="text-sm text-go-text-secondary">
            Para más información sobre cómo usar el bot, enviá <span class="font-mono font-semibold text-go-primary">AYUDA</span> por WhatsApp.
          </p>
          <a :href="whatsappUrl" target="_blank" class="btn-primary text-sm inline-flex items-center gap-2 mt-3">
            <MdiWhatsapp class="text-base" />
            Abrir WhatsApp
          </a>
        </div>
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
    <div v-else class="bg-go-surface border border-go-border rounded-go-xl p-6 max-w-lg mx-auto text-center">
      <!-- Waiting for confirmation after redirect -->
      <template v-if="waitingConfirmation">
        <div class="flex justify-center mb-5">
          <div class="w-12 h-12 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 class="font-display font-semibold text-xl text-go-text">Esperando confirmación...</h2>
        <p class="text-go-text-muted text-sm mt-2 mb-6 leading-relaxed">
          ¿Enviaste el mensaje en WhatsApp? La vinculación se confirmará automáticamente.
        </p>
        <button
          @click="handleLinkWhatsApp"
          :disabled="isGenerating"
          class="text-go-text-muted text-sm hover:text-go-text underline"
        >
          Reintentar
        </button>
      </template>

      <!-- Initial state -->
      <template v-else>
        <div class="flex justify-center mb-5">
          <MdiWhatsapp class="w-12 h-12 text-[#25D366]" />
        </div>
        <h2 class="font-display font-semibold text-xl text-go-text">Vinculá tu WhatsApp</h2>
        <p class="text-go-text-muted text-sm mt-2 mb-6 leading-relaxed">
          Vinculá tu cuenta de WhatsApp para registrar gastos enviando mensajes de texto, fotos de tickets o audios.
        </p>

        <!-- Bot phone not configured -->
        <div v-if="!botPhoneConfigured" class="text-go-warning text-sm">
          Número del bot no configurado. Contactá al administrador.
        </div>

        <!-- CTA button -->
        <button
          v-else
          @click="handleLinkWhatsApp"
          :disabled="isGenerating"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-go-md text-white font-semibold bg-[#25D366] hover:bg-[#20bd5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isGenerating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <MdiWhatsapp v-else class="text-lg" />
          {{ isGenerating ? 'Generando...' : 'Vincular por WhatsApp' }}
        </button>
        <p v-if="botPhoneConfigured" class="text-go-text-muted text-xs mt-3">
          Se abrirá WhatsApp con un mensaje listo para enviar
        </p>
      </template>
    </div>

    <!-- Management Fee Section -->
    <div v-if="linkedAccount" class="mt-10 pt-8 border-t border-go-border">
      <div class="mb-6">
        <h2 class="font-display font-bold text-xl text-go-text">Gestión</h2>
        <p class="text-go-text-muted text-sm mt-1">Porcentaje que cobrás como gestión sobre compras de materiales u otros gastos de obra.</p>
      </div>

      <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Porcentaje de gestión</label>
        <div class="flex items-center gap-3">
          <div class="flex">
            <input
              v-model.number="feePercent"
              type="number"
              min="0"
              max="100"
              step="1"
              class="w-24 bg-go-bg border border-go-border rounded-l-go-md px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
            <span class="bg-go-surface border border-go-border border-l-0 rounded-r-go-md px-3 py-2.5 text-go-text-muted text-sm">%</span>
          </div>
          <button
            @click="handleSaveFee"
            :disabled="isSavingFee || feePercent === whatsappStore.managementFeePercent"
            class="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSavingFee" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
            <template v-else>Guardar</template>
          </button>
        </div>
        <p class="text-xs text-go-text-muted mt-2">
          Si es mayor a 0%, al cargar un gasto podrás aplicar este porcentaje. Se incluye en el monto total.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiLinkOff from '~icons/mdi/link-off';
import MdiCheck from '~icons/mdi/check';
import MdiInformation from '~icons/mdi/information';
import { useWhatsappStore } from '~/stores/whatsapp';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'General'
});

const whatsappStore = useWhatsappStore();
const { linkedAccount, pendingCode, isLoading, isGenerating } = storeToRefs(whatsappStore);

const config = useRuntimeConfig();
const whatsappNumber = config.public.whatsappNumber;
const botPhoneConfigured = computed(() => !!(whatsappNumber || '').replace(/\D/g, ''));
const whatsappUrl = computed(() => {
  const digits = (whatsappNumber || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=AYUDA`;
});

const waitingConfirmation = ref(false);
const isUnlinking = ref(false);
const feePercent = ref(0);
const isSavingFee = ref(false);

async function handleLinkWhatsApp() {
  const result = await whatsappStore.generateCode();

  if (result.success && result.code) {
    const digits = (whatsappNumber || '').replace(/\D/g, '');
    const message = encodeURIComponent(`VINCULAR ${result.code}`);
    const url = `https://wa.me/${digits}?text=${message}`;
    window.open(url, '_blank');
    waitingConfirmation.value = true;
  } else {
    useToast('error', result.error || 'Error al generar el código');
  }
}

async function handleUnlink() {
  if (!confirm('¿Estás seguro de desvincular tu WhatsApp?')) return;

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

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function handleSaveFee() {
  const val = Math.max(0, Math.min(100, feePercent.value || 0));
  feePercent.value = val;
  isSavingFee.value = true;
  try {
    const result = await whatsappStore.saveManagementFee(val);
    if (result.success) {
      useToast('success', 'Porcentaje de gestión guardado');
    } else {
      useToast('error', result.error || 'Error al guardar');
    }
  } finally {
    isSavingFee.value = false;
  }
}

onMounted(async () => {
  await whatsappStore.fetchLinkedAccount();
  feePercent.value = whatsappStore.managementFeePercent;

  // If there's a valid pending code, show waiting state
  const pendingResult = await whatsappStore.fetchPendingCode();
  if (pendingResult.success) {
    waitingConfirmation.value = true;
  }

  whatsappStore.subscribeToChanges();
});

onUnmounted(() => {
  whatsappStore.unsubscribe();
});
</script>
