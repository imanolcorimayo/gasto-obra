<template>
  <div class="min-h-screen bg-go-surface-primary py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <h1 class="text-3xl font-bold text-go-text-primary mb-8">Politica de Privacidad</h1>
      <p class="text-go-text-secondary mb-4">Ultima actualizacion: 6 de marzo de 2026</p>

      <div class="space-y-8 text-go-text-secondary leading-relaxed">
        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">1. Responsables</h2>
          <p>
            Gasto Obra es operado por Andrea Lopez Palomeque e Imanol Corimayo
            (en adelante, "nosotros"). Esta politica describe como recopilamos,
            usamos y protegemos la informacion de los usuarios de nuestra
            plataforma.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">2. Informacion que recopilamos</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Datos de cuenta:</strong> nombre, numero de telefono y
              correo electronico proporcionados al registrarse.
            </li>
            <li>
              <strong>Mensajes de WhatsApp:</strong> textos, imagenes de
              comprobantes y audios enviados a traves de WhatsApp para registrar
              gastos.
            </li>
            <li>
              <strong>Datos de gastos:</strong> montos, descripciones,
              categorias y proyectos asociados a cada gasto registrado.
            </li>
            <li>
              <strong>Datos de uso:</strong> informacion basica sobre como se
              utiliza la plataforma web.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">3. Como usamos la informacion</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>Registrar y organizar gastos de obras y remodelaciones.</li>
            <li>Enviar resumenes diarios de gastos a los clientes via WhatsApp.</li>
            <li>Procesar imagenes de comprobantes y audios para extraer datos de gastos.</li>
            <li>Mejorar el funcionamiento de la plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">4. Servicios de terceros</h2>
          <p>Utilizamos los siguientes servicios de terceros:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Meta (WhatsApp Business API):</strong> para enviar y recibir mensajes.</li>
            <li><strong>Google Firebase:</strong> para autenticacion, base de datos y alojamiento.</li>
            <li><strong>Google Gemini:</strong> para procesar imagenes de comprobantes y transcribir audios.</li>
          </ul>
          <p class="mt-2">
            No vendemos ni compartimos datos personales con terceros para fines
            publicitarios o de marketing.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">5. Almacenamiento y seguridad</h2>
          <p>
            Los datos se almacenan en servidores de Google Firebase. Utilizamos
            medidas de seguridad estandar de la industria para proteger la
            informacion, incluyendo conexiones cifradas (HTTPS) y reglas de
            acceso a la base de datos.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">6. Retencion de datos</h2>
          <p>
            Conservamos los datos mientras la cuenta del usuario este activa o
            mientras sea necesario para prestar el servicio. Los usuarios pueden
            solicitar la eliminacion de sus datos en cualquier momento.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">7. Derechos de los usuarios</h2>
          <p>Los usuarios tienen derecho a:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Acceder a sus datos personales.</li>
            <li>Solicitar la correccion de datos inexactos.</li>
            <li>Solicitar la eliminacion de sus datos.</li>
            <li>Desvincular su cuenta de WhatsApp en cualquier momento enviando "DESVINCULAR".</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">8. Contacto</h2>
          <p>
            Para consultas sobre privacidad o para ejercer tus derechos, podes
            contactarnos por correo electronico a
            <a href="mailto:imanolcorimayo@gmail.com" class="text-go-accent-primary underline">
              imanolcorimayo@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-go-text-primary mb-3">9. Cambios en esta politica</h2>
          <p>
            Podemos actualizar esta politica periodicamente. Cualquier cambio
            sera publicado en esta pagina con la fecha de actualizacion
            correspondiente.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'landing'
});

useHead({
  title: 'Politica de Privacidad - Gasto Obra',
})
</script>
