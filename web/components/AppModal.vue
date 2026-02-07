<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close">
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="text-lg font-semibold">{{ title }}</h2>
            <button @click="close" class="modal-close">
              <MdiClose class="text-xl" />
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';

const props = defineProps({
  title: { type: String, default: '' }
});

const isOpen = ref(false);

function open() {
  isOpen.value = true;
  document.body.classList.add('modal-open');
}

function close() {
  isOpen.value = false;
  document.body.classList.remove('modal-open');
}

defineExpose({ open, close });
</script>
