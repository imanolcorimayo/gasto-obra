<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <div class="min-w-0">
          <h3 class="font-display font-semibold text-base text-go-text truncate">Detalle del movimiento</h3>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <!-- Body -->
      <div v-if="expense" class="modal-body space-y-5">
        <!-- 1. Badges -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-go-sm"
            :style="typeBadgeStyle"
          >{{ typeLabel }}</span>
          <span
            v-if="expense.scopeType === 'addition'"
            class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm"
            :style="getScopeTypeStyles('addition')"
          >Agregado</span>
          <span
            v-if="expense.source === 'whatsapp'"
            class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm bg-[#25D366]/15 text-[#25D366]"
          >WhatsApp</span>
          <span
            v-if="expense.source === 'web'"
            class="text-[11px] font-medium px-2 py-0.5 rounded-go-sm bg-go-primary/15 text-go-primary"
          >Web</span>
          <span
            v-if="!isPayment && expense.installmentPercent != null"
            class="text-[11px] font-semibold px-2 py-0.5 rounded-go-sm tabular-nums"
            :class="expense.installmentPercent >= 100 ? 'bg-go-success/15 text-go-success' : expense.installmentPercent === 0 ? 'bg-go-danger-muted text-go-danger' : 'bg-go-info/15 text-go-info'"
          >{{ expense.installmentPercent }}% pagado</span>
        </div>

        <!-- 2. Title + Amount + Date -->
        <div>
          <h4 class="font-display font-semibold text-lg text-go-text leading-tight">{{ expense.title }}</h4>
          <div class="flex items-baseline gap-3 mt-1.5">
            <span
              class="font-display font-bold text-2xl tabular-nums"
              :class="amountColorClass"
            >{{ isPayment ? '+' : '' }}{{ formatPrice(expense.amount) }}</span>
            <span class="text-xs text-go-text-muted tabular-nums">{{ formattedDate }}</span>
          </div>
        </div>

        <!-- 3. Description -->
        <p v-if="expense.description" class="text-sm text-go-text-secondary leading-relaxed">{{ expense.description }}</p>

        <!-- 4. Items breakdown -->
        <div v-if="expense.items && expense.items.length" class="border border-go-border-subtle rounded-go-md overflow-hidden">
          <div
            v-for="(item, idx) in expense.items"
            :key="idx"
            class="flex items-center justify-between px-3 py-2 text-sm"
            :class="idx > 0 ? 'border-t border-go-border-subtle' : ''"
          >
            <span class="text-go-text">{{ item.name }}</span>
            <span v-if="item.amount" class="tabular-nums text-go-text-secondary font-medium ml-3">{{ formatPrice(item.amount) }}</span>
          </div>
        </div>

        <!-- 5. Image -->
        <div v-if="expense.imageUrl" class="relative">
          <div
            v-show="thumbLoading"
            class="w-full h-48 rounded-go-md border border-go-border skeleton-shimmer bg-go-bg flex items-center justify-center"
          >
            <span class="text-xs text-go-text-muted">La imagen se está cargando...</span>
          </div>
          <img
            v-show="!thumbLoading"
            :src="expense.imageUrl"
            alt="Comprobante"
            class="w-full max-h-48 object-cover rounded-go-md border border-go-border cursor-pointer transition-opacity hover:opacity-80"
            @load="thumbLoading = false"
            @click="imageLoading = true; showImageViewer = true"
          />
        </div>

        <!-- Image viewer overlay -->
        <Teleport to="body">
          <div
            v-if="showImageViewer"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
            @click="showImageViewer = false"
          >
            <button
              class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
              @click.stop="showImageViewer = false"
            >
              <MdiClose class="text-2xl" />
            </button>
            <!-- Skeleton placeholder -->
            <div
              v-show="imageLoading"
              class="w-[80vw] sm:w-[60vw] h-[50vh] rounded-go-md flex flex-col items-center justify-center gap-3"
              style="background: rgba(255,255,255,0.08)"
              @click.stop
            >
              <svg class="animate-spin h-6 w-6 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm text-white/50">La imagen se está cargando...</span>
            </div>
            <img
              v-show="!imageLoading"
              :src="showImageViewer ? expense.imageUrl : undefined"
              alt="Comprobante"
              class="max-w-[90vw] max-h-[90vh] object-contain rounded-go-md cursor-default"
              @click.stop
              @load="imageLoading = false"
            />
          </div>
        </Teleport>

        <!-- 5b. PDF document -->
        <div v-if="expense.fileUrl">
          <a :href="expense.fileUrl" target="_blank" rel="noopener"
             class="flex items-center gap-3 border border-go-border-subtle rounded-go-md p-3 hover:bg-go-surface-alt transition-colors">
            <MdiFilePdfBox class="text-2xl text-red-500 shrink-0" />
            <div class="flex-1 min-w-0">
              <span class="text-sm font-medium text-go-text">Documento PDF</span>
              <span class="text-xs text-go-text-muted block">Toca para abrir</span>
            </div>
            <MdiOpenInNew class="text-base text-go-text-muted" />
          </a>
        </div>

        <!-- 6. Audio player -->
        <div v-if="expense.audioUrl" class="space-y-2">
          <audio
            ref="audioRef"
            :src="expense.audioUrl"
            controls
            class="w-full h-10"
            @loadedmetadata="onAudioLoaded"
          ></audio>
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-go-text-muted mr-1.5">Velocidad</span>
            <button
              v-for="rate in [1, 1.5, 2]"
              :key="rate"
              @click="setPlaybackRate(rate)"
              class="px-2.5 py-1 text-xs font-medium rounded-go-sm transition-colors"
              :class="playbackRate === rate
                ? 'bg-go-primary text-white'
                : 'bg-go-surface border border-go-border text-go-text-muted hover:text-go-text'"
            >{{ rate }}x</button>
          </div>
        </div>

        <!-- 7. Transcription -->
        <div v-if="expense.audioTranscription" class="bg-go-surface border border-go-border-subtle rounded-go-md p-3">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-1">Transcripción</span>
          <p class="text-sm text-go-text-secondary leading-relaxed">{{ expense.audioTranscription }}</p>
        </div>

        <!-- 8. Metadata grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div v-if="expense.category" class="flex items-center justify-between py-1.5 border-b border-go-border-subtle">
            <span class="text-xs text-go-text-muted">Categoría</span>
            <span class="text-sm text-go-text">{{ getCategoryLabel(expense.category, categories) }}</span>
          </div>
          <div v-if="expense.paymentMethod" class="flex items-center justify-between py-1.5 border-b border-go-border-subtle">
            <span class="text-xs text-go-text-muted">Medio de pago</span>
            <span class="text-sm text-go-text">{{ getPaymentMethodLabel(expense.paymentMethod) }}</span>
          </div>
          <div v-if="expense.vendor" class="flex items-center justify-between py-1.5 border-b border-go-border-subtle">
            <span class="text-xs text-go-text-muted">Comercio</span>
            <span class="text-sm text-go-text">{{ expense.vendor }}</span>
          </div>
          <div v-if="expense.recipientName" class="flex items-center justify-between py-1.5 border-b border-go-border-subtle sm:col-span-2">
            <span class="text-xs text-go-text-muted">Destinatario</span>
            <span class="text-sm text-go-text text-right">
              {{ expense.recipientName }}
              <span v-if="expense.recipientPlatform" class="text-go-text-muted"> · {{ expense.recipientPlatform }}</span>
              <span v-if="expense.recipientBankInfo" class="text-go-text-muted block text-xs">{{ expense.recipientBankInfo }}</span>
            </span>
          </div>
        </div>

        <!-- 9. Linked payment/expense -->
        <div v-if="linkedExpense" class="bg-go-surface border border-go-border-subtle rounded-go-md p-3">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-go-text-muted block mb-2">
            {{ expense.linkedPaymentId ? 'Pago vinculado' : 'Gasto vinculado' }}
          </span>
          <div class="flex items-center justify-between">
            <div class="min-w-0">
              <span class="text-sm text-go-text font-medium truncate block">{{ linkedExpense.title }}</span>
              <span class="text-xs text-go-text-muted tabular-nums">{{ formatPrice(linkedExpense.amount) }}</span>
            </div>
            <button
              @click="$emit('viewExpense', linkedExpense)"
              class="text-xs text-go-primary hover:underline whitespace-nowrap ml-3"
            >Ver detalle</button>
          </div>
        </div>

        <!-- 10. Original message -->
        <div v-if="expense.source === 'whatsapp' && expense.originalMessage">
          <button
            @click="showOriginal = !showOriginal"
            class="flex items-center gap-1.5 text-xs text-go-text-muted hover:text-go-text transition-colors"
          >
            <MdiChevronDown
              class="text-sm transition-transform"
              :class="showOriginal ? 'rotate-180' : ''"
            />
            Mensaje original
          </button>
          <div
            v-if="showOriginal"
            class="mt-2 bg-go-surface border border-go-border-subtle rounded-go-md p-3"
          >
            <p class="text-sm text-go-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{{ expense.originalMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer" :class="editable ? 'justify-between' : 'justify-end'">
        <button
          v-if="editable"
          @click="$emit('edit', expense)"
          class="btn-secondary text-sm flex items-center gap-1.5"
        >
          <MdiPencil class="text-base" />
          Editar
        </button>
        <button @click="$emit('close')" class="btn-secondary text-sm">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiPencil from '~icons/mdi/pencil';
import MdiChevronDown from '~icons/mdi/chevron-down';
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiOpenInNew from '~icons/mdi/open-in-new';
import { formatPrice, getCategoryLabel, getPaymentMethodLabel, getScopeTypeStyles, TRANSACTION_TYPES } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  expenses: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
});

defineEmits(['close', 'edit', 'viewExpense']);

const playbackRate = ref(1);
const audioRef = ref(null);
const showOriginal = ref(false);
const showImageViewer = ref(false);
const imageLoading = ref(true);
const thumbLoading = ref(true);

const isPayment = computed(() => props.expense?.type === 'payment');
const isProvider = computed(() => props.expense?.type === 'provider_expense');

const typeLabel = computed(() => {
  const t = TRANSACTION_TYPES.find(t => t.value === (props.expense?.type || 'expense'));
  return t ? t.label : 'Gasto';
});

const typeBadgeStyle = computed(() => {
  const t = TRANSACTION_TYPES.find(t => t.value === (props.expense?.type || 'expense'));
  const color = t ? t.color : '#FFAB40';
  return { backgroundColor: `${color}26`, color };
});

const amountColorClass = computed(() => {
  if (isPayment.value) return 'text-go-secondary';
  if (isProvider.value) return 'text-go-text-tertiary';
  return 'text-go-primary';
});

const formattedDate = computed(() => {
  if (!props.expense) return '';
  const raw = props.expense.date || props.expense.createdAt;
  if (!raw) return '';
  const date = raw.toDate ? raw.toDate() : new Date(raw);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

const linkedExpense = computed(() => {
  if (!props.expense) return null;
  if (props.expense.linkedPaymentId) return props.expenses.find(e => e.id === props.expense.linkedPaymentId);
  if (props.expense.linkedExpenseId) return props.expenses.find(e => e.id === props.expense.linkedExpenseId);
  return null;
});

// Reset state when expense changes
watch(() => props.show, (val) => {
  if (val) {
    showOriginal.value = false;
    showImageViewer.value = false;
    thumbLoading.value = true;
    imageLoading.value = true;
    playbackRate.value = 1;
  }
});

function onAudioLoaded() {
  if (audioRef.value) {
    audioRef.value.playbackRate = playbackRate.value;
  }
}

function setPlaybackRate(rate) {
  playbackRate.value = rate;
  if (audioRef.value) {
    audioRef.value.playbackRate = rate;
  }
}
</script>
