<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/40 z-40"
        @click="$emit('close')"
      />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="show"
        class="fixed inset-y-0 right-0 z-50 w-full lg:w-[480px] bg-go-bg-elevated shadow-2xl flex flex-col"
      >
        <header class="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-go-border-subtle">
          <div class="flex-1 min-w-0">
            <p v-if="eyebrow" class="text-[10px] font-bold tracking-[0.14em] uppercase text-go-text-muted mb-0.5">{{ eyebrow }}</p>
            <h2 class="font-display font-semibold text-go-text text-[15px] truncate">{{ title }}</h2>
            <p v-if="subtitle" class="text-[11.5px] text-go-text-muted truncate mt-0.5">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            @click="$emit('close')"
            class="shrink-0 w-8 h-8 flex items-center justify-center rounded-go-md text-go-text-muted hover:text-go-text hover:bg-go-surface-hover transition-colors"
            title="Cerrar (Esc)"
          >
            <MdiClose class="text-[18px]" />
          </button>
        </header>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="shrink-0 border-t border-go-border-subtle px-5 py-3 bg-go-surface">
          <slot name="footer" />
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' }
});

const emit = defineEmits(['close']);

function onKey(e) {
  if (e.key === 'Escape' && props.show) emit('close');
}

onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});

watch(() => props.show, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});
</script>
