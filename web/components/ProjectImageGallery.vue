<template>
  <div>
    <!-- Thumbnail strip -->
    <div v-if="images.length > 0" class="flex items-center gap-1.5 flex-wrap">
      <button
        v-for="(image, idx) in images"
        :key="image.id"
        type="button"
        class="relative w-14 h-14 rounded-go-sm overflow-hidden border border-go-border hover:border-go-primary transition-colors shrink-0"
        @click="openViewer(idx)"
      >
        <img :src="image.thumbUrl" :alt="`Imagen ${idx + 1}`" class="w-full h-full object-cover" />
      </button>

      <!-- Upload button (inline with thumbnails) -->
      <button
        v-if="!readonly"
        type="button"
        :disabled="isUploading"
        @click="triggerFileInput"
        class="w-14 h-14 rounded-go-sm border border-dashed border-go-border hover:border-go-primary text-go-text-muted hover:text-go-primary flex flex-col items-center justify-center transition-colors shrink-0 disabled:opacity-50"
        :title="isUploading ? 'Subiendo...' : 'Agregar imagen'"
      >
        <span v-if="isUploading" class="btn-spinner !border-go-text-muted !border-t-transparent"></span>
        <template v-else>
          <MdiPlus class="text-base" />
          <span class="text-[9px] leading-none mt-0.5">Foto</span>
        </template>
      </button>
    </div>

    <!-- Empty state (provider only sees the upload CTA) -->
    <button
      v-else-if="!readonly"
      type="button"
      :disabled="isUploading"
      @click="triggerFileInput"
      class="inline-flex items-center gap-1.5 text-xs font-medium text-go-primary hover:text-go-primary/80 transition-colors disabled:opacity-50"
    >
      <span v-if="isUploading" class="btn-spinner !w-3 !h-3"></span>
      <MdiCameraPlus v-else class="text-sm" />
      {{ isUploading ? 'Subiendo...' : 'Agregar foto' }}
    </button>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Cropper modal -->
    <ImageCropperModal
      :show="cropperFile !== null"
      :file="cropperFile"
      @close="cropperFile = null"
      @confirm="handleCropConfirm"
    />

    <!-- Fullscreen viewer -->
    <Teleport to="body">
      <div
        v-if="viewerIndex !== null"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click="closeViewer"
      >
        <!-- Toolbar -->
        <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            v-if="!readonly"
            class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-go-danger/40 transition-colors disabled:opacity-50"
            :disabled="isDeleting"
            title="Eliminar"
            @click.stop="handleDelete"
          >
            <span v-if="isDeleting" class="btn-spinner"></span>
            <MdiDelete v-else class="text-lg" />
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            @click.stop="closeViewer"
          >
            <MdiClose class="text-xl" />
          </button>
        </div>

        <!-- Navigation -->
        <button
          v-if="images.length > 1"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
          @click.stop="prev"
        >
          <MdiChevronLeft class="text-xl" />
        </button>
        <button
          v-if="images.length > 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
          @click.stop="next"
        >
          <MdiChevronRight class="text-xl" />
        </button>

        <!-- Image -->
        <img
          v-if="activeImage"
          :src="activeImage.url"
          alt="Imagen"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-go-md"
          @click.stop
        />

        <!-- Index indicator -->
        <div
          v-if="images.length > 1"
          class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs tabular-nums"
        >
          {{ viewerIndex + 1 }} / {{ images.length }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiClose from '~icons/mdi/close';
import MdiDelete from '~icons/mdi/delete';
import MdiCameraPlus from '~icons/mdi/camera-plus';
import MdiChevronLeft from '~icons/mdi/chevron-left';
import MdiChevronRight from '~icons/mdi/chevron-right';
import { getCurrentUser } from '~/utils/firebase';

const props = defineProps({
  images: { type: Array, default: () => [] },
  // API base path for this entity: '/api/items/<id>' or '/api/proposals/<id>'
  endpointBase: { type: String, required: true },
  readonly: { type: Boolean, default: false }
});

const emit = defineEmits(['uploaded', 'deleted']);

const config = useRuntimeConfig();
const fileInputRef = ref(null);
const isUploading = ref(false);
const isDeleting = ref(false);
const viewerIndex = ref(null);
const cropperFile = ref(null);

const activeImage = computed(() => {
  if (viewerIndex.value === null) return null;
  return props.images[viewerIndex.value] || null;
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function openViewer(idx) {
  viewerIndex.value = idx;
  document.body.classList.add('modal-open');
}

function closeViewer() {
  viewerIndex.value = null;
  document.body.classList.remove('modal-open');
}

function prev() {
  if (viewerIndex.value === null) return;
  viewerIndex.value = (viewerIndex.value - 1 + props.images.length) % props.images.length;
}

function next() {
  if (viewerIndex.value === null) return;
  viewerIndex.value = (viewerIndex.value + 1) % props.images.length;
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  event.target.value = ''; // reset so same file can be re-picked
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    useToast('error', 'Seleccioná una imagen.');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    useToast('error', 'La imagen es muy grande (máx. 15 MB).');
    return;
  }

  // Open the cropper — upload happens after confirmation
  cropperFile.value = file;
}

async function handleCropConfirm(croppedFile) {
  cropperFile.value = null;
  await uploadFile(croppedFile);
}

async function uploadFile(file) {
  isUploading.value = true;
  try {
    const user = getCurrentUser();
    if (!user) {
      useToast('error', 'Sesión expirada. Recargá la página.');
      return;
    }
    const token = await user.getIdToken();

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${config.public.apiBase}${props.endpointBase}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      useToast('error', data.error || 'No se pudo subir la imagen.');
      return;
    }

    useToast('success', 'Imagen subida');
    emit('uploaded', data.image);
  } catch (error) {
    console.error('Image upload error:', error);
    useToast('error', 'Error de conexión.');
  } finally {
    isUploading.value = false;
  }
}

async function handleDelete() {
  if (!activeImage.value) return;
  if (!confirm('¿Eliminar esta imagen? No se puede deshacer.')) return;

  isDeleting.value = true;
  try {
    const user = getCurrentUser();
    if (!user) {
      useToast('error', 'Sesión expirada. Recargá la página.');
      return;
    }
    const token = await user.getIdToken();

    const imageId = activeImage.value.id;
    const res = await fetch(`${config.public.apiBase}${props.endpointBase}/image/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      useToast('error', data.error || 'No se pudo eliminar la imagen.');
      return;
    }

    useToast('success', 'Imagen eliminada');
    emit('deleted', imageId);
    closeViewer();
  } catch (error) {
    console.error('Image delete error:', error);
    useToast('error', 'Error de conexión.');
  } finally {
    isDeleting.value = false;
  }
}
</script>
