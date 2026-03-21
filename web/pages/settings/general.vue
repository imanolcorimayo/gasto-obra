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
      <p class="text-go-text-muted text-sm mt-1">Tu perfil, porcentaje de gestión y cuenta de WhatsApp.</p>
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

    <template v-else>
      <!-- ═══ Section 1: Perfil ═══ -->
      <div>
        <div class="mb-6">
          <h2 class="font-display font-bold text-xl text-go-text">Perfil</h2>
          <p class="text-go-text-muted text-sm mt-1">Información de tu empresa o actividad profesional.</p>
        </div>

        <div class="bg-go-surface border border-go-border rounded-go-xl p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Nombre completo</label>
              <input
                v-model="profileForm.displayName"
                type="text"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Email</label>
              <div class="cursor-not-allowed">
                <input
                  :value="providerStore.email"
                  type="email"
                  disabled
                  class="w-full bg-go-surface-alt border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text-muted pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Razón social</label>
              <input
                v-model="profileForm.businessName"
                type="text"
                placeholder="Opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder:text-go-text-muted/50 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">CUIT / CUIL</label>
              <input
                v-model="profileForm.cuit"
                type="text"
                placeholder="Opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder:text-go-text-muted/50 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Rubro</label>
              <input
                v-model="profileForm.industry"
                type="text"
                placeholder="Opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder:text-go-text-muted/50 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Contacto adicional</label>
              <input
                v-model="profileForm.additionalContact"
                type="text"
                placeholder="Opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder:text-go-text-muted/50 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
          </div>
          <div class="mt-5">
            <button
              @click="handleSaveProfile"
              :disabled="isSavingProfile || !profileDirty"
              class="btn-primary text-sm w-full sm:w-auto sm:ml-auto sm:block disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSavingProfile" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
              <template v-else>Guardar</template>
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ Section 2: Gestión ═══ -->
      <div ref="gestionSectionRef" class="mt-10 pt-8 border-t border-go-border">
        <div class="mb-6">
          <h2 class="font-display font-bold text-xl text-go-text">Gestión</h2>
          <p class="text-go-text-muted text-sm mt-1">Porcentaje que cobrás como gestión sobre compras de materiales u otros gastos de obra.</p>
        </div>

        <div
          class="bg-go-surface border border-go-border rounded-go-xl p-5"
          :class="highlightGestion ? 'heartbeat-section' : ''"
        >
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Porcentaje de gestión</label>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex w-full sm:w-auto">
              <input
                v-model.number="feePercent"
                type="number"
                min="0"
                max="100"
                step="1"
                class="w-full sm:w-24 bg-go-bg border border-go-border rounded-l-go-md px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
              <span class="bg-go-surface border border-go-border border-l-0 rounded-r-go-md px-3 py-2.5 text-go-text-muted text-sm">%</span>
            </div>
            <button
              @click="handleSaveFee"
              :disabled="isSavingFee || feePercent === providerStore.managementFeePercent"
              class="btn-primary text-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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

      <!-- ═══ Section 3: WhatsApp ═══ -->
      <div class="mt-10 pt-8 border-t border-go-border">
        <div class="mb-6">
          <h2 class="font-display font-bold text-xl text-go-text">WhatsApp</h2>
          <p class="text-go-text-muted text-sm mt-1">Vinculá tu cuenta para registrar gastos por mensaje.</p>
        </div>

        <!-- Linked state — compact single row -->
        <div v-if="linkedAccount" class="bg-go-surface border border-go-border rounded-go-xl p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="bg-go-success/20 rounded-full p-1.5 shrink-0">
                <MdiCheck class="text-go-success text-base" />
              </div>
              <div class="min-w-0">
                <span class="font-display font-semibold text-go-text text-sm">WhatsApp vinculado</span>
                <p class="text-go-text-muted text-xs truncate">
                  +{{ formatPhoneNumber(linkedAccount.phoneNumber) }}
                  <span v-if="linkedAccount.contactName"> · {{ linkedAccount.contactName }}</span>
                  <span v-if="linkedAccount.linkedAt"> · {{ formatTimestamp(linkedAccount.linkedAt) }}</span>
                </p>
              </div>
            </div>
            <a :href="whatsappUrl" target="_blank" class="btn-primary text-sm inline-flex items-center justify-center gap-2 w-full sm:w-48 sm:ml-auto shrink-0">
              <MdiWhatsapp class="text-base" />
              Abrir WhatsApp
            </a>
          </div>
          <div class="flex sm:justify-end">
            <button
              @click="handleUnlink"
              :disabled="isUnlinking"
              class="btn-danger text-sm flex items-center justify-center gap-2 w-full sm:w-48 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isUnlinking" class="btn-spinner"></span>
              <MdiLinkOff v-else class="text-base" />
              {{ isUnlinking ? 'Desvinculando...' : 'Desvincular cuenta' }}
            </button>
          </div>
        </div>

        <!-- Not linked state -->
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
      </div>
    </template>
  </div>
</template>

<script setup>
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiLinkOff from '~icons/mdi/link-off';
import MdiCheck from '~icons/mdi/check';
import { useWhatsappStore } from '~/stores/whatsapp';
import { useProviderStore } from '~/stores/provider';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'General'
});

const route = useRoute();
const whatsappStore = useWhatsappStore();
const providerStore = useProviderStore();
const { linkedAccount, pendingCode, isLoading, isGenerating } = storeToRefs(whatsappStore);

const gestionSectionRef = ref(null);
const highlightGestion = ref(false);

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

// Profile form
const profileForm = reactive({
  displayName: '',
  businessName: '',
  cuit: '',
  industry: '',
  additionalContact: ''
});
const isSavingProfile = ref(false);

const profileDirty = computed(() => {
  return profileForm.displayName !== providerStore.displayName
    || profileForm.businessName !== providerStore.businessName
    || profileForm.cuit !== providerStore.cuit
    || profileForm.industry !== providerStore.industry
    || profileForm.additionalContact !== providerStore.additionalContact;
});

async function handleSaveProfile() {
  isSavingProfile.value = true;
  try {
    const result = await providerStore.saveProfile({
      displayName: profileForm.displayName,
      businessName: profileForm.businessName,
      cuit: profileForm.cuit,
      industry: profileForm.industry,
      additionalContact: profileForm.additionalContact
    });
    if (result.success) {
      useToast('success', 'Perfil guardado');
    } else {
      useToast('error', result.error || 'Error al guardar el perfil');
    }
  } finally {
    isSavingProfile.value = false;
  }
}

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
    const result = await providerStore.saveManagementFee(val);
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
  await Promise.all([
    whatsappStore.fetchLinkedAccount(),
    providerStore.fetchOrCreate()
  ]);
  feePercent.value = providerStore.managementFeePercent;

  // Populate profile form from store
  profileForm.displayName = providerStore.displayName;
  profileForm.businessName = providerStore.businessName;
  profileForm.cuit = providerStore.cuit;
  profileForm.industry = providerStore.industry;
  profileForm.additionalContact = providerStore.additionalContact;

  // If there's a valid pending code, show waiting state
  const pendingResult = await whatsappStore.fetchPendingCode();
  if (pendingResult.success) {
    waitingConfirmation.value = true;
  }

  whatsappStore.subscribeToChanges();

  // Handle ?highlight=gestion query param
  if (route.query.highlight === 'gestion') {
    await nextTick();
    gestionSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightGestion.value = true;
    setTimeout(() => { highlightGestion.value = false; }, 2000);
  }
});

onUnmounted(() => {
  whatsappStore.unsubscribe();
});
</script>

<style scoped>
.heartbeat-section {
  animation: heartbeat-section 2s ease-in-out;
}

@keyframes heartbeat-section {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 92, 13, 0); }
  10% { transform: scale(1.02); box-shadow: 0 0 0 4px rgba(163, 92, 13, 0.2); }
  20% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 92, 13, 0); }
  30% { transform: scale(1.02); box-shadow: 0 0 0 4px rgba(163, 92, 13, 0.2); }
  40% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 92, 13, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 92, 13, 0); }
}
</style>
