<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container flex flex-col !max-h-[85vh] h-[640px]">
      <!-- Header -->
      <div class="modal-header shrink-0">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text flex items-center gap-1.5">
            <MdiAutoFix class="text-go-primary" />
            Asistente
          </h3>
          <p class="text-go-text-muted text-xs mt-0.5">El mismo asistente de WhatsApp, acá en la obra</p>
        </div>
        <div class="flex items-center gap-1">
          <button
            v-if="messages.length"
            @click="startNew"
            class="text-go-text-muted hover:text-go-text transition-colors p-1.5"
            title="Nueva conversación"
          >
            <MdiChatPlusOutline class="text-lg" />
          </button>
          <button @click="$emit('close')" class="modal-close">
            <MdiClose class="text-xl" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="logRef" class="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-go-bg">
        <!-- Greeting -->
        <div v-if="!messages.length && !busy" class="flex flex-col items-center text-center pt-6 pb-2">
          <CasquitoNeutral :size="90" />
          <p class="text-sm text-go-text-secondary mt-3 max-w-[280px]">
            Contame qué gastaste o cobraste, o mandá la foto del comprobante. Yo lo registro.
          </p>
          <div class="flex flex-wrap justify-center gap-1.5 mt-4">
            <button
              v-for="s in suggestions"
              :key="s"
              @click="input = s; inputRef?.focus()"
              class="text-xs text-go-text-secondary bg-go-surface border border-go-border rounded-full px-3 py-1.5 hover:border-go-primary/40 hover:text-go-text transition-colors"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <!-- Rolled-over marker -->
          <p v-if="m.rolledOver" class="text-center text-[11px] text-go-text-muted/70 italic py-1">
            Pasó un rato — conversación nueva
          </p>

          <!-- User bubble -->
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div class="max-w-[85%] bg-go-primary text-white rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words">
              <img v-if="m.preview" :src="m.preview" class="rounded-lg mb-1.5 max-h-40 object-contain" alt="" />
              <p v-else-if="m.attachmentName" class="text-white/85 text-xs mb-1 flex items-center gap-1">
                <MdiPaperclip class="text-sm" /> {{ m.attachmentName }}
              </p><span v-if="m.text">{{ m.text }}</span>
            </div>
          </div>

          <!-- Assistant bubble -->
          <div v-else-if="m.role === 'bot'" class="flex justify-start">
            <div
              class="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm break-words"
              :class="m.error ? 'bg-go-danger/10 text-go-danger' : 'bg-go-surface text-go-text'"
            >
              <span v-html="renderMarkdown(m.text)"></span>
              <button
                v-if="m.error && m.retry"
                @click="retryLast"
                class="block mt-1.5 text-xs font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>

          <!-- Deliverable: share code / link as its own copyable block -->
          <div v-else-if="m.role === 'deliverable'" class="flex justify-start">
            <div class="max-w-[85%] bg-go-primary-muted border border-go-primary/20 rounded-go-md px-3.5 py-2.5">
              <template v-if="m.tool === 'get_share_link'">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-go-primary mb-1">Código para tu cliente</p>
                <div class="flex items-center gap-2">
                  <code class="text-sm text-go-text font-mono break-all">{{ m.value }}</code>
                  <button @click="copyText(m.value)" class="text-go-primary hover:text-go-primary-hover p-1 shrink-0" title="Copiar">
                    <MdiContentCopy class="text-base" />
                  </button>
                </div>
              </template>
              <template v-else>
                <a
                  :href="m.viewUrl || m.value"
                  target="_blank"
                  rel="noopener"
                  class="text-sm font-semibold text-go-primary hover:text-go-primary-hover flex items-center gap-1.5"
                >
                  <MdiOpenInNew class="text-base" />
                  Ver y compartir
                </a>
              </template>
            </div>
          </div>
        </template>

        <!-- Typing -->
        <div v-if="busy" class="flex justify-start items-end gap-2">
          <div class="bg-go-surface rounded-2xl rounded-bl-md px-3.5 py-2.5">
            <span class="text-sm text-go-text-muted ai-pulse">Pensando…</span>
          </div>
        </div>

        <!-- Confirm quick replies -->
        <div v-if="pendingConfirm && !busy" class="flex gap-2 justify-start pl-1">
          <button @click="send(pendingConfirm === 'delete' ? 'Sí, borralo' : 'Sí, cerrala')" class="text-xs font-semibold bg-go-danger/10 text-go-danger rounded-full px-3.5 py-1.5 hover:bg-go-danger/20 transition-colors">
            Sí
          </button>
          <button @click="send('No')" class="text-xs font-semibold bg-go-surface text-go-text border border-go-border rounded-full px-3.5 py-1.5 hover:bg-go-surface-hover transition-colors">
            No
          </button>
        </div>
      </div>

      <!-- Composer -->
      <div class="shrink-0 border-t border-go-border-subtle px-3 py-2.5 bg-go-bg-elevated">
        <!-- Attachment chip -->
        <div v-if="attachment" class="flex items-center gap-2 bg-go-surface rounded-go-md px-2.5 py-1.5 mb-2">
          <img v-if="attachment.preview" :src="attachment.preview" class="w-8 h-8 rounded object-cover" alt="" />
          <MdiFilePdfBox v-else class="text-lg text-red-500" />
          <span class="text-xs text-go-text-secondary truncate flex-1">{{ attachment.name }}</span>
          <button @click="attachment = null" class="text-go-text-muted hover:text-go-text p-0.5">
            <MdiClose class="text-sm" />
          </button>
        </div>

        <div class="flex items-end gap-2">
          <input
            ref="fileRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            class="hidden"
            @change="handleFile"
          />
          <button
            @click="fileRef?.click()"
            class="text-go-text-muted hover:text-go-primary transition-colors p-2 shrink-0"
            title="Adjuntar comprobante"
          >
            <MdiPaperclip class="text-xl" />
          </button>
          <textarea
            ref="inputRef"
            v-model="input"
            rows="1"
            placeholder="Ej: 500 clavos ferretería López"
            class="flex-1 bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted/60 focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none max-h-28"
            @keydown.enter.exact.prevent="send()"
            @input="autoGrow"
          />
          <button
            :disabled="busy || (!input.trim() && !attachment)"
            @click="send()"
            class="bg-go-primary text-white rounded-go-md p-2.5 hover:bg-go-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Enviar"
          >
            <MdiSend class="text-lg" />
          </button>
        </div>

        <div class="flex justify-between items-center mt-1.5 px-1">
          <button
            @click="$emit('skip', 'expense')"
            class="text-[11px] text-go-text-muted hover:text-go-text transition-colors underline underline-offset-2 decoration-go-border"
          >
            Cargar manualmente
          </button>
          <span class="text-[10px] text-go-text-muted/60">Registra directo — después podés editar</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiAutoFix from '~icons/mdi/auto-fix';
import MdiSend from '~icons/mdi/send';
import MdiPaperclip from '~icons/mdi/paperclip';
import MdiFilePdfBox from '~icons/mdi/file-pdf-box';
import MdiChatPlusOutline from '~icons/mdi/chat-plus-outline';
import MdiContentCopy from '~icons/mdi/content-copy';
import MdiOpenInNew from '~icons/mdi/open-in-new';
import { getCurrentUser } from '~/utils/firebase';

const props = defineProps({
  show: { type: Boolean, default: false },
  projectId: { type: String, default: null }
});

const emit = defineEmits(['close', 'refresh', 'skip']);

const config = useRuntimeConfig();

const messages = ref([]);        // { role: 'user'|'bot'|'deliverable', ... }
const input = ref('');
const attachment = ref(null);    // { mimeType, base64, name, preview }
const busy = ref(false);
const pendingConfirm = ref(null); // 'delete' | 'close' | null
const startFresh = ref(false);   // next send opens a new server session
const lastSent = ref(null);      // for retry
const logRef = ref(null);
const inputRef = ref(null);
const fileRef = ref(null);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 5 * 1024 * 1024;

const suggestions = [
  '3000 cemento en Easy',
  'Me pagaron 50000 por transferencia',
  'Gasto propio 2000 almuerzo',
  '¿Cómo viene la obra?'
];

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) nextTick(() => { inputRef.value?.focus(); scrollDown(); });
});

function scrollDown() {
  nextTick(() => {
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight;
  });
}

function autoGrow(e) {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
}

// Escape HTML, then apply the light markdown subset the model emits.
function renderMarkdown(text = '') {
  // Quotes included: the linkifier below interpolates matched URLs into an href
  // attribute, so a stray " must never survive to break out of it.
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return escaped
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?]|$)/g, '$1<strong>$2</strong>')
    .replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline text-go-primary break-all">$1</a>')
    .replace(/\n/g, '<br>');
}

function startNew() {
  messages.value = [];
  pendingConfirm.value = null;
  startFresh.value = true;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    useToast('success', 'Copiado');
  } catch {
    useToast('error', 'No se pudo copiar');
  }
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (fileRef.value) fileRef.value.value = '';
  if (!file) return;

  const isPdf = file.type === 'application/pdf';
  const max = isPdf ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
  if (file.size > max) {
    useToast('error', `El archivo supera los ${max / 1024 / 1024}MB.`);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    attachment.value = {
      mimeType: file.type,
      base64: reader.result.split(',')[1],
      name: file.name,
      preview: isPdf ? null : reader.result
    };
  };
  reader.readAsDataURL(file);
}

async function send(overrideText = null) {
  if (busy.value) return;
  const text = (overrideText ?? input.value).trim();
  const att = overrideText ? null : attachment.value;
  if (!text && !att) return;

  pendingConfirm.value = null;
  messages.value.push({
    role: 'user',
    text,
    preview: att?.preview || null,
    attachmentName: att && !att.preview ? att.name : null
  });
  if (!overrideText) {
    input.value = '';
    attachment.value = null;
    if (inputRef.value) inputRef.value.style.height = 'auto';
  }
  scrollDown();

  const payload = {
    text,
    projectId: props.projectId,
    attachment: att ? { mimeType: att.mimeType, base64: att.base64, filename: att.name } : undefined,
    newSession: startFresh.value || undefined
  };
  lastSent.value = payload;
  await runTurn(payload);
}

async function retryLast() {
  if (!lastSent.value || busy.value) return;
  // Drop the error bubble, re-run the same payload.
  const last = messages.value[messages.value.length - 1];
  if (last?.error) messages.value.pop();
  await runTurn(lastSent.value);
}

async function runTurn(payload) {
  busy.value = true;
  scrollDown();

  try {
    const user = getCurrentUser();
    if (!user) throw new Error('auth');
    const token = await user.getIdToken();

    const res = await fetch(`${config.public.apiBase}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'server');

    startFresh.value = false;
    messages.value.push({ role: 'bot', text: data.reply, rolledOver: data.rolledOver });
    for (const d of data.deliverables || []) {
      messages.value.push({ role: 'deliverable', tool: d.tool, value: d.value, viewUrl: d.viewUrl });
    }
    pendingConfirm.value = data.confirm || null;
    if (data.wrote) emit('refresh');
  } catch (error) {
    messages.value.push({
      role: 'bot',
      error: true,
      retry: true,
      text: error.message === 'auth'
        ? 'Sesión expirada. Recargá la página.'
        : 'No pude procesar el mensaje. Verificá tu conexión.'
    });
  } finally {
    busy.value = false;
    scrollDown();
  }
}
</script>

<style scoped>
.ai-pulse {
  animation: ai-pulse 1.6s ease-in-out infinite;
}
@keyframes ai-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
</style>
