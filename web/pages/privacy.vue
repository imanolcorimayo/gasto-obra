<template>
  <div class="min-h-screen bg-go-bg flex flex-col">
    <LandingNavbar />

    <!-- Spacer for fixed navbar -->
    <div class="h-16"></div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
      <h1 class="font-display font-bold text-3xl text-go-text mb-1">Política de Privacidad</h1>
      <p class="text-go-text-secondary text-sm mb-8">Última actualización: 6 de marzo de 2026</p>

      <div class="space-y-8 text-go-text-secondary leading-relaxed">
        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">1. Responsables</h2>
          <p>
            Gasto Obra es operado por Andrea Lopez Palomeque e Imanol Corimayo
            (en adelante, "nosotros"). Esta política describe cómo recopilamos,
            usamos y protegemos la información de los usuarios de nuestra
            plataforma.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">2. Información que recopilamos</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Datos de cuenta:</strong> nombre, número de teléfono y
              correo electrónico proporcionados al registrarse.
            </li>
            <li>
              <strong>Mensajes de WhatsApp:</strong> textos, imágenes de
              comprobantes y audios enviados a través de WhatsApp para registrar
              gastos.
            </li>
            <li>
              <strong>Datos de gastos:</strong> montos, descripciones,
              categorías y proyectos asociados a cada gasto registrado.
            </li>
            <li>
              <strong>Datos de uso:</strong> información básica sobre cómo se
              utiliza la plataforma web.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">3. Cómo usamos la información</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>Registrar y organizar gastos de obras y remodelaciones.</li>
            <li>Enviar resúmenes diarios de gastos a los clientes vía WhatsApp.</li>
            <li>Procesar imágenes de comprobantes y audios para extraer datos de gastos.</li>
            <li>Mejorar el funcionamiento de la plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">4. Servicios de terceros</h2>
          <p>Utilizamos los siguientes servicios de terceros:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Meta (WhatsApp Business API):</strong> para enviar y recibir mensajes.</li>
            <li><strong>Google Firebase:</strong> para autenticación, base de datos y alojamiento.</li>
            <li><strong>Google Gemini:</strong> para procesar imágenes de comprobantes y transcribir audios.</li>
          </ul>
          <p class="mt-2">
            No vendemos ni compartimos datos personales con terceros para fines
            publicitarios o de marketing.
          </p>

        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">5. Almacenamiento y seguridad</h2>
          <p>
            Los datos se almacenan en servidores de Google Firebase. Utilizamos
            medidas de seguridad estándar de la industria para proteger la
            información, incluyendo conexiones cifradas (HTTPS) y reglas de
            acceso a la base de datos.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">6. Retención de datos</h2>
          <p>
            Conservamos los datos mientras la cuenta del usuario esté activa o
            mientras sea necesario para prestar el servicio. Los usuarios pueden
            solicitar la eliminación de sus datos en cualquier momento.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">7. Derechos de los usuarios</h2>
          <p>Los usuarios tienen derecho a:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Acceder a sus datos personales.</li>
            <li>Solicitar la corrección de datos inexactos.</li>
            <li>Solicitar la eliminación de sus datos.</li>
            <li>Desvincular su cuenta de WhatsApp en cualquier momento enviando "DESVINCULAR".</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">8. Contacto</h2>
          <p>
            Para consultas sobre privacidad o para ejercer tus derechos, podés
            contactarnos por correo electrónico a
            <a href="mailto:imanolcorimayo@gmail.com" class="text-go-primary underline">
              imanolcorimayo@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text mb-3">9. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Cualquier cambio
            será publicado en esta página con la fecha de actualización
            correspondiente.
          </p>
        </section>
      </div>
    </div>

    <LandingFooter />
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'landing'
});

useHead({
  title: 'Política de Privacidad - Gasto Obra',
  link: [{ rel: 'canonical', href: 'https://gastoobra.com/privacy' }],
})

useSeoMeta({
  description: 'Política de privacidad de Gasto Obra. Conocé cómo protegemos tus datos y qué información recopilamos.',
  ogTitle: 'Política de Privacidad - Gasto Obra',
  ogDescription: 'Política de privacidad de Gasto Obra. Conocé cómo protegemos tus datos y qué información recopilamos.',
  ogType: 'website',
  ogUrl: 'https://gastoobra.com/privacy',
  ogImage: 'https://gastoobra.com/img/logo.png',
  twitterCard: 'summary',
  twitterTitle: 'Política de Privacidad - Gasto Obra',
  twitterDescription: 'Política de privacidad de Gasto Obra.',
})
</script>
