<template>
  <section class="relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-go-primary/[0.04] rounded-full blur-[120px] pointer-events-none"></div>

    <div class="max-w-6xl mx-auto px-5 pt-28 pb-20 w-full">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left: Copy -->
        <div ref="heroTextRef" class="landing-fade-up">
          <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl text-go-text leading-[1.1] tracking-tight mb-6">
            Cada gasto de tu obra,
            <span class="text-go-primary">bajo control.</span>
          </h1>
          <p class="text-go-text-secondary text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
            Mandá un texto, una foto del ticket, un audio o un PDF — los datos se extraen solos. Tu cliente ve todo en tiempo real. Sin papel, sin Excel, sin olvidos.
          </p>

          <!-- Authenticated: go to dashboard -->
          <button
            v-if="isAuthenticated"
            @click="$emit('dashboard')"
            :disabled="isLoading"
            class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2"
            style="--tw-ring-color: rgba(255, 171, 64, 0.5); --tw-ring-offset-color: var(--go-bg);"
          >
            <template v-if="!isLoading">Ir al dashboard</template>
            <span v-else class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Cargando...
            </span>
          </button>

          <!-- Not authenticated: sign in with Google -->
          <button
            v-else
            @click="$emit('login')"
            :disabled="isLoading"
            class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary-muted text-go-primary hover:bg-go-primary/20 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2"
            style="--tw-ring-color: rgba(255, 171, 64, 0.5); --tw-ring-offset-color: var(--go-bg);"
          >
            <svg v-if="!isLoading" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <template v-if="!isLoading">Empezar con Google</template>
            <span v-else class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-go-primary/30 border-t-go-primary rounded-full animate-spin"></span>
              Ingresando...
            </span>
          </button>

          <p v-if="!isAuthenticated" class="text-go-text-muted text-sm mt-4">
            Sin tarjeta. Sin configuración. Gratis para empezar.
          </p>
        </div>

        <!-- Right: Phone mockup -->
        <div ref="heroPhoneRef" class="landing-fade-up landing-delay-200">
          <!-- Phone frame -->
          <div class="relative max-w-[260px] lg:max-w-[300px] mx-auto lg:ml-auto lg:mr-0 landing-float">
            <div class="bg-go-surface-alt rounded-[40px] p-[6px] shadow-go-lg border border-go-border">
              <!-- Phone screen -->
              <div class="bg-go-bg-elevated rounded-[34px] overflow-hidden relative">

                <!-- Status bar + Dynamic Island -->
                <div class="relative bg-go-bg-elevated px-5 pt-3 pb-2">
                  <!-- Dynamic Island -->
                  <div class="mx-auto w-[90px] h-[24px] bg-go-text-inverse rounded-full"></div>
                  <!-- Status bar icons -->
                  <div class="flex items-center justify-between mt-2 px-1">
                    <span class="text-go-text text-xs font-medium">10:32</span>
                    <div class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-go-text" fill="currentColor" viewBox="0 0 24 24"><path d="M2 20h2V8H2v12zm5 0h2V4H7v16zm5 0h2v-8h-2v8zm5 0h2V2h-2v18z"/></svg>
                      <svg class="w-3.5 h-3.5 text-go-text" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                      <svg class="w-4 h-3.5 text-go-text" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                    </div>
                  </div>
                </div>

                <!-- Chat header -->
                <div class="bg-go-surface px-4 py-2.5 flex items-center gap-3 border-b border-go-border-subtle">
                  <svg class="w-4 h-4 text-go-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  <div class="w-7 h-7 rounded-full bg-go-success/20 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-go-success" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-go-text text-xs font-medium">Gasto Obra Bot</p>
                    <p class="text-go-text-tertiary text-xs">en línea</p>
                  </div>
                </div>

                <!-- Chat messages -->
                <div class="px-3 py-3 space-y-2.5 bg-go-bg-elevated">
                  <!-- User message -->
                  <div class="flex justify-end">
                    <div class="bg-go-secondary/20 border border-go-secondary/10 rounded-go-lg rounded-tr-sm px-3 py-1.5 max-w-[85%]">
                      <p class="text-go-text text-xs">Compre 3 bolsas de cemento, 45000</p>
                      <p class="text-go-text-tertiary text-[9px] text-right mt-0.5">10:32</p>
                    </div>
                  </div>

                  <!-- Bot response -->
                  <div class="flex justify-start">
                    <div class="bg-go-surface border border-go-border-subtle rounded-go-lg rounded-tl-sm px-3 py-1.5 max-w-[85%]">
                      <p class="text-go-text text-xs font-medium mb-1">Gasto registrado</p>
                      <div class="space-y-0.5 text-xs text-go-text-secondary">
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Monto</span>
                          <span class="text-go-primary font-medium">$45.000</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Categoría</span>
                          <span>Materiales</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Proyecto</span>
                          <span>Depto Flores 3B</span>
                        </div>
                      </div>
                      <p class="text-go-text-tertiary text-[9px] text-right mt-1">10:32</p>
                    </div>
                  </div>

                  <!-- User audio message -->
                  <div class="flex justify-end">
                    <div class="bg-go-secondary/20 border border-go-secondary/10 rounded-go-lg rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-go-text-secondary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <div class="flex items-center gap-[2px] h-3.5 flex-1">
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:30%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:60%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:90%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:50%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:80%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:40%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:70%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:35%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:55%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:85%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:45%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:65%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:30%"></div>
                          <div class="w-[2px] rounded-full bg-go-text-tertiary" style="height:50%"></div>
                        </div>
                        <span class="text-[9px] text-go-text-tertiary shrink-0">0:04</span>
                      </div>
                      <p class="text-go-text-tertiary text-[9px] text-right mt-0.5">10:34</p>
                    </div>
                  </div>

                  <!-- Bot response to audio -->
                  <div class="flex justify-start">
                    <div class="bg-go-surface border border-go-border-subtle rounded-go-lg rounded-tl-sm px-3 py-1.5 max-w-[85%]">
                      <p class="text-go-text text-xs font-medium mb-1">Gasto registrado</p>
                      <p class="text-go-text-tertiary text-xs italic mb-1">"Pagué 28 mil de pintura en Pinturerías"</p>
                      <div class="space-y-0.5 text-xs text-go-text-secondary">
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Monto</span>
                          <span class="text-go-primary font-medium">$28.000</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Categoría</span>
                          <span>Materiales</span>
                        </div>
                        <div class="flex justify-between gap-4">
                          <span class="text-go-text-tertiary">Comercio</span>
                          <span>Pinturerías</span>
                        </div>
                      </div>
                      <p class="text-go-text-tertiary text-[9px] text-right mt-1">10:34</p>
                    </div>
                  </div>
                </div>

                <!-- Chat input bar -->
                <div class="bg-go-bg-elevated px-3 py-2 border-t border-go-border-subtle flex items-center gap-2">
                  <svg class="w-4 h-4 text-go-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  <div class="flex-1 bg-go-surface rounded-full px-3 py-1.5 text-xs text-go-text-muted">
                    Mensaje
                  </div>
                  <svg class="w-4 h-4 text-go-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                </div>

                <!-- Home indicator -->
                <div class="flex justify-center py-2 bg-go-bg-elevated">
                  <div class="w-[100px] h-[4px] bg-go-text-muted/40 rounded-full"></div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  isAuthenticated: Boolean,
  isLoading: Boolean
});

defineEmits(['login', 'dashboard']);

const heroTextRef = ref(null);
const heroPhoneRef = ref(null);

onMounted(() => {
  [heroTextRef, heroPhoneRef].forEach((ref) => {
    if (ref.value) {
      setTimeout(() => ref.value?.classList.add('is-visible'), 100);
    }
  });
});
</script>
