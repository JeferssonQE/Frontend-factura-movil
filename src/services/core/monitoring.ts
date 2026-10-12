// services/core/monitoring.ts
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

// El plan gratuito son 5.000 errores AL MES, y Sentry cobra por evento, no por issue:
// agrupa los iguales para que se lean, pero la cuota cuenta cada envio. Un fallo dentro
// de un render se repite en cada ciclo, asi que un solo bug puede gastar la cuota de un
// mes en minutos. Eso dejaria ciegos tambien al backend y a Factu API, que comparten la
// misma cuenta y generan mucho menos ruido.
const MAXIMO_POR_SESION = 25;

// Lo que no dice nada util y llega en volumen: extensiones del navegador, fallos de red
// del usuario, navegaciones canceladas. En un frontend suele ser la mitad del trafico.
const RUIDO = [
  // Extensiones de Chrome, Safari y similares inyectando codigo en la pagina.
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-(web-)?extension:\/\//,
  // Conexion caida, pestana cerrada a medias, usuario sin señal. No es un bug nuestro.
  'Failed to fetch',
  'NetworkError when attempting to fetch resource',
  'Load failed',
  'AbortError',
  'The operation was aborted',
  // Un clasico de navegadores: no es un error real, lo emite el propio layout.
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
];

let enviados = 0;

export const initMonitoring = (): void => {
  if (!DSN) return;

  // En desarrollo los errores se ven en la consola, que es mejor sitio para arreglarlos.
  // Mandarlos gastaria cuota de produccion con fallos que nadie sufrio.
  if (import.meta.env.DEV) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: RUIDO,
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],

    // El tope por sesion. Un error repetido 200 veces no enseña nada que no enseñe
    // repetido 3, y la diferencia es la cuota del mes.
    beforeSend: (evento) => {
      enviados += 1;
      if (enviados > MAXIMO_POR_SESION) return null;
      // El ultimo que pasa avisa que a partir de aqui hay silencio, para que nadie lea el
      // panel creyendo que el problema se detuvo solo.
      if (enviados === MAXIMO_POR_SESION) {
        evento.message = `${evento.message ?? ''} [tope de ${MAXIMO_POR_SESION} alcanzado: el resto de esta sesion no se reporta]`;
      }
      return evento;
    },
  });
};

export const reportError = (error: unknown, context?: Record<string, unknown>): void => {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};
