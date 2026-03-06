import * as Sentry from '@sentry/nuxt';

const config = useRuntimeConfig();

Sentry.init({
  dsn: config.public.sentryDsn,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
});
