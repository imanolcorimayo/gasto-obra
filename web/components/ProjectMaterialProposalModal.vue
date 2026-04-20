<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">{{ isEdit ? 'Editar propuesta' : 'Nueva propuesta' }}</h3>
          <p class="text-go-text-muted text-xs mt-0.5">{{ materialName }}</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body space-y-4">
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Comercio</label>
            <VendorCombobox v-model="form.vendor" :vendors="vendorStore.vendors" placeholder="Ej: Easy, Sodimac, Pinturería del barrio..." />
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Precio *</label>
            <div class="flex">
              <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
              <input
                v-model="form.amount"
                type="number"
                required
                min="0"
                step="1"
                placeholder="0"
                class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Notas</label>
            <textarea
              v-model="form.notes"
              rows="2"
              maxlength="500"
              placeholder="Opcional: link, condiciones, válido hasta, etc."
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors resize-none"
            />
          </div>

          <!-- Image picker (only on create) -->
          <div v-if="!isEdit">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Foto del producto</label>
            <div v-if="imagePreview" class="flex items-center gap-3">
              <div class="relative w-20 h-20 rounded-go-sm overflow-hidden border border-go-border shrink-0">
                <img :src="imagePreview" alt="Preview" class="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                @click="removeImage"
                class="text-xs text-go-text-muted hover:text-go-danger transition-colors inline-flex items-center gap-1"
              >
                <MdiClose class="text-sm" />
                Quitar
              </button>
            </div>
            <button
              v-else
              type="button"
              @click="triggerImagePicker"
              class="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-go-md border border-dashed border-go-border text-go-text-muted hover:text-go-primary hover:border-go-primary transition-colors text-sm"
            >
              <MdiCameraPlus class="text-base" />
              Agregar foto (opcional)
            </button>
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImagePick"
            />
          </div>
        </div>

        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">Cancelar</button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <span v-if="isSubmitting" class="btn-spinner"></span>
            {{ isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear propuesta') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Cropper modal (portal'd to body via Teleport inside) -->
    <ImageCropperModal
      :show="cropperFile !== null"
      :file="cropperFile"
      @close="cropperFile = null"
      @confirm="handleCropConfirm"
    />
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import MdiCameraPlus from '~icons/mdi/camera-plus';
import { useVendorStore } from '~/stores/vendor';

const props = defineProps({
  show: { type: Boolean, default: false },
  proposal: { type: Object, default: null },
  materialName: { type: String, default: '' },
  isSubmitting: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'submit']);

const vendorStore = useVendorStore();

const isEdit = computed(() => !!props.proposal);

const form = reactive({
  vendor: '',
  amount: '',
  notes: ''
});

const imageInputRef = ref(null);
const imageFile = ref(null);
const imagePreview = ref('');
const cropperFile = ref(null);

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    if (props.proposal) {
      form.vendor = props.proposal.vendor || '';
      form.amount = props.proposal.amount ?? '';
      form.notes = props.proposal.notes || '';
    } else {
      form.vendor = '';
      form.amount = '';
      form.notes = '';
    }
    resetImage();
    if (vendorStore.vendors.length === 0) {
      vendorStore.fetchAll();
    }
  } else {
    resetImage();
  }
});

function triggerImagePicker() {
  imageInputRef.value?.click();
}

function handleImagePick(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    useToast('error', 'Seleccioná una imagen.');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    useToast('error', 'La imagen es muy grande (máx. 15 MB).');
    return;
  }
  // Open cropper
  cropperFile.value = file;
}

function handleCropConfirm(croppedFile) {
  cropperFile.value = null;
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = croppedFile;
  imagePreview.value = URL.createObjectURL(croppedFile);
}

function removeImage() {
  resetImage();
}

function resetImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = '';
  cropperFile.value = null;
}

function handleSubmit() {
  emit('submit', {
    vendor: form.vendor.trim() || null,
    amount: parseFloat(form.amount) || 0,
    notes: form.notes.trim() || null,
    imageFile: imageFile.value
  });
}
</script>
