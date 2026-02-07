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
    "unplugin-icons/nuxt"
  ],

  dayjs: {
    locales: ['es'],
    defaultLocale: 'es',
  },

  routeRules: {
    '/': { prerender: true },
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
    }
  },

  app: {
    head: {
      htmlAttrs: { dir: "ltr", lang: "es" },
      link: [{ rel: "icon", type: "image/png", href: "/img/logo.png" }],
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        }
      ]
    }
  },

  compatibilityDate: "2024-07-13"
});
