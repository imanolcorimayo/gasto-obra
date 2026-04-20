<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container max-w-2xl">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">Recortar imagen</h3>
          <p class="text-go-text-muted text-xs mt-0.5">Ajustá el encuadre antes de subir.</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="imgUrl" class="bg-black rounded-go-md overflow-hidden" style="max-height: 60vh;">
          <Cropper
            ref="cropperRef"
            :src="imgUrl"
            :stencil-props="{ aspectRatio: null }"
            :transitions="false"
            class="cropper"
            image-restriction="fit-area"
          />
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-2 mt-3">
          <button
            type="button"
            @click="rotate(-90)"
            class="btn-secondary text-xs inline-flex items-center gap-1"
            title="Rotar a la izquierda"
          >
            <MdiRotateLeft class="text-base" />
            Izquierda
          </button>
          <button
            type="button"
            @click="rotate(90)"
            class="btn-secondary text-xs inline-flex items-center gap-1"
            title="Rotar a la derecha"
          >
            <MdiRotateRight class="text-base" />
            Derecha
          </button>
          <button
            type="button"
            @click="reset"
            class="text-xs text-go-text-muted hover:text-go-text transition-colors px-2 py-1 ml-1"
            title="Reiniciar encuadre"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div class="modal-footer flex-col sm:flex-row">
        <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">Cancelar</button>
        <button
          type="button"
          @click="handleConfirm"
          :disabled="isBusy"
          class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2"
        >
          <span v-if="isBusy" class="btn-spinner"></span>
          {{ isBusy ? 'Procesando...' : 'Usar esta imagen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import MdiClose from '~icons/mdi/close';
import MdiRotateLeft from '~icons/mdi/rotate-left';
import MdiRotateRight from '~icons/mdi/rotate-right';

const props = defineProps({
  show: { type: Boolean, default: false },
  file: { type: Object, default: null } // File | Blob
});

const emit = defineEmits(['close', 'confirm']);

const cropperRef = ref(null);
const imgUrl = ref('');
const isBusy = ref(false);

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show && props.file) {
    // Revoke previous URL if any
    if (imgUrl.value) URL.revokeObjectURL(imgUrl.value);
    imgUrl.value = URL.createObjectURL(props.file);
    isBusy.value = false;
  } else if (!show && imgUrl.value) {
    URL.revokeObjectURL(imgUrl.value);
    imgUrl.value = '';
  }
});

function rotate(angle) {
  cropperRef.value?.rotate(angle);
}

function reset() {
  cropperRef.value?.reset();
}

async function handleConfirm() {
  if (!cropperRef.value) return;
  isBusy.value = true;
  try {
    const { canvas } = cropperRef.value.getResult();
    if (!canvas) {
      useToast('error', 'No se pudo recortar la imagen.');
      return;
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      useToast('error', 'No se pudo procesar la imagen.');
      return;
    }
    // Derive a name from original file for the upload
    const originalName = props.file?.name || 'image.jpg';
    const fileName = originalName.replace(/\.[^.]+$/, '.jpg');
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    emit('confirm', file);
  } catch (error) {
    console.error('Cropper error:', error);
    useToast('error', 'Error al procesar la imagen.');
  } finally {
    isBusy.value = false;
  }
}
</script>

<style>
/* The cropper library uses its own scoped styles via CSS import; no overrides needed */
.cropper {
  height: min(60vh, 500px);
}
</style>
