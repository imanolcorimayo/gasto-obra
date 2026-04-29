<template>
  <div v-if="show" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="font-display font-semibold text-base text-go-text">Unirme a una obra</h3>
        <button @click="handleClose" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: token input -->
        <template v-if="!preview">
          <p class="text-sm text-go-text-secondary mb-3">
            Pegá el código de invitación que te compartió tu proveedor.
          </p>

          <input
            v-model="token"
            type="text"
            class="w-full bg-go-surface border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text font-mono placeholder:text-go-text-muted focus:outline-none focus:border-go-primary"
            placeholder="Ej: 1a2b3c4d-..."
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown.enter="lookup"
          />

          <p v-if="error" class="text-go-danger text-xs mt-2">{{ error }}</p>

          <button
            @click="lookup"
            :disabled="!token.trim() || isLoading"
            class="btn-primary w-full mt-4 inline-flex items-center justify-center gap-2"
          >
            <span v-if="isLoading" class="w-4 h-4 border-2 border-go-primary-on border-t-transparent rounded-full animate-spin"></span>
            {{ isLoading ? 'Buscando...' : 'Buscar obra' }}
          </button>
        </template>

        <!-- Step 2: preview + confirm -->
        <template v-else>
          <div class="bg-go-surface border border-go-border rounded-go-md p-4 text-center">
            <p v-if="preview.providerName" class="text-go-text-muted text-xs mb-2">
              <span class="font-semibold text-go-text">{{ preview.providerName }}</span> te invita a
            </p>
            <h4 class="font-display font-bold text-lg text-go-text">{{ preview.name }}</h4>
            <p v-if="preview.tag" class="font-mono text-xs text-go-text-muted mt-1">#{{ preview.tag }}</p>
            <p v-if="preview.address" class="text-xs text-go-text-tertiary mt-2">{{ preview.address }}</p>
          </div>

          <p v-if="error" class="text-go-danger text-xs mt-3">{{ error }}</p>

          <div class="flex gap-2 mt-4">
            <button
              @click="reset"
              class="btn-secondary flex-1 text-sm"
              :disabled="isJoining"
            >
              Cambiar código
            </button>
            <button
              @click="join"
              :disabled="isJoining"
              class="btn-primary flex-1 inline-flex items-center justify-center gap-2 text-sm"
            >
              <span v-if="isJoining" class="w-4 h-4 border-2 border-go-primary-on border-t-transparent rounded-full animate-spin"></span>
              {{ isJoining ? 'Uniéndome...' : 'Unirme' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import { useProjectStore } from '~/stores/project';
import { signInWithGoogle, getCurrentUserAsync } from '~/utils/firebase';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const config = useRuntimeConfig();
const router = useRouter();
const projectStore = useProjectStore();

const token = ref('');
const preview = ref(null);
const isLoading = ref(false);
const isJoining = ref(false);
const error = ref(null);

watch(() => props.show, (val) => {
  if (val) {
    token.value = '';
    preview.value = null;
    error.value = null;
    isLoading.value = false;
    isJoining.value = false;
  }
});

async function lookup() {
  const trimmed = token.value.trim();
  if (!trimmed || isLoading.value) return;

  isLoading.value = true;
  error.value = null;
  try {
    const res = await fetch(`${config.public.apiBase}/api/project-preview/${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      preview.value = await res.json();
    } else {
      error.value = 'Código inválido o proyecto no encontrado.';
    }
  } catch (e) {
    console.error('Error looking up token:', e);
    error.value = 'No pudimos conectar con el servidor. Intentá de nuevo.';
  } finally {
    isLoading.value = false;
  }
}

async function join() {
  if (!preview.value || isJoining.value) return;
  isJoining.value = true;
  error.value = null;
  try {
    let user = await getCurrentUserAsync();
    if (!user) {
      user = await signInWithGoogle();
    }
    if (!user) {
      isJoining.value = false;
      return;
    }

    const result = await projectStore.joinAsClient(preview.value.id, user.uid);
    if (result.success) {
      useToast('success', 'Te uniste como cliente');
      handleClose();
      router.push(`/client/project/${preview.value.id}`);
      return;
    }

    // Join failed — maybe already joined. Try reading the project.
    const fullProject = await projectStore.fetchProject(preview.value.id);
    if (fullProject?.clientUserId === user.uid) {
      handleClose();
      router.push(`/client/project/${preview.value.id}`);
      return;
    }

    error.value = result.error || 'Esta obra ya tiene un cliente asociado.';
  } catch (e) {
    console.error('Error joining project:', e);
    error.value = 'Error al unirse al proyecto.';
  } finally {
    isJoining.value = false;
  }
}

function reset() {
  preview.value = null;
  error.value = null;
}

function handleClose() {
  emit('close');
}
</script>
