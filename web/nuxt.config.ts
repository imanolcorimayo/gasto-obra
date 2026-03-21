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
  ],

  sourcemap: { client: 'hidden' },

  dayjs: {
    locales: ['es'],
    defaultLocale: 'es',
  },

  routeRules: {
    '/': { prerender: true },
    '/faq': { prerender: true },
    '/privacy': { prerender: true },
    '/projects': { ssr: false },
    '/projects/**': { ssr: false },
    '/settings/**': { ssr: false },
    '/view/**': { ssr: false },
    '/client/**': { ssr: false },
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
        { rel: "icon", type: "image/png", href: "/img/logo.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,300..900;1,300..900&family=Space+Grotesk:wght@500;600;700&display=swap" },
      ],
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0"
        }
      ]
    }
  },

  compatibilityDate: "2024-07-13"
});
