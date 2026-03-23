<template>
  <section class="relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-go-primary/[0.04] rounded-full blur-[120px] pointer-events-none"></div>

    <div class="max-w-2xl mx-auto px-5 pt-20 sm:pt-24 pb-12 w-full">

      <!-- ── Authenticated: dashboard redirect ── -->
      <div v-if="isAuthenticated" ref="heroTextRef" class="text-center landing-fade-up mb-8">
        <button
          @click="$emit('dashboard')"
          :disabled="isLoading"
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97]"
        >
          <template v-if="!isLoading">Ir al dashboard</template>
          <span v-else class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Cargando...
          </span>
        </button>
      </div>

      <!-- ── Demo Panel ── -->
      <div ref="heroDemoRef" class="landing-fade-up">
        <div
          ref="demoPanelRef"
          class="bg-go-surface border border-go-border rounded-go-xl shadow-go-lg overflow-hidden transition-shadow duration-500"
          :class="{ 'demo-highlight': demoHighlight }"
        >

          <!-- Demo badge header -->
          <div class="px-4 py-2.5 border-b border-go-border-subtle flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-go-success opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-go-success"></span>
            </span>
            <span class="text-[11px] font-semibold text-go-text-muted tracking-wider uppercase">Probalo gratis</span>
            <span v-if="remaining !== null && !isRateLimited" class="ml-auto text-[11px] text-go-text-muted tabular-nums">
              {{ remaining }}/5
            </span>
          </div>

          <!-- Content -->
          <div class="p-5 sm:p-6">

            <!-- ═══ RESULT STATE ═══ -->
            <div v-if="result" class="demo-result">
              <!-- Transaction type badge -->
              <div v-if="transactionLabel" class="mb-3 demo-field" style="--field-delay: 0ms">
                <span class="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-go-sm bg-go-info/15 text-go-info">
                  {{ transactionLabel }}
                </span>
              </div>

              <!-- Transcription (audio) -->
              <p v-if="result.transcription" class="text-go-text-tertiary text-sm italic mb-3 demo-field" style="--field-delay: 50ms">
                "{{ result.transcription }}"
              </p>

              <!-- Title -->
              <h3 v-if="result.title" class="font-display font-semibold text-go-text text-lg leading-snug demo-field" style="--field-delay: 100ms">
                {{ result.title }}
              </h3>

              <!-- Total amount -->
              <p class="font-display font-bold text-3xl tabular-nums text-go-primary mt-1 mb-4 demo-field" style="--field-delay: 150ms">
                {{ formatPrice(result.totalAmount) }}
              </p>

              <!-- Metadata chips -->
              <div class="flex flex-wrap gap-2 mb-4 demo-field" style="--field-delay: 200ms">
                <span v-if="categoryInfo" class="inline-flex items-center gap-1.5 text-xs bg-go-bg border border-go-border-subtle rounded-go-md px-2 py-1">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="categoryInfo.dotClass"></span>
                  {{ categoryInfo.label }}
                </span>
                <span v-if="result.vendor" class="inline-flex items-center gap-1.5 text-xs bg-go-bg border border-go-border-subtle rounded-go-md px-2 py-1">
                  <MdiStoreOutline class="w-3 h-3 text-go-text-muted" />
                  {{ result.vendor }}
                </span>
                <span v-if="result.paymentMethod" class="inline-flex items-center gap-1.5 text-xs bg-go-bg border border-go-border-subtle rounded-go-md px-2 py-1">
                  <MdiCreditCardOutline class="w-3 h-3 text-go-text-muted" />
                  {{ paymentLabel }}
                </span>
              </div>

              <!-- Items table -->
              <div v-if="result.items && result.items.length > 1" class="border border-go-border-subtle rounded-go-md overflow-hidden mb-4 demo-field" style="--field-delay: 250ms">
                <button class="w-full px-3 py-2 bg-go-bg/50 flex items-center justify-between text-left" @click="showAllItems = !showAllItems">
                  <span class="text-xs font-medium text-go-text-secondary">{{ result.items.length }} items detectados</span>
                  <MdiChevronDown class="w-4 h-4 text-go-text-muted transition-transform duration-200" :class="{ 'rotate-180': showAllItems }" />
                </button>
                <Transition name="items-expand">
                  <div v-show="showAllItems || result.items.length <= 3">
                    <div v-for="(item, i) in result.items" :key="i" class="px-3 py-1.5 flex justify-between items-center text-sm border-t border-go-border-subtle">
                      <span class="text-go-text-secondary truncate mr-3">{{ item.name }}</span>
                      <span class="tabular-nums text-go-text font-medium whitespace-nowrap">{{ formatPrice(item.amount) }}</span>
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Warnings -->
              <div v-for="(w, i) in warnings" :key="i" class="bg-amber-50 border border-amber-200 rounded-go-md px-3 py-2 flex items-start gap-2 mb-4 demo-field" style="--field-delay: 300ms">
                <MdiAlertCircleOutline class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p class="text-xs text-amber-800 leading-relaxed">{{ w.message }}</p>
              </div>

              <!-- Result actions -->
              <div class="pt-4 border-t border-go-border-subtle demo-field" style="--field-delay: 350ms">
                <!-- Rate limited: prominent signup -->
                <div v-if="isRateLimited && !isAuthenticated" class="text-center">
                  <p class="text-go-text-muted text-xs mb-3">Alcanzaste el límite de pruebas</p>
                  <button @click="$emit('login')" class="inline-flex items-center gap-2.5 text-sm px-6 py-2.5 rounded-go-lg font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97] transition-all">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Empezar con Google
                  </button>
                </div>

                <!-- Has remaining: signup CTA + smaller try again -->
                <div v-else class="flex items-center gap-3">
                  <button v-if="!isAuthenticated" @click="$emit('login')" class="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-go-lg font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97] transition-all">
                    Registrate gratis
                    <MdiArrowRight class="w-3.5 h-3.5" />
                  </button>
                  <button @click="reset" class="text-xs text-go-text-muted hover:text-go-text transition-colors flex items-center gap-1 ml-auto">
                    <MdiRefresh class="w-3.5 h-3.5" />
                    Probar otro gasto
                  </button>
                </div>
              </div>

              <!-- Post-result Casquito hint (first result only) -->
              <div v-if="isFirstResult && !isRateLimited" class="flex items-center gap-3 mt-5 pt-4 border-t border-go-border-subtle demo-field" style="--field-delay: 450ms">
                <CasquitoHappy :size="36" class="shrink-0" />
                <p class="text-sm text-go-text-secondary">{{ postResultHint }}</p>
              </div>

              <!-- Contextual type hint (when result is payment or provider_expense) -->
              <div v-if="showTypeHint && !isRateLimited" class="flex items-start gap-3 mt-4 pt-3 border-t border-go-border-subtle demo-field" style="--field-delay: 500ms">
                <CasquitoNeutral :size="32" class="shrink-0 mt-0.5" />
                <p class="text-xs text-go-text-muted leading-relaxed">
                  {{ typeHintText }}
                  <a href="#tipos-de-registro" class="text-go-primary hover:underline font-medium" @click.prevent="scrollToTypes">Ver tipos de registro</a>
                </p>
              </div>
            </div>

            <!-- ═══ LOADING STATE ═══ -->
            <div v-else-if="isParsing" class="flex flex-col items-center py-8">
              <CasquitoWorking :size="64" class="mb-4" />
              <p class="text-go-text-muted text-sm font-medium mb-4">Analizando...</p>
              <div class="w-full max-w-sm space-y-2.5">
                <div class="h-5 w-3/5 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
                <div class="h-9 w-2/5 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
                <div class="flex gap-2">
                  <div class="h-6 w-20 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
                  <div class="h-6 w-24 skeleton-shimmer bg-go-surface-alt rounded-go-md"></div>
                </div>
              </div>
            </div>

            <!-- ═══ ERROR STATE ═══ -->
            <div v-else-if="error && !isRateLimited" class="flex flex-col items-center py-8">
              <CasquitoConfused :size="64" class="mb-4" />
              <p class="text-go-text text-sm font-medium text-center mb-1">{{ error }}</p>
              <button @click="resetError" class="text-sm text-go-primary hover:text-go-primary-hover transition-colors mt-3 flex items-center gap-1">
                <MdiRefresh class="w-4 h-4" />
                Intentar de nuevo
              </button>
            </div>

            <!-- ═══ RATE LIMITED STATE ═══ -->
            <div v-else-if="isRateLimited" class="flex flex-col items-center py-8">
              <CasquitoAlert :size="64" class="mb-4" />
              <p class="text-go-text font-display font-semibold text-base mb-1">Límite de pruebas alcanzado</p>
              <p class="text-go-text-muted text-sm mb-5">Registrate para usar sin límites.</p>
              <button @click="$emit('login')" class="inline-flex items-center gap-2.5 text-sm px-6 py-2.5 rounded-go-lg font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97] transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Empezar con Google
              </button>
            </div>

            <!-- ═══ INPUT STATE ═══ -->
            <template v-else>
              <!-- Casquito instruction -->
              <div class="flex items-center gap-3 mb-5">
                <CasquitoNeutral :size="36" class="shrink-0" />
                <p class="text-sm text-go-text-secondary">Escribí un gasto como lo harías por WhatsApp</p>
              </div>

              <!-- Mode switcher -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <button
                  v-for="(m, i) in modes"
                  :key="m.id"
                  @click="switchMode(m.id)"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-go-lg text-sm font-medium transition-all duration-200"
                  :class="[
                    inputMode === m.id
                      ? 'bg-go-primary/10 text-go-primary border border-go-primary/25'
                      : 'bg-go-bg text-go-text-muted border border-go-border hover:text-go-text-secondary hover:border-go-border',
                    !hasInteracted && highlightedMode === i ? 'mode-shimmer' : ''
                  ]"
                >
                  <component :is="m.icon" class="w-4.5 h-4.5" />
                  <span class="hidden sm:inline">{{ m.label }}</span>
                  <span class="sm:hidden">{{ m.shortLabel }}</span>
                </button>
              </div>

              <!-- Text mode -->
              <div v-if="inputMode === 'text'">
                <textarea
                  ref="textareaRef"
                  v-model="textInput"
                  :placeholder="currentPlaceholder"
                  @keydown.enter.exact.prevent="handleTextSubmit"
                  rows="3"
                  class="w-full resize-none bg-go-bg border rounded-go-lg px-4 py-3 text-sm text-go-text placeholder-go-text-muted/60 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  :class="emptyShake ? 'border-go-danger/50 shake-x' : 'border-go-border'"
                ></textarea>
                <p v-if="emptyShake" class="text-go-danger text-xs mt-1.5 ml-1">Escribí algo para analizar</p>
                <button
                  @click="handleTextSubmit"
                  class="mt-3 w-full py-3 rounded-go-lg text-sm font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.98] transition-all shadow-go-md"
                  :class="{ 'shake-x': emptyShake }"
                >
                  Analizar gasto
                </button>
              </div>

              <!-- File mode -->
              <div v-else-if="inputMode === 'file'">
                <div
                  v-if="!selectedFile"
                  class="border-2 border-dashed border-go-border rounded-go-lg py-10 px-6 text-center cursor-pointer hover:border-go-primary/40 hover:bg-go-primary/[0.02] transition-colors"
                  @click="fileInputRef?.click()"
                  @drop.prevent="handleDrop"
                  @dragover.prevent="isDragging = true"
                  @dragleave="isDragging = false"
                  :class="{ 'border-go-primary/40 bg-go-primary/[0.02]': isDragging }"
                >
                  <MdiFileImageOutline class="w-10 h-10 text-go-text-muted/40 mx-auto mb-3" />
                  <p class="text-sm text-go-text-secondary font-medium">Arrastrá una imagen o PDF</p>
                  <p class="text-xs text-go-text-muted mt-1">JPG, PNG, WebP o PDF</p>
                </div>
                <div v-else class="flex items-center gap-3 bg-go-bg border border-go-border rounded-go-lg p-3">
                  <img v-if="filePreviewUrl" :src="filePreviewUrl" class="w-14 h-14 rounded-go-sm object-cover border border-go-border-subtle" />
                  <div v-else class="w-14 h-14 rounded-go-sm bg-go-danger/10 flex items-center justify-center">
                    <MdiFilePdfBox class="w-7 h-7 text-go-danger" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-go-text font-medium truncate">{{ selectedFile.name }}</p>
                    <p class="text-xs text-go-text-muted">{{ formatFileSize(selectedFile.size) }}</p>
                  </div>
                  <button @click="clearFile" class="w-7 h-7 flex items-center justify-center rounded-full text-go-text-muted hover:text-go-text hover:bg-go-bg transition-colors">
                    <MdiClose class="w-4 h-4" />
                  </button>
                </div>
                <button
                  v-if="selectedFile"
                  @click="submitFile"
                  class="mt-3 w-full py-3 rounded-go-lg text-sm font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.98] transition-all shadow-go-md"
                >
                  Analizar archivo
                </button>
                <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="hidden" @change="handleFileSelect" />
              </div>

              <!-- Audio mode -->
              <div v-else-if="inputMode === 'audio'">
                <div v-if="isRecording" class="bg-go-bg border border-go-danger/20 rounded-go-lg p-6">
                  <div class="flex items-end justify-center gap-[3px] h-14 mb-5">
                    <div v-for="(level, i) in audioLevels" :key="i" class="w-[3px] rounded-full bg-go-danger/80 transition-[height] duration-75" :style="{ height: Math.max(8, level * 100) + '%' }"></div>
                  </div>
                  <div class="flex items-center justify-between">
                    <button @click="cancelRecording" class="text-xs text-go-text-muted hover:text-go-text transition-colors">Cancelar</button>
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-go-danger animate-pulse"></span>
                      <span class="text-sm font-medium text-go-text tabular-nums">{{ formatTime(recordingTime) }}</span>
                    </div>
                    <button @click="stopRecording" class="text-sm font-semibold text-go-primary hover:text-go-primary-hover transition-colors">Enviar audio</button>
                  </div>
                </div>
                <div v-else class="flex flex-col items-center py-8">
                  <button @click="startRecording" class="group w-18 h-18 rounded-full bg-go-danger/10 border-2 border-go-danger/20 flex items-center justify-center hover:bg-go-danger/15 hover:border-go-danger/40 active:scale-95 transition-all">
                    <MdiMicrophone class="w-8 h-8 text-go-danger group-hover:scale-110 transition-transform" />
                  </button>
                  <p class="text-xs text-go-text-muted mt-3">Tocá para grabar un gasto</p>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Subtle after-demo note -->
        <p v-if="result && !isAuthenticated" class="text-center text-go-text-muted text-xs mt-3 demo-field" style="--field-delay: 500ms">
          En la app real, esto se registra automáticamente por WhatsApp.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import MdiMessageTextOutline from '~icons/mdi/message-text-outline';
import MdiFileImageOutline from '~icons/mdi/file-image-outline';
import MdiMicrophone from '~icons/mdi/microphone';
import MdiClose from '~icons/mdi/close';
import MdiAlertCircleOutline from '~icons/mdi/alert-circle-outline';
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiRefresh from '~icons/mdi/refresh';
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiStoreOutline from '~icons/mdi/store-outline';
import MdiCreditCardOutline from '~icons/mdi/credit-card-outline';
import MdiArrowRight from '~icons/mdi/arrow-right';
import { formatPrice } from '~/utils';

defineProps({
  isAuthenticated: Boolean,
  isLoading: Boolean
});

defineEmits(['login', 'dashboard']);

const config = useRuntimeConfig();

// ── Core state ──
const inputMode = ref('text');
const textInput = ref('');
const isParsing = ref(false);
const result = ref(null);
const warnings = ref([]);
const remaining = ref(null);
const error = ref(null);
const isRateLimited = ref(false);
const emptyShake = ref(false);
const isFirstResult = ref(true);
const resultCount = ref(0);
const firstResultMode = ref(null);

// ── File state ──
const selectedFile = ref(null);
const filePreviewUrl = ref(null);
const fileInputRef = ref(null);
const isDragging = ref(false);

// ── Audio state ──
const isRecording = ref(false);
const recordingTime = ref(0);
const mediaRecorderRef = ref(null);
const audioChunksRef = ref([]);
const audioStreamRef = ref(null);
const analyserRef = ref(null);
const audioContextRef = ref(null);
const audioLevels = ref(Array(20).fill(0.08));
let recordingTimer = null;
let animFrameId = null;

// ── Placeholder rotation ──
const placeholders = [
  '500 clavos ferretería López',
  'pagué 28 mil de pintura',
  '3 bolsas cemento y 2 de arena',
  '1500 caños en efectivo',
  'me pagaron 50000 por transferencia',
];
const placeholderIndex = ref(0);
const currentPlaceholder = computed(() => placeholders[placeholderIndex.value]);
let placeholderTimer = null;

// ── Items expansion ──
const showAllItems = ref(false);

// ── Refs ──
const heroTextRef = ref(null);
const heroDemoRef = ref(null);
const demoPanelRef = ref(null);
const textareaRef = ref(null);
const demoHighlight = ref(false);

// ── Mode definitions ──
const modes = [
  { id: 'text', icon: MdiMessageTextOutline, label: 'Texto', shortLabel: 'Texto' },
  { id: 'file', icon: MdiFileImageOutline, label: 'Foto / PDF', shortLabel: 'Foto' },
  { id: 'audio', icon: MdiMicrophone, label: 'Audio', shortLabel: 'Audio' },
];

// ── Mode highlight cycling ──
const hasInteracted = ref(false);
const highlightedMode = ref(-1);
let highlightTimer = null;

// ── Category & transaction maps ──
const CATEGORY_MAP = {
  materiales: { label: 'Materiales', dotClass: 'bg-go-cat-materiales' },
  herramientas: { label: 'Herramientas', dotClass: 'bg-go-cat-herramientas' },
  transporte: { label: 'Transporte', dotClass: 'bg-go-cat-transporte' },
  'mano de obra': { label: 'Mano de obra', dotClass: 'bg-go-cat-mano-de-obra' },
  comida: { label: 'Comida', dotClass: 'bg-go-cat-comida' },
  otros: { label: 'Otros', dotClass: 'bg-go-cat-otros' },
};

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercadopago: 'MercadoPago',
};

const TRANSACTION_LABELS = {
  payment: 'Pago recibido',
  provider_expense: 'Gasto propio',
};

// ── Computed ──
const categoryInfo = computed(() => {
  if (!result.value?.category) return null;
  const key = result.value.category.toLowerCase();
  return CATEGORY_MAP[key] || { label: result.value.category, dotClass: 'bg-go-cat-otros' };
});

const paymentLabel = computed(() => {
  if (!result.value?.paymentMethod) return null;
  return PAYMENT_LABELS[result.value.paymentMethod] || result.value.paymentMethod;
});

const transactionLabel = computed(() => {
  if (!result.value?.transactionType) return null;
  return TRANSACTION_LABELS[result.value.transactionType] || null;
});

// ── Post-result hints ──
const MODE_SUGGESTIONS = {
  text: 'Probá ahora con una foto o un audio',
  file: 'Probá ahora con texto o un audio',
  audio: 'Probá ahora con texto o una foto',
};

const postResultHint = computed(() => {
  return MODE_SUGGESTIONS[firstResultMode.value] || MODE_SUGGESTIONS.text;
});

const showTypeHint = computed(() => {
  if (!result.value) return false;
  const type = result.value.transactionType;
  return type === 'payment' || type === 'provider_expense';
});

const typeHintText = computed(() => {
  const type = result.value?.transactionType;
  if (type === 'payment') return 'Detectamos un pago — también podés registrar gastos y gastos propios. ';
  if (type === 'provider_expense') return 'Detectamos un gasto propio — también funciona con gastos de obra y pagos. ';
  return '';
});

// ── Lifecycle ──
onMounted(async () => {
  placeholderTimer = setInterval(() => {
    placeholderIndex.value = (placeholderIndex.value + 1) % placeholders.length;
  }, 3500);

  [heroTextRef, heroDemoRef].forEach((ref) => {
    if (ref.value) {
      setTimeout(() => ref.value?.classList.add('is-visible'), 100);
    }
  });

  // Cycle highlight through mode buttons
  let cycleIndex = 0;
  highlightTimer = setInterval(() => {
    if (hasInteracted.value) { clearInterval(highlightTimer); highlightedMode.value = -1; return; }
    highlightedMode.value = cycleIndex % 3;
    cycleIndex++;
  }, 2000);

  // Check remaining demo uses
  try {
    const res = await fetch(`${config.public.apiBase}/api/demo-parse/status`);
    if (res.ok) {
      const data = await res.json();
      remaining.value = data.remaining;
      if (data.remaining <= 0) {
        isRateLimited.value = true;
      }
    }
  } catch {}
});

onUnmounted(() => {
  clearInterval(placeholderTimer);
  clearInterval(highlightTimer);
  cleanupAudio();
});

// ── Scroll to types section ──
function scrollToTypes() {
  const el = document.getElementById('tipos-de-registro');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Focus demo ──
function focusDemo() {
  hasInteracted.value = true;
  if (demoPanelRef.value) {
    demoPanelRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  demoHighlight.value = true;
  setTimeout(() => { demoHighlight.value = false; }, 1200);
  setTimeout(() => {
    if (inputMode.value === 'text') textareaRef.value?.focus();
  }, 400);
}

// ── Rate limit ──
function setRateLimited() {
  isRateLimited.value = true;
  remaining.value = 0;
}

// ── Mode switching ──
function switchMode(mode) {
  hasInteracted.value = true;
  if (isRecording.value) cancelRecording();
  if (inputMode.value === 'file') clearFile();
  inputMode.value = mode;
  if (mode === 'text') {
    nextTick(() => textareaRef.value?.focus());
  }
}

// ── API ──
async function submitDemo(body) {
  isParsing.value = true;
  error.value = null;

  try {
    const res = await fetch(`${config.public.apiBase}/api/demo-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 429) {
        setRateLimited();
        return;
      }
      error.value = data.error || 'Error al procesar';
      return;
    }

    result.value = data.parsed;
    warnings.value = data.warnings || [];
    remaining.value = data.remaining;
    showAllItems.value = false;
    resultCount.value++;
    isFirstResult.value = resultCount.value === 1;
    if (isFirstResult.value) firstResultMode.value = inputMode.value;

    if (data.remaining <= 0) {
      setRateLimited();
    }
  } catch {
    error.value = 'Error de conexión. Intentá de nuevo.';
  } finally {
    isParsing.value = false;
  }
}

// ── Text submit ──
function handleTextSubmit() {
  hasInteracted.value = true;
  const text = textInput.value.trim();
  if (!text) {
    emptyShake.value = true;
    setTimeout(() => { emptyShake.value = false; }, 600);
    return;
  }
  submitDemo({ type: 'text', text });
}

// ── File handling ──
function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) setFile(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file) setFile(file);
}

function setFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    error.value = 'Formato no soportado. Usá JPG, PNG, WebP o PDF.';
    return;
  }
  selectedFile.value = file;
  if (file.type.startsWith('image/')) {
    filePreviewUrl.value = URL.createObjectURL(file);
  } else {
    filePreviewUrl.value = null;
  }
}

function clearFile() {
  if (filePreviewUrl.value) {
    URL.revokeObjectURL(filePreviewUrl.value);
    filePreviewUrl.value = null;
  }
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function submitFile() {
  if (!selectedFile.value) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    const type = selectedFile.value.type === 'application/pdf' ? 'pdf' : 'image';
    submitDemo({ type, base64, mimeType: selectedFile.value.type });
  };
  reader.readAsDataURL(selectedFile.value);
}

// ── Audio recording ──
function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const types = ['audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || null;
}

async function startRecording() {
  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    error.value = 'Tu navegador no soporta grabación de audio.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.value = stream;

    const ctx = new AudioContext();
    audioContextRef.value = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.value = analyser;

    const recorder = new MediaRecorder(stream, { mimeType });
    audioChunksRef.value = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.value.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.value = recorder;
    isRecording.value = true;
    recordingTime.value = 0;

    recordingTimer = setInterval(() => recordingTime.value++, 1000);
    updateLevels();
  } catch {
    error.value = 'No se pudo acceder al micrófono.';
  }
}

function updateLevels() {
  if (!analyserRef.value || !isRecording.value) return;
  const buf = new Uint8Array(analyserRef.value.frequencyBinCount);
  analyserRef.value.getByteFrequencyData(buf);
  const levels = [];
  const count = 20;
  const step = Math.max(1, Math.floor(buf.length / count));
  for (let i = 0; i < count; i++) {
    levels.push(Math.max(0.08, (buf[i * step] || 0) / 255));
  }
  audioLevels.value = levels;
  animFrameId = requestAnimationFrame(updateLevels);
}

function stopRecording() {
  if (!mediaRecorderRef.value || mediaRecorderRef.value.state !== 'recording') return;
  clearInterval(recordingTimer);
  isRecording.value = false;

  mediaRecorderRef.value.onstop = () => {
    const blob = new Blob(audioChunksRef.value, { type: mediaRecorderRef.value.mimeType });
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      submitDemo({ type: 'audio', base64, mimeType: blob.type || 'audio/webm' });
    };
    reader.readAsDataURL(blob);
    cleanupAudio();
  };

  mediaRecorderRef.value.stop();
}

function cancelRecording() {
  clearInterval(recordingTimer);
  isRecording.value = false;
  if (mediaRecorderRef.value && mediaRecorderRef.value.state === 'recording') {
    mediaRecorderRef.value.onstop = null;
    mediaRecorderRef.value.stop();
  }
  cleanupAudio();
}

function cleanupAudio() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (audioStreamRef.value) {
    audioStreamRef.value.getTracks().forEach(t => t.stop());
    audioStreamRef.value = null;
  }
  if (audioContextRef.value) {
    audioContextRef.value.close().catch(() => {});
    audioContextRef.value = null;
  }
  analyserRef.value = null;
  mediaRecorderRef.value = null;
  audioLevels.value = Array(20).fill(0.08);
}

// ── Reset ──
function reset() {
  result.value = null;
  warnings.value = [];
  error.value = null;
  textInput.value = '';
  clearFile();
  inputMode.value = 'text';
  showAllItems.value = false;
  nextTick(() => textareaRef.value?.focus());
}

function resetError() {
  error.value = null;
}

// ── Helpers ──
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
</script>

<style scoped>
/* ─── Result card reveal ─── */
.demo-result {
  animation: result-enter 0.35s ease-out;
}

@keyframes result-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Staggered field reveals ─── */
.demo-field {
  animation: field-enter 0.3s ease-out both;
  animation-delay: var(--field-delay, 0ms);
}

@keyframes field-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Items expand transition ─── */
.items-expand-enter-active,
.items-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.items-expand-enter-from,
.items-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.items-expand-enter-to,
.items-expand-leave-from {
  opacity: 1;
  max-height: 300px;
}

/* ─── Empty submit shake ─── */
.shake-x {
  animation: shake-x 0.4s ease-in-out;
}

@keyframes shake-x {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* ─── Mode button shimmer ─── */
.mode-shimmer {
  animation: mode-glow 2s ease-in-out;
}

@keyframes mode-glow {
  0% { border-color: var(--go-border); }
  30% { border-color: rgba(255, 171, 64, 0.4); background-color: rgba(255, 171, 64, 0.05); }
  100% { border-color: var(--go-border); background-color: transparent; }
}

/* ─── Demo panel highlight ─── */
.demo-highlight {
  animation: demo-pulse 1.2s ease-out;
}

@keyframes demo-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0.4); }
  40% { box-shadow: 0 0 0 8px rgba(255, 171, 64, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0); }
}

/* ─── Respect reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .demo-result,
  .demo-field,
  .demo-highlight,
  .mode-shimmer,
  .shake-x {
    animation: none;
  }
}
</style>
