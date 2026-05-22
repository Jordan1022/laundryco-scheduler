import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  // Pin the server runtime to UTC so Date parsing, serialization, and Intl
  // formatting all agree, independent of the host's local timezone. Shift
  // walltimes in the DB are stored as UTC walltime (e.g. "10:00" means 10 AM),
  // and display formatters rely on the runtime being UTC to echo them back.
  process.env.TZ = 'UTC'
}

export const onRequestError = Sentry.captureRequestError;
