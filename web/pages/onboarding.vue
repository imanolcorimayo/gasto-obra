<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <CasquitoNeutral :size="100" class="mb-6" />

    <h1 class="font-display font-bold text-2xl text-go-text text-center mb-2">
      ¡Bienvenido a Gasto Obra!
    </h1>
    <p class="text-go-text-muted text-sm text-center max-w-md mb-10">
      Contanos cómo vas a usar la plataforma para llevarte al lugar correcto.
    </p>

    <!-- Role cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
      <!-- Provider card -->
      <button
        class="group bg-go-surface border-2 border-go-border rounded-go-xl p-6 text-left transition-all duration-150 hover:border-go-primary hover:bg-go-surface-hover focus:outline-none focus:ring-2 focus:ring-go-primary/50"
        @click="goProvider"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-go-md bg-go-primary/10 flex items-center justify-center">
            <MdiHardHat class="w-5 h-5 text-go-primary" />
          </div>
          <h2 class="font-display font-semibold text-go-text">Soy proveedor</h2>
        </div>
        <p class="text-go-text-muted text-sm leading-relaxed">
          Hago obras y quiero registrar gastos por WhatsApp para mis clientes.
        </p>
      </button>

      <!-- Client card -->
      <button
        class="group bg-go-surface border-2 border-go-border rounded-go-xl p-6 text-left transition-all duration-150 hover:border-go-primary hover:bg-go-surface-hover focus:outline-none focus:ring-2 focus:ring-go-primary/50"
        @click="showClientInfo = true"
        :class="{ 'border-go-primary': showClientInfo }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-go-md bg-go-secondary/10 flex items-center justify-center">
            <MdiHomeOutline class="w-5 h-5 text-go-secondary" />
          </div>
          <h2 class="font-display font-semibold text-go-text">Soy cliente</h2>
        </div>
        <p class="text-go-text-muted text-sm leading-relaxed">
          Tengo una obra en curso y quiero ver los gastos que registra mi proveedor.
        </p>
      </button>
    </div>

    <!-- Client info panel -->
    <Transition name="fade-slide">
      <div v-if="showClientInfo" class="w-full max-w-lg mt-6 bg-go-surface border border-go-border rounded-go-xl p-6">
        <div class="flex items-start gap-3">
          <MdiInformationOutline class="w-5 h-5 text-go-primary shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-go-text text-sm font-medium mb-2">
              Necesitás un código de invitación de tu proveedor.
            </p>
            <p class="text-go-text-muted text-sm leading-relaxed mb-4">
              Pedile que entre a su proyecto en Gasto Obra y te comparta el código.
              Pegalo abajo y vas a poder ver todos los gastos en tiempo real.
            </p>
            <button
              @click="showJoinModal = true"
              class="btn-primary w-full text-sm inline-flex items-center justify-center gap-2"
            >
              <MdiKeyOutline class="text-base" />
              Tengo un código
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <JoinProjectModal :show="showJoinModal" @close="showJoinModal = false" />

    <!-- Skip link -->
    <button
      class="mt-8 text-go-text-muted text-xs hover:text-go-text-secondary transition-colors"
      @click="goExplore"
    >
      Explorar por mi cuenta
    </button>
  </div>
</template>

<script setup>
import MdiHardHat from '~icons/mdi/hard-hat';
import MdiHomeOutline from '~icons/mdi/home-outline';
import MdiInformationOutline from '~icons/mdi/information-outline';
import MdiKeyOutline from '~icons/mdi/key-outline';

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'Bienvenido'
});

const showClientInfo = ref(false);
const showJoinModal = ref(false);

function goProvider() {
  navigateTo('/projects/new');
}

function goExplore() {
  navigateTo('/projects');
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
