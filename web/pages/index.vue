<template>
  <div class="bg-go-bg min-h-screen">
    <LandingNavbar :show-login="true" :login-loading="isLoading" :is-authenticated="isAuthenticated" @login="handleLogin" />

    <!-- ═══ HERO ═══ -->
    <section class="relative overflow-hidden">
      <!-- Ambient glow -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-go-primary/[0.04] rounded-full blur-[120px] pointer-events-none"></div>

      <div class="max-w-3xl mx-auto px-5 pt-28 sm:pt-32 text-center">
        <!-- Beta badge -->
        <span class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-go-primary/10 text-go-primary border border-go-primary/20 mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-go-primary animate-pulse"></span>
          Beta gratuita
        </span>

        <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl text-go-text leading-[1.1] tracking-tight mb-6">
          Cada gasto de tu obra,
          <span class="text-go-primary">bajo control.</span>
        </h1>
        <p class="text-go-text-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-2">
          Mandá un texto, una foto del ticket, un audio o un PDF — los datos se extraen solos. Tu cliente ve todo en tiempo real.
        </p>
      </div>

      <!-- Interactive demo -->
      <LandingHeroDemo
        :is-authenticated="isAuthenticated"
        :is-loading="isLoading"
        @login="handleLogin"
        @dashboard="goToDashboard"
      />

      <!-- Hero CTA -->
      <div class="max-w-2xl mx-auto px-5 pb-16 text-center">
        <button
          v-if="isAuthenticated"
          @click="goToDashboard"
          :disabled="isLoading"
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97]"
        >
          <template v-if="!isLoading">Ir al dashboard</template>
          <span v-else class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Cargando...
          </span>
        </button>

        <button
          v-else
          @click="handleLogin"
          :disabled="isLoading"
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97]"
        >
          <svg v-if="!isLoading" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <template v-if="!isLoading">Empezar con Google</template>
          <span v-else class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Ingresando...
          </span>
        </button>
        <p class="text-go-text-muted text-sm mt-4">Sin tarjeta. Sin configuración. Todo gratis durante la beta.</p>
      </div>
    </section>

    <!-- ═══ QUÉ PODÉS REGISTRAR ═══ -->
    <section id="tipos-de-registro" class="py-20 sm:py-28 bg-go-bg-elevated">
      <div class="max-w-6xl mx-auto px-5">
        <div ref="typesRef" class="text-center mb-12 landing-fade-up">
          <p class="text-go-primary text-sm font-medium tracking-wide uppercase mb-3">Qué podés registrar</p>
          <h2 class="font-display text-2xl sm:text-3xl text-go-text">
            Tres movimientos, un sistema que los entiende
          </h2>
        </div>

        <div ref="typesCardsRef" class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Gasto de obra -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 landing-fade-up">
            <div class="w-10 h-10 rounded-go-md bg-go-danger/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-danger" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Gastos de obra</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Materiales, herramientas, transporte — registralo como quieras y se categoriza solo. Tu cliente ve cada peso invertido.
            </p>
          </div>

          <!-- Pago del cliente -->
          <div class="bg-go-surface border border-go-border rounded-go-xl p-6 landing-fade-up landing-delay-100">
            <div class="w-10 h-10 rounded-go-md bg-go-success/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-text text-lg mb-2">Pagos del cliente</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Cuando te transfieren o te dan plata, el saldo se actualiza al instante. Sin dudas de cuánto falta.
            </p>
          </div>

          <!-- Gasto propio (highlighted) -->
          <div class="bg-go-primary-muted border border-go-primary/20 rounded-go-xl p-6 landing-fade-up landing-delay-200">
            <div class="w-10 h-10 rounded-go-md bg-go-primary/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-go-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h3 class="font-display text-go-primary text-lg mb-2">Gastos propios</h3>
            <p class="text-go-text-secondary text-sm leading-relaxed">
              Tu almuerzo, tu nafta, tus herramientas personales. Registrado aparte para que al final de la obra sepas cuánto ganaste de verdad.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CÓMO FUNCIONA (Vertical Stepper) ═══ -->
    <section class="py-20 sm:py-28">
      <div class="max-w-4xl mx-auto px-5">
        <div ref="stepperTitleRef" class="text-center mb-16 landing-fade-up">
          <p class="text-go-primary text-sm font-medium tracking-wide uppercase mb-3">Paso a paso</p>
          <h2 class="font-display text-2xl sm:text-3xl text-go-text">
            De cero a obra controlada
          </h2>
        </div>

        <!-- Timeline -->
        <div ref="stepperRef" class="relative">
          <!-- Vertical line -->
          <div class="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-go-border"></div>

          <div class="space-y-16 md:space-y-20">

            <!-- Step 1: Creá tu proyecto -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">1</div>
              <div class="md:text-right md:pr-16">
                <h3 class="font-display text-xl text-go-text mb-2">Creá tu proyecto</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  Nombre de la obra, presupuesto del cliente y listo. En menos de un minuto tenés todo armado para empezar a registrar.
                </p>
              </div>
              <div class="mt-6 md:mt-0 md:pl-16 flex justify-center md:justify-start">
                <CasquitoWorking :size="80" />
              </div>
            </div>

            <!-- Step 2: Vinculá tu WhatsApp -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up landing-delay-100">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">2</div>
              <!-- Content (right on desktop) -->
              <div class="md:order-2 md:pl-16">
                <h3 class="font-display text-xl text-go-text mb-2">Vinculá tu WhatsApp</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  Conectás tu número una sola vez. Después, todo lo que mandes al bot se registra automáticamente en tu proyecto.
                </p>
              </div>
              <!-- Visual (left on desktop) -->
              <div class="mt-6 md:mt-0 md:order-1 flex justify-center md:justify-end md:pr-16">
                <div class="w-14 h-14 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                  <svg class="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
              </div>
            </div>

            <!-- Step 3: Mandá los gastos -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up landing-delay-200">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">3</div>
              <div class="md:text-right md:pr-16">
                <h3 class="font-display text-xl text-go-text mb-2">Mandá los gastos como te salga</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  Texto, foto de ticket, audio o PDF. Mandalo por WhatsApp y se extraen monto, categoría y detalle automáticamente.
                </p>
              </div>
              <div class="mt-6 md:mt-0 md:pl-16 flex justify-center md:justify-start">
                <div class="flex gap-3">
                  <div class="w-12 h-12 rounded-go-md bg-go-success/10 flex items-center justify-center" title="Texto">
                    <svg class="w-5 h-5 text-go-success" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                  </div>
                  <div class="w-12 h-12 rounded-go-md bg-go-primary/10 flex items-center justify-center" title="Foto">
                    <svg class="w-5 h-5 text-go-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                  </div>
                  <div class="w-12 h-12 rounded-go-md bg-go-warning/10 flex items-center justify-center" title="Audio">
                    <svg class="w-5 h-5 text-go-warning" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                  </div>
                  <div class="w-12 h-12 rounded-go-md bg-go-info/10 flex items-center justify-center" title="PDF">
                    <svg class="w-5 h-5 text-go-info" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 4: Compartí con tu cliente -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up landing-delay-300">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">4</div>
              <!-- Content (right on desktop) -->
              <div class="md:order-2 md:pl-16">
                <h3 class="font-display text-xl text-go-text mb-2">Compartí un link con tu cliente</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  El dueño del depto accede a gastos, categorías y balance en tiempo real. Sin instalar nada, desde el navegador.
                </p>
              </div>
              <!-- Visual (left on desktop) -->
              <div class="mt-6 md:mt-0 md:order-1 flex justify-center md:justify-end md:pr-16">
                <CasquitoHappy :size="80" />
              </div>
            </div>

            <!-- Step 5: Exportá reportes -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up landing-delay-400">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">5</div>
              <div class="md:text-right md:pr-16">
                <h3 class="font-display text-xl text-go-text mb-2">Exportá reportes en PDF</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  Bajá el detalle completo de la obra en cualquier momento. Listo para presentar al cliente o archivar.
                </p>
              </div>
              <div class="mt-6 md:mt-0 md:pl-16 flex justify-center md:justify-start">
                <!-- PDF document illustration -->
                <div class="w-16 h-20 rounded-go-md border-2 border-go-border bg-go-surface flex flex-col items-center justify-center gap-1.5 shadow-go-sm">
                  <svg class="w-6 h-6 text-go-danger" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  <div class="space-y-1">
                    <div class="w-8 h-0.5 bg-go-border-subtle rounded-full"></div>
                    <div class="w-6 h-0.5 bg-go-border-subtle rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 6: Sabé cuánto ganaste -->
            <div class="relative pl-14 md:pl-0 md:grid md:grid-cols-2 md:gap-12 items-center landing-fade-up landing-delay-500">
              <div class="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-go-primary text-white flex items-center justify-center font-display font-bold text-sm shadow-go-sm z-10">6</div>
              <!-- Content (right on desktop) -->
              <div class="md:order-2 md:pl-16">
                <h3 class="font-display text-xl text-go-text mb-2">Sabé cuánto ganaste de verdad</h3>
                <p class="text-go-text-secondary text-sm leading-relaxed">
                  Tus gastos propios quedan separados. Al final de la obra, sabés exactamente lo que te quedó en el bolsillo.
                </p>
              </div>
              <!-- Visual (left on desktop) -->
              <div class="mt-6 md:mt-0 md:order-1 flex justify-center md:justify-end md:pr-16">
                <CasquitoHappy :size="100" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CLIENT VIEW ═══ -->
    <section class="py-20 sm:py-28 bg-go-bg-elevated">
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

    <!-- ═══ COMPARISON TABLE ═══ -->
    <section class="py-20 sm:py-28">
      <div class="max-w-4xl mx-auto px-5">
        <div ref="tableRef" class="landing-fade-up">
          <div class="text-center mb-12">
            <h2 class="font-display text-2xl sm:text-3xl text-go-text mb-3">
              ¿Todavía con papel o Excel?
            </h2>
            <p class="text-go-text-secondary max-w-lg mx-auto">
              Compará las opciones y decidí vos.
            </p>
          </div>

          <div class="bg-go-surface border border-go-border rounded-go-xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-go-bg-elevated">
                    <th class="text-left px-5 py-3.5 text-go-text-secondary text-xs uppercase tracking-wide font-medium min-w-[180px]"></th>
                    <th class="px-4 py-3.5 text-center text-go-text-muted text-xs uppercase tracking-wide font-medium w-24">Papel</th>
                    <th class="px-4 py-3.5 text-center text-go-text-muted text-xs uppercase tracking-wide font-medium w-24">Excel</th>
                    <th class="px-4 py-3.5 text-center text-xs uppercase tracking-wide font-semibold w-28 bg-go-primary/[0.07] text-go-primary">Gasto Obra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparisonRows" :key="row.feature" class="border-t border-go-border-subtle">
                    <td class="px-5 py-3 text-go-text font-medium">{{ row.feature }}</td>
                    <td class="px-4 py-3 text-center">
                      <svg v-if="row.paper" class="w-4.5 h-4.5 text-go-success mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      <svg v-else class="w-4.5 h-4.5 text-go-text-muted/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <svg v-if="row.excel === true" class="w-4.5 h-4.5 text-go-success mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      <span v-else-if="row.excel === 'partial'" class="text-go-warning font-semibold text-xs">Manual</span>
                      <svg v-else class="w-4.5 h-4.5 text-go-text-muted/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </td>
                    <td class="px-4 py-3 text-center bg-go-primary/[0.04]">
                      <svg class="w-4.5 h-4.5 text-go-success mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ FINAL CTA ═══ -->
    <section class="py-20 sm:py-28 bg-go-bg-elevated">
      <div ref="ctaRef" class="max-w-3xl mx-auto px-5 text-center landing-fade-up">
        <CasquitoHappy :size="120" class="mx-auto mb-6" />

        <h2 class="font-display text-2xl sm:text-3xl text-go-text mb-3">
          Empezá a controlar tu obra hoy
        </h2>
        <p class="text-go-text-secondary mb-8 max-w-lg mx-auto">
          Estamos en beta — es gratis, y queremos tu feedback. Creá tu cuenta en un minuto, sin tarjeta ni configuración.
        </p>

        <!-- Authenticated: go to dashboard -->
        <button
          v-if="isAuthenticated"
          @click="goToDashboard"
          :disabled="isLoading"
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97]"
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
          class="inline-flex items-center gap-3 text-base px-8 py-3.5 rounded-go-lg shadow-go-md hover:shadow-go-lg transition-all font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97]"
        >
          <svg v-if="!isLoading" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <template v-if="!isLoading">Empezar con Google</template>
          <span v-else class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Ingresando...
          </span>
        </button>

        <p class="text-go-text-muted text-sm mt-6">
          ¿Dudas? <NuxtLink to="/contactanos" class="text-go-primary hover:underline">Escribinos</NuxtLink>
          o revisá las <NuxtLink to="/faq" class="text-go-primary hover:underline">preguntas frecuentes</NuxtLink>.
        </p>
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
                class="w-full inline-flex items-center justify-center gap-3 text-base px-6 py-3 rounded-go-lg font-semibold bg-go-primary text-white hover:bg-go-primary-hover active:scale-[0.97] transition-all"
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

// Section refs for scroll animations
const typesRef = ref(null);
const typesCardsRef = ref(null);
const stepperTitleRef = ref(null);
const stepperRef = ref(null);
const clientRef = ref(null);
const tableRef = ref(null);
const ctaRef = ref(null);

// Comparison table data
const comparisonRows = [
  { feature: 'Registro por WhatsApp', paper: false, excel: false, gastoObra: true },
  { feature: 'Foto, audio y PDF', paper: false, excel: false, gastoObra: true },
  { feature: 'Categorización automática', paper: false, excel: false, gastoObra: true },
  { feature: 'Balance automático', paper: false, excel: 'partial', gastoObra: true },
  { feature: 'Vista del cliente en vivo', paper: false, excel: false, gastoObra: true },
  { feature: 'Reportes en PDF', paper: false, excel: 'partial', gastoObra: true },
  { feature: 'Gastos propios separados', paper: false, excel: 'partial', gastoObra: true },
  { feature: 'Uso desde el celular', paper: false, excel: false, gastoObra: true },
];

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

  // Observe scroll-triggered sections
  [typesRef, typesCardsRef, stepperTitleRef, stepperRef, clientRef, tableRef, ctaRef].forEach((ref) => {
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
  await Promise.all([
    projectStore.fetchClientProjects(user.uid),
    projectStore.fetchProjects()
  ]);

  const hasProjects = projectStore.projects.length > 0;
  const hasClientProjects = projectStore.clientProjects.length > 0;

  if (!hasProjects && !hasClientProjects) {
    navigateTo('/onboarding');
  } else if (hasClientProjects && !hasProjects) {
    navigateTo('/client');
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

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .landing-fade-up {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
