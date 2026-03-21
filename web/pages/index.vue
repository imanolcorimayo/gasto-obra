<template>
  <div class="bg-go-bg min-h-screen">
    <LandingNavbar :show-login="true" :login-loading="isLoading" :is-authenticated="isAuthenticated" @login="handleLogin" />

    <!-- ═══ HERO ═══ -->
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
              @click="goToDashboard"
              :disabled="isLoading"
              class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-go-text-inverse hover:bg-go-primary-hover active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2"
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
              @click="handleLogin"
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
                          <!-- Play button -->
                          <svg class="w-4 h-4 text-go-text-secondary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <!-- Waveform -->
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

    <!-- ═══ FEATURES ═══ -->
    <section class="py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-5">
        <div ref="featuresRef" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Feature 1: WhatsApp -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up">
            <div class="w-10 h-10 rounded-go-md bg-go-success/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Registrá como quieras</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Texto, foto de ticket, audio o PDF — mandalo por WhatsApp y los datos se extraen solos. Monto, categoría y detalle, sin cargar nada a mano.
            </p>
          </div>

          <!-- Feature 2: Dashboard -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up landing-delay-100">
            <div class="w-10 h-10 rounded-go-md bg-go-primary/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Dashboard en tiempo real</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Todos tus proyectos, resúmenes por categoría e historial completo. Sabés exactamente en qué se fue cada peso.
            </p>
          </div>

          <!-- Feature 3: Client view -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up landing-delay-200">
            <div class="w-10 h-10 rounded-go-md bg-go-info/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-info" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Vista para el cliente</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Compartís un link y el dueño del depto ve gastos, categorías y balance en tiempo real. Sin instalar nada, desde el navegador.
            </p>
          </div>

          <!-- Feature 4: PDF Reports -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up landing-delay-300">
            <div class="w-10 h-10 rounded-go-md bg-go-secondary/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-secondary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Reportes en PDF</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Exportá el detalle completo de cada obra en PDF. Listo para presentar al cliente o archivar.
            </p>
          </div>

          <!-- Feature 5: Financial management -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up landing-delay-400">
            <div class="w-10 h-10 rounded-go-md bg-go-warning/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-warning" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Gestión financiera</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Gastos, pagos y balance automático. Presupuesto con avance y comisión de gestión configurable por proyecto.
            </p>
          </div>

          <!-- Feature 6: Categories & vendors -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 hover:bg-go-surface-hover transition-colors landing-fade-up landing-delay-500">
            <div class="w-10 h-10 rounded-go-md bg-go-info/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-info" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Categorías y comercios</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Categorías personalizables por proyecto. Los comercios frecuentes se guardan automáticamente para futuros gastos.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ WHATSAPP: INPUT TYPES ═══ -->
    <section class="py-20 sm:py-28 border-t border-go-border-subtle">
      <div class="max-w-6xl mx-auto px-5">
        <div ref="whatsappTitleRef" class="text-center mb-14 landing-fade-up">
          <p class="text-go-primary text-sm font-medium tracking-wide uppercase mb-3">WhatsApp como interfaz</p>
          <h2 class="font-display text-2xl sm:text-3xl text-go-text">
            Mandá como quieras, se registra solo
          </h2>
        </div>

        <div ref="whatsappRef" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Type 1: Text -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-5 landing-fade-up">
            <div class="w-9 h-9 rounded-go-md bg-go-success/10 flex items-center justify-center mb-3">
              <svg class="w-4.5 h-4.5 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <h4 class="text-go-text font-medium mb-1">Texto libre</h4>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Escribí como hablás: monto, descripción y categoría se extraen del mensaje automáticamente.
            </p>
            <div class="mt-3 bg-go-bg/60 rounded-go-md px-3 py-2 text-xs text-go-text-tertiary italic">
              "3 bolsas de cemento 45 lucas"
            </div>
          </div>

          <!-- Type 2: Photo -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-5 landing-fade-up landing-delay-100">
            <div class="w-9 h-9 rounded-go-md bg-go-primary/10 flex items-center justify-center mb-3">
              <svg class="w-4.5 h-4.5 text-go-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <h4 class="text-go-text font-medium mb-1">Foto de comprobante</h4>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Sacale foto al ticket o comprobante. Se leen los items, montos y comercio directo de la imagen.
            </p>
            <div class="mt-3 bg-go-bg/60 rounded-go-md px-3 py-2 text-xs text-go-text-tertiary italic">
              Foto del ticket de ferretería
            </div>
          </div>

          <!-- Type 3: Audio -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-5 landing-fade-up landing-delay-200">
            <div class="w-9 h-9 rounded-go-md bg-go-warning/10 flex items-center justify-center mb-3">
              <svg class="w-4.5 h-4.5 text-go-warning" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <h4 class="text-go-text font-medium mb-1">Mensaje de audio</h4>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Grabá un audio contando el gasto. Se transcribe y se extraen todos los datos automáticamente.
            </p>
            <div class="mt-3 bg-go-bg/60 rounded-go-md px-3 py-2 text-xs text-go-text-tertiary italic">
              "Compré pintura, 28 mil en Pinturerías"
            </div>
          </div>

          <!-- Type 4: PDF -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-5 landing-fade-up landing-delay-300">
            <div class="w-9 h-9 rounded-go-md bg-go-info/10 flex items-center justify-center mb-3">
              <svg class="w-4.5 h-4.5 text-go-info" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h4 class="text-go-text font-medium mb-1">Factura en PDF</h4>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Reenviá la factura o presupuesto en PDF. Se procesan los items, montos y datos del documento.
            </p>
            <div class="mt-3 bg-go-bg/60 rounded-go-md px-3 py-2 text-xs text-go-text-tertiary italic">
              Factura-proveedor-marzo.pdf
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CLIENT VIEW ═══ -->
    <section class="py-20 sm:py-28 border-t border-go-border-subtle">
      <div class="max-w-6xl mx-auto px-5">
        <div ref="clientRef" class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center landing-fade-up">
          <!-- Left: Copy -->
          <div>
            <p class="text-go-primary text-sm font-medium tracking-wide uppercase mb-3">Para el dueño de la obra</p>
            <h2 class="font-display text-2xl sm:text-3xl text-go-text mb-4">
              Tu cliente, siempre informado
            </h2>
            <p class="text-go-text-secondary leading-relaxed mb-8">
              Compartí un link y el dueño del departamento accede a toda la información de la obra. Sin instalar nada, desde el navegador.
            </p>

            <!-- Feature list -->
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-5 h-5 rounded-full bg-go-success/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg class="w-3 h-3 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-go-text font-medium text-sm">Resumen financiero</p>
                  <p class="text-go-text-tertiary text-sm">Gastos totales, pagos realizados y saldo actualizado</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-5 h-5 rounded-full bg-go-success/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg class="w-3 h-3 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-go-text font-medium text-sm">Desglose por categoría</p>
                  <p class="text-go-text-tertiary text-sm">Porcentajes y montos por rubro: materiales, mano de obra, herramientas</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-5 h-5 rounded-full bg-go-success/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg class="w-3 h-3 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-go-text font-medium text-sm">Historial completo</p>
                  <p class="text-go-text-tertiary text-sm">Todos los movimientos de la obra con fecha y detalle</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-5 h-5 rounded-full bg-go-success/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg class="w-3 h-3 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-go-text font-medium text-sm">Exportación en PDF</p>
                  <p class="text-go-text-tertiary text-sm">Descargable en cualquier momento para archivo o revisión</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Dashboard preview card -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 shadow-go-md">
            <div class="flex items-center gap-2 mb-5">
              <div class="w-2 h-2 rounded-full bg-go-danger"></div>
              <div class="w-2 h-2 rounded-full bg-go-warning"></div>
              <div class="w-2 h-2 rounded-full bg-go-success"></div>
              <span class="text-go-text-muted text-xs ml-2">Vista de cliente</span>
            </div>

            <!-- Mini financial summary -->
            <div class="grid grid-cols-3 gap-3 mb-5">
              <div class="bg-go-bg rounded-go-md p-3 text-center">
                <p class="text-go-text-tertiary text-xs mb-1">Gastos</p>
                <p class="text-go-danger font-display text-sm font-semibold">$847.500</p>
              </div>
              <div class="bg-go-bg rounded-go-md p-3 text-center">
                <p class="text-go-text-tertiary text-xs mb-1">Pagos</p>
                <p class="text-go-success font-display text-sm font-semibold">$600.000</p>
              </div>
              <div class="bg-go-bg rounded-go-md p-3 text-center">
                <p class="text-go-text-tertiary text-xs mb-1">Saldo</p>
                <p class="text-go-warning font-display text-sm font-semibold">-$247.500</p>
              </div>
            </div>

            <!-- Mini category breakdown -->
            <p class="text-go-text-tertiary text-xs uppercase tracking-wide mb-2">Categorías</p>
            <div class="space-y-2">
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-go-text-secondary">Materiales</span>
                  <span class="text-go-text-tertiary">58%</span>
                </div>
                <div class="h-1.5 bg-go-bg rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-go-cat-materiales" style="width: 58%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-go-text-secondary">Mano de obra</span>
                  <span class="text-go-text-tertiary">25%</span>
                </div>
                <div class="h-1.5 bg-go-bg rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-go-cat-mano-de-obra" style="width: 25%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-go-text-secondary">Herramientas</span>
                  <span class="text-go-text-tertiary">12%</span>
                </div>
                <div class="h-1.5 bg-go-bg rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-go-cat-herramientas" style="width: 12%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-go-text-secondary">Otros</span>
                  <span class="text-go-text-tertiary">5%</span>
                </div>
                <div class="h-1.5 bg-go-bg rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-go-cat-otros" style="width: 5%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ HOW IT WORKS ═══ -->
    <section class="py-20 sm:py-28 border-t border-go-border-subtle">
      <div class="max-w-6xl mx-auto px-5">
        <h2 ref="howRef" class="font-display text-2xl sm:text-3xl text-go-text text-center mb-14 landing-fade-up">
          Cómo funciona
        </h2>

        <div ref="stepsRef" class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <!-- Step 1 -->
          <div class="text-center landing-fade-up">
            <div class="text-go-primary font-display text-4xl mb-3">1</div>
            <h3 class="text-go-text font-medium text-base mb-2">Vinculás tu WhatsApp</h3>
            <p class="text-go-text-tertiary text-sm leading-relaxed">
              Conectás tu número en un minuto y ya estás listo para registrar gastos.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="text-center landing-fade-up landing-delay-100">
            <div class="text-go-primary font-display text-4xl mb-3">2</div>
            <h3 class="text-go-text font-medium text-base mb-2">Mandás los gastos como te salga</h3>
            <p class="text-go-text-tertiary text-sm leading-relaxed">
              Texto, foto, audio o PDF. Los datos se extraen solos y te confirma al instante.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="text-center landing-fade-up landing-delay-200">
            <div class="text-go-primary font-display text-4xl mb-3">3</div>
            <h3 class="text-go-text font-medium text-base mb-2">Tu cliente ve todo en tiempo real</h3>
            <p class="text-go-text-tertiary text-sm leading-relaxed">
              Compartí el link y listo. Gastos, categorías, balance y reportes en PDF — todo accesible desde el navegador.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ WHY US ═══ -->
    <section class="py-20 sm:py-28 border-t border-go-border-subtle">
      <div class="max-w-6xl mx-auto px-5">
        <h2 ref="whyTitleRef" class="font-display text-2xl sm:text-3xl text-go-text text-center mb-14 landing-fade-up">
          ¿Todavía con papel o Excel?
        </h2>

        <div ref="whyRef" class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Paper -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 landing-fade-up">
            <div class="w-10 h-10 rounded-go-md bg-go-text-muted/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Cuaderno o papel</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Los tickets se pierden, se mojan y se acumulan. Con muchos gastos se vuelve un caos imposible de ordenar. No podés compartir con el cliente ni filtrar por categoría.
            </p>
          </div>

          <!-- Excel -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 landing-fade-up landing-delay-100">
            <div class="w-10 h-10 rounded-go-md bg-go-text-muted/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M12 15.375c0-.621-.504-1.125-1.125-1.125" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Planilla de Excel</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Cargar gastos a mano lleva tiempo. No es práctico desde la obra y se acumulan errores.
            </p>
          </div>

          <!-- Gasto Obra -->
          <div class="bg-go-primary-muted border border-go-primary/30 rounded-go-xl p-6 landing-fade-up landing-delay-200">
            <div class="w-10 h-10 rounded-go-md bg-go-primary/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-primary text-lg mb-2">Gasto Obra</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Mandás un mensaje y listo. Los datos se extraen solos, el dashboard se actualiza al instante y tu cliente ve todo.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CONTACT ═══ -->
    <section class="py-16 sm:py-20 border-t border-go-border-subtle bg-go-surface-alt/50">
      <div ref="contactRef" class="max-w-3xl mx-auto px-5 text-center landing-fade-up">
        <h2 class="font-display text-2xl sm:text-3xl text-go-text mb-3">
          ¿Tenés dudas o sugerencias?
        </h2>
        <p class="text-go-text-secondary mb-6 max-w-lg mx-auto">
          Escribinos y te respondemos a la brevedad. Queremos que tu experiencia sea la mejor posible.
        </p>
        <NuxtLink
          to="/contactanos"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-go-lg border-2 border-go-primary text-go-primary font-semibold text-sm hover:bg-go-primary hover:text-go-text-inverse transition-all active:scale-[0.97]"
        >
          Contactanos
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ CTA ═══ -->
    <section class="py-20 sm:py-28 border-t border-go-border-subtle">
      <div ref="ctaRef" class="max-w-3xl mx-auto px-5 text-center landing-fade-up">
        <h2 class="font-display text-2xl sm:text-3xl text-go-text mb-4">
          Empezá a controlar tu obra hoy
        </h2>
        <p class="text-go-text-secondary mb-8">
          Creá tu cuenta en un minuto. Sin tarjeta, sin configuración.
        </p>

        <!-- Authenticated: go to dashboard -->
        <button
          v-if="isAuthenticated"
          @click="goToDashboard"
          :disabled="isLoading"
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-go-text-inverse hover:bg-go-primary-hover active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2"
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
          @click="handleLogin"
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
      </div>
    </section>

    <!-- ═══ FOOTER ═══ -->
    <LandingFooter />

    <!-- Login modal (shown when redirected from auth-required page) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLoginModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" @click.self="showLoginModal = false">
          <div class="bg-go-surface border border-go-border rounded-go-xl w-full max-w-sm overflow-hidden shadow-go-lg">
            <div class="px-6 pt-8 pb-2 text-center">
              <div class="w-14 h-14 rounded-full bg-go-primary-muted flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-go-primary"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 class="font-display text-xl font-bold text-go-text mb-2">Iniciá sesión para continuar</h2>
              <p class="text-go-text-secondary text-sm leading-relaxed">Necesitás estar logueado para acceder a esta página.</p>
            </div>
            <div class="px-6 py-6 space-y-3">
              <button
                @click="handleModalLogin"
                :disabled="isLoading"
                class="w-full inline-flex items-center justify-center gap-3 text-base px-6 py-3 rounded-go-lg font-semibold bg-go-primary text-go-text-inverse hover:bg-go-primary-hover active:scale-[0.97] transition-all"
              >
                <svg v-if="!isLoading" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <template v-if="!isLoading">Continuar con Google</template>
                <span v-else class="flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Ingresando...
                </span>
              </button>
              <button
                @click="showLoginModal = false"
                class="w-full text-sm text-go-text-muted hover:text-go-text transition-colors py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { signInWithGoogle, getCurrentUserAsync } from '~/utils/firebase';
import { useProjectStore } from '~/stores/project';
import { useProviderStore } from '~/stores/provider';

definePageMeta({
  layout: 'landing'
});

useHead({
  title: 'Gasto Obra - Control de gastos de obra y reformas',
  link: [{ rel: 'canonical', href: 'https://gastoobra.com/' }],
});

useSeoMeta({
  description: 'Controlá los gastos de tu obra o reforma desde WhatsApp. Ideal para albañiles, plomeros, electricistas y cualquier proveedor de servicios en Argentina. Enviá fotos, audios o PDFs y tu cliente ve todo en tiempo real.',
  ogTitle: 'Gasto Obra - Control de gastos de obra y reformas',
  ogDescription: 'Gestión de gastos de obra desde WhatsApp. Tu cliente ve todo en tiempo real. Para proveedores de servicios en Argentina.',
  ogType: 'website',
  ogUrl: 'https://gastoobra.com/',
  ogImage: 'https://gastoobra.com/img/logo.png',
  twitterCard: 'summary',
  twitterTitle: 'Gasto Obra - Control de gastos de obra y reformas',
  twitterDescription: 'Controlá los gastos de tu obra o reforma desde WhatsApp. Para proveedores de servicios en Argentina.',
});

const isLoading = ref(false);
const isAuthenticated = ref(false);
const showLoginModal = ref(false);
const heroTextRef = ref(null);
const heroPhoneRef = ref(null);
const featuresRef = ref(null);
const whatsappTitleRef = ref(null);
const whatsappRef = ref(null);
const clientRef = ref(null);
const howRef = ref(null);
const stepsRef = ref(null);
const whyTitleRef = ref(null);
const whyRef = ref(null);
const contactRef = ref(null);
const ctaRef = ref(null);

onMounted(async () => {
  // Scroll-triggered animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const targets = entry.target.classList.contains('landing-fade-up')
            ? [entry.target]
            : entry.target.querySelectorAll('.landing-fade-up');
          targets.forEach((el) => el.classList.add('is-visible'));
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  // Observe hero elements immediately (they appear on load with a small delay)
  [heroTextRef, heroPhoneRef].forEach((ref) => {
    if (ref.value) {
      setTimeout(() => ref.value?.classList.add('is-visible'), 100);
    }
  });

  // Observe scroll-triggered sections
  [featuresRef, whatsappTitleRef, whatsappRef, clientRef, howRef, stepsRef, whyTitleRef, whyRef, contactRef, ctaRef].forEach((ref) => {
    if (ref.value) observer.observe(ref.value);
  });

  // Check auth in background (no redirect, no blocking)
  const user = await getCurrentUserAsync();
  if (user) {
    isAuthenticated.value = true;
    // If redirected here with ?redirect=, go directly
    const route = useRoute();
    if (route.query.redirect) {
      await redirectUser(user);
    }
  } else if (useRoute().query.redirect) {
    showLoginModal.value = true;
  }
});

async function redirectUser(user) {
  const route = useRoute();
  const redirect = route.query.redirect;
  if (redirect && typeof redirect === 'string' && redirect.startsWith('/')) {
    navigateTo(redirect);
    return;
  }

  const projectStore = useProjectStore();
  await projectStore.fetchClientProjects(user.uid);

  if (projectStore.clientProjects.length > 0) {
    await projectStore.fetchProjects();
    if (projectStore.projects.length > 0) {
      navigateTo('/projects');
    } else {
      navigateTo('/client');
    }
  } else {
    navigateTo('/projects');
  }
}

async function goToDashboard() {
  isLoading.value = true;
  try {
    const user = await getCurrentUserAsync();
    if (user) {
      await redirectUser(user);
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleModalLogin() {
  isLoading.value = true;
  try {
    const user = await signInWithGoogle();
    if (user) {
      useProviderStore().ensureExists();
      showLoginModal.value = false;
      await redirectUser(user);
    }
  } catch (error) {
    console.error('Login error:', error);
    useToast('error', 'Error al iniciar sesión');
  } finally {
    isLoading.value = false;
  }
}

async function handleLogin() {
  isLoading.value = true;
  try {
    const user = await signInWithGoogle();
    if (user) {
      // Ensure provider profile exists (fire-and-forget, don't block login)
      useProviderStore().ensureExists();
      isAuthenticated.value = true;
      await redirectUser(user);
    }
  } catch (error) {
    console.error('Login error:', error);
    useToast('error', 'Error al iniciar sesión');
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
/* ─── Scroll-triggered fade-up ─── */
.landing-fade-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.landing-fade-up.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays */
.landing-delay-100 { transition-delay: 0.1s; }
.landing-delay-200 { transition-delay: 0.2s; }
.landing-delay-300 { transition-delay: 0.3s; }
.landing-delay-400 { transition-delay: 0.4s; }
.landing-delay-500 { transition-delay: 0.5s; }

/* ─── Phone float ─── */
.landing-float {
  animation: landing-float 4s ease-in-out infinite;
}

@keyframes landing-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .landing-fade-up {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .landing-float {
    animation: none;
  }
}

</style>
