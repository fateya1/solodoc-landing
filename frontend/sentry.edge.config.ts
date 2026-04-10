import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: "https://138d7816c22aab8f11c9c859e4aa07c5@o4511175593164800.ingest.us.sentry.io/4511175597490176",
  tracesSampleRate: 1.0,
});
