<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text flex items-center gap-1.5">
            <MdiAutoFix class="text-go-primary" />
            Nuevo movimiento
          </h3>
          <p class="text-go-text-muted text-xs mt-0.5">La IA extrae los datos automáticamente</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Loading -->
        <div v-if="state === 'loading'" class="flex flex-col items-center justify-center py-12">
          <CasquitoWorking :size="120" />
          <p class="text-sm text-go-text-muted mt-4 ai-pulse">Analizando...</p>
        </div>

        <!-- Error -->
        <div v-else-if="state === 'error'" class="flex flex-col items-center justify-center py-8">
          <CasquitoConfused :size="100" />
          <p class="text-sm text-go-text text-center mt-4 max-w-[260px]">{{ errorMessage }}</p>
          <div class="flex gap-3 mt-5">
            <button type="button" @click="reset" class="btn-secondary text-sm">Volver</button>
            <button type="button" @click="handleSubmit" class="btn-primary text-sm">Reintentar</button>
          </div>
        </div>

        <!-- Manual type selector -->
        <div v-else-if="state === 'manual'" class="space-y-2">
          <p class="text-xs text-go-text-muted mb-3">¿Qué querés registrar?</p>
          <button
            v-for="t in typeOptions"
            :key="t.value"
            type="button"
            @click="$emit('skip', t.value)"
            class="w-full flex items-start gap-3 p-3 rounded-go-md border border-go-border hover:border-go-primary/40 hover:bg-go-primary/[0.03] transition-colors text-left"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" :class="t.bgClass">
              <component :is="t.icon" class="text-sm" :class="t.iconClass" />
            </div>
            <div>
              <p class="text-sm font-semibold text-go-text">{{ t.label }}</p>
              <p class="text-xs text-go-text-muted mt-0.5">{{ t.description }}</p>
            </div>
          </button>
        </div>

        <!-- Input -->
        <template v-else>
          <!-- Mode selector -->
          <div class="flex gap-1 bg-go-surface/60 p-1 rounded-go-md mb-4">
            <button
              v-for="m in modes"
              :key="m.id"
              type="button"
              @click="switchMode(m.id)"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-go-sm text-xs font-semibold transition-all duration-150"
              :class="mode === m.id
                ? 'bg-go-bg text-go-text shadow-sm ring-1 ring-go-border/50'
                : 'text-go-text-muted hover:text-go-text-secondary'"
            >
              <component :is="m.icon" class="text-base" />
              {{ m.label }}
            </button>
          </div>

          <!-- Text mode -->
          <div v-show="mode === 'text'" class="space-y-3">
            <textarea
              ref="textareaRef"
              v-model="textInput"
              placeholder="Ej: 500 clavos ferretería López"
              rows="3"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3.5 py-3 text-sm text-go-text placeholder-go-text-muted/60 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
              @keydown.enter.meta.prevent="handleSubmit"
              @keydown.enter.ctrl.prevent="handleSubmit"
            />
            <p class="text-[11px] text-go-text-muted/70 leading-relaxed">
              <span class="font-medium text-go-text-muted">Gasto:</span> "3000 cemento easy"
              · <span class="font-medium text-go-text-muted">Cobro:</span> "me pagaron 10000"
              · <span class="font-medium text-go-text-muted">Propio:</span> "gasto propio 2000 almuerzo"
            </p>
            <button
              type="button"
              :disabled="!textInput.trim()"
              @click="handleSubmit"
              class="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analizar texto
            </button>
          </div>

          <!-- Image mode -->
          <div v-show="mode === 'image'">
            <!-- Upload zone -->
            <div v-if="!imagePreview" class="relative">
              <input
                ref="imageInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                @change="handleImageSelect"
              />
              <div class="border-2 border-dashed border-go-border hover:border-go-primary/40 rounded-go-lg py-10 flex flex-col items-center gap-2.5 transition-colors">
                <div class="w-12 h-12 rounded-full bg-go-surface flex items-center justify-center">
                  <MdiCamera class="text-xl text-go-text-muted" />
                </div>
                <p class="text-sm text-go-text-secondary font-medium">Sacá una foto o elegí de la galería</p>
                <p class="text-xs text-go-text-muted">JPEG, PNG o WebP · Máx. 10MB</p>
              </div>
            </div>

            <!-- Image preview -->
            <div v-else class="space-y-3">
              <div class="relative rounded-go-md overflow-hidden bg-go-surface">
                <img :src="imagePreview" alt="Preview" class="w-full max-h-52 object-contain" />
                <button
                  type="button"
                  @click="clearFile"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <MdiClose class="text-sm" />
                </button>
              </div>
              <input
                v-model="caption"
                type="text"
                placeholder="Descripción opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
              <button
                type="button"
                @click="handleSubmit"
                class="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                Analizar imagen
              </button>
            </div>
          </div>

          <!-- PDF mode -->
          <div v-show="mode === 'pdf'">
            <!-- Upload zone -->
            <div v-if="!selectedFile" class="relative">
              <input
                ref="pdfInputRef"
                type="file"
                accept=".pdf,application/pdf"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                @change="handlePdfSelect"
              />
              <div class="border-2 border-dashed border-go-border hover:border-go-primary/40 rounded-go-lg py-10 flex flex-col items-center gap-2.5 transition-colors">
                <div class="w-12 h-12 rounded-full bg-go-surface flex items-center justify-center">
                  <MdiFilePdfBox class="text-xl text-go-text-muted" />
                </div>
                <p class="text-sm text-go-text-secondary font-medium">Subí un PDF</p>
                <p class="text-xs text-go-text-muted">Máx. 5MB · Hasta 5 páginas</p>
              </div>
            </div>

            <!-- PDF preview -->
            <div v-else class="space-y-3">
              <div class="flex items-center gap-3 bg-go-surface rounded-go-md p-3">
                <div class="w-10 h-10 rounded-go-sm bg-red-500/10 flex items-center justify-center shrink-0">
                  <MdiFilePdfBox class="text-lg text-red-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-go-text font-medium truncate">{{ selectedFile.name }}</p>
                  <p class="text-xs text-go-text-muted">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button
                  type="button"
                  @click="clearFile"
                  class="text-go-text-muted hover:text-go-text transition-colors p-1"
                >
                  <MdiClose class="text-base" />
                </button>
              </div>
              <input
                v-model="caption"
                type="text"
                placeholder="Descripción opcional"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
              <button
                type="button"
                @click="handleSubmit"
                class="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                Analizar PDF
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div v-if="state === 'input'" class="modal-footer">
        <div class="w-full flex items-center justify-between">
          <button
            type="button"
            @click="state = 'manual'"
            class="text-xs text-go-text-muted hover:text-go-text transition-colors underline underline-offset-2 decoration-go-border hover:decoration-go-text-muted"
          >
            Cargar manualmente
          </button>
          <a
            href="https://wa.me/5493513467739?text=Hola%2C%20tengo%20una%20duda%20sobre%20c%C3%B3mo%20cargar%20un%20movimiento"
            target="_blank"
            rel="noopener"
            class="text-xs text-go-text-muted hover:text-go-text transition-colors flex items-center gap-1"
          >
            <MdiWhatsapp class="text-sm" />
            Necesitás ayuda?
          </a>
        </div>
      </div>

      <!-- Footer for manual mode -->
      <div v-if="state === 'manual'" class="modal-footer justify-center">
        <button
          type="button"
          @click="state = 'input'"
          class="text-xs text-go-text-muted hover:text-go-text transition-colors underline underline-offset-2 decoration-go-border hover:decoration-go-text-muted"
        >
          Volver a carga automática
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiCamera from '~icons/mdi/camera';
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiPencil from '~icons/mdi/pencil';
import MdiImage from '~icons/mdi/image-outline';
import MdiAutoFix from '~icons/mdi/auto-fix';
import MdiWhatsapp from '~icons/mdi/whatsapp';
import MdiCurrencyUsd from '~icons/mdi/currency-usd';
import MdiCashPlus from '~icons/mdi/cash-plus';
import MdiWalletOutline from '~icons/mdi/wallet-outline';
import { getCurrentUser } from '~/utils/firebase';

const props = defineProps({
  show: { type: Boolean, default: false },
  projectId: { type: String, default: null }
});

const emit = defineEmits(['close', 'parsed', 'skip']);

const config = useRuntimeConfig();

// State
const state = ref('input'); // 'input' | 'loading' | 'error' | 'manual'
const mode = ref('text');   // 'text' | 'image' | 'pdf'
const textInput = ref('');
const caption = ref('');
const selectedFile = ref(null);
const fileBase64 = ref(null);
const fileMimeType = ref(null);
const imagePreview = ref(null);
const errorMessage = ref('');
const textareaRef = ref(null);
const imageInputRef = ref(null);
const pdfInputRef = ref(null);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 5 * 1024 * 1024;

const modes = [
  { id: 'text', label: 'Texto', icon: MdiPencil },
  { id: 'image', label: 'Foto', icon: MdiImage },
  { id: 'pdf', label: 'PDF', icon: MdiFilePdfBox }
];

const typeOptions = [
  {
    value: 'expense',
    label: 'Gasto de obra',
    description: 'Materiales, mano de obra, transporte...',
    icon: MdiCurrencyUsd,
    bgClass: 'bg-go-primary/10',
    iconClass: 'text-go-primary'
  },
  {
    value: 'payment',
    label: 'Cobro al cliente',
    description: 'Plata que recibiste del cliente',
    icon: MdiCashPlus,
    bgClass: 'bg-go-secondary/10',
    iconClass: 'text-go-secondary'
  },
  {
    value: 'provider_expense',
    label: 'Gasto propio',
    description: 'Pagaste de tu bolsillo, no se cobra al cliente',
    icon: MdiWalletOutline,
    bgClass: 'bg-go-text-muted/10',
    iconClass: 'text-go-text-muted'
  }
];

// Reset everything when modal opens/closes
watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    resetAll();
    nextTick(() => textareaRef.value?.focus());
  }
});

function switchMode(newMode) {
  mode.value = newMode;
  if (newMode === 'text') {
    nextTick(() => textareaRef.value?.focus());
  }
}

function resetAll() {
  state.value = 'input';
  mode.value = 'text';
  textInput.value = '';
  caption.value = '';
  selectedFile.value = null;
  fileBase64.value = null;
  fileMimeType.value = null;
  imagePreview.value = null;
  errorMessage.value = '';
}

function reset() {
  state.value = 'input';
  errorMessage.value = '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE) {
    errorMessage.value = `La imagen pesa ${formatFileSize(file.size)}. El máximo es 10MB.`;
    state.value = 'error';
    return;
  }

  selectedFile.value = file;
  fileMimeType.value = file.type;

  // Generate preview
  const reader = new FileReader();
  reader.onload = (e) => { imagePreview.value = e.target.result; };
  reader.readAsDataURL(file);

  // Generate base64 for API
  fileToBase64(file).then(b64 => { fileBase64.value = b64; });
}

function handlePdfSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > MAX_PDF_SIZE) {
    errorMessage.value = `El PDF pesa ${formatFileSize(file.size)}. El máximo es 5MB.`;
    state.value = 'error';
    return;
  }

  selectedFile.value = file;
  fileMimeType.value = 'application/pdf';
  fileToBase64(file).then(b64 => { fileBase64.value = b64; });
}

function clearFile() {
  selectedFile.value = null;
  fileBase64.value = null;
  fileMimeType.value = null;
  imagePreview.value = null;
  caption.value = '';
  if (imageInputRef.value) imageInputRef.value.value = '';
  if (pdfInputRef.value) pdfInputRef.value.value = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleSubmit() {
  // Validate input
  if (mode.value === 'text' && !textInput.value.trim()) return;
  if ((mode.value === 'image' || mode.value === 'pdf') && !fileBase64.value) return;

  state.value = 'loading';

  try {
    const user = getCurrentUser();
    if (!user) {
      errorMessage.value = 'Sesión expirada. Recargá la página.';
      state.value = 'error';
      return;
    }

    const token = await user.getIdToken();

    const body = { type: mode.value, projectId: props.projectId };
    if (mode.value === 'text') {
      body.text = textInput.value.trim();
    } else {
      body.base64 = fileBase64.value;
      body.mimeType = fileMimeType.value;
      if (caption.value.trim()) body.caption = caption.value.trim();
    }

    const res = await fetch(`${config.public.apiBase}/api/parse-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'No se pudo procesar. Intentá de nuevo.';
      state.value = 'error';
      return;
    }

    emit('parsed', data);
  } catch (error) {
    console.error('ParseExpense error:', error);
    errorMessage.value = 'Error de conexión. Verificá tu internet e intentá de nuevo.';
    state.value = 'error';
  }
}
</script>

<style scoped>
.ai-pulse {
  animation: ai-pulse 2s ease-in-out infinite;
}

@keyframes ai-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
