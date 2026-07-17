// services/core/monitoring.ts
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export const initMonitoring = (): void => {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
};

export const reportError = (
  error: unknown,
  context?: Record<string, unknown>
): void => {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};
