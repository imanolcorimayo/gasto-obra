// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ["~/assets/css/main.css", "vue3-toastify/dist/index.css"],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },

  modules: [
    "dayjs-nuxt",
    "@vueuse/nuxt",
    "@pinia/nuxt",
    "unplugin-icons/nuxt",
    "@sentry/nuxt/module",
    "@vite-pwa/nuxt",
  ],

  pwa: {
    registerType: "prompt",
    manifest: {
      name: "Gasto Obra",
      short_name: "Gasto Obra",
      description: "Seguimiento de gastos de obra vía WhatsApp",
      lang: "es-AR",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#F5F0E8",
      theme_color: "#F5F0E8",
      icons: [
        { src: "/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/img/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/img/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        {
          name: "Mis proyectos",
          short_name: "Proyectos",
          description: "Ver la lista de obras",
          url: "/projects",
        },
        {
          name: "Nuevo proyecto",
          short_name: "Nuevo",
          description: "Crear una obra nueva",
          url: "/projects/new",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
    },
    devOptions: { enabled: false },
  },

  sourcemap: { client: 'hidden' },

  dayjs: {
    locales: ['es'],
    defaultLocale: 'es',
  },

  routeRules: {
    '/': { prerender: true },
    '/faq': { prerender: true },
    '/privacy': { prerender: true },
    '/offline': { prerender: true },
    '/projects': { ssr: false },
    '/projects/**': { ssr: false },
    '/settings/**': { ssr: false },
    '/view/**': { ssr: false },
    '/client/**': { ssr: false },
    '/onboarding': { ssr: false },
  },

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      whatsappNumber: process.env.WHATSAPP_NUMBER,
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4002',
    }
  },

  app: {
    head: {
      htmlAttrs: { dir: "ltr", lang: "es" },
      link: [
        { rel: "icon", type: "image/png", href: "/img/favicon-32.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/img/apple-touch-icon.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,300..900;1,300..900&family=Space+Grotesk:wght@500;600;700&display=swap", media: "print", onload: "this.media='all'" },
      ],
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, maximum-scale=5.0"
        },
        { name: "theme-color", content: "#F5F0E8" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: "Gasto Obra" },
      ]
    }
  },

  compatibilityDate: "2024-07-13"
});
