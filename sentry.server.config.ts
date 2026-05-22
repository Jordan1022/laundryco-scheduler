// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://07ac8653ccbecafaa776d4995a83ebdf@o4511435304009728.ingest.us.sentry.io/4511435308400640",

  // Only send events in production — keeps dev/test errors out of the Sentry
  // quota. Sentry API calls (captureException, etc.) become no-ops otherwise.
  enabled: process.env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Disable sending user PII (IPs, headers, names) — this is an employee
  // scheduling app, so error context is kept free of personal data.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
