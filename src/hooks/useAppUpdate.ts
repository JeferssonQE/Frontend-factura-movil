// hooks/useAppUpdate.ts
import { useRegisterSW } from 'virtual:pwa-register/react';

// El navegador solo busca un service worker nuevo al cargar la pagina, y una bodega deja
// la app abierta todo el dia: sin esto, un deploy no le llega hasta que cierre la app.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

const watchForUpdates = (registration: ServiceWorkerRegistration): void => {
  const checkForUpdate = () => {
    if (!navigator.onLine) return;
    // Un fallo aqui es de red y no le importa al usuario: la proxima revision reintenta.
    registration.update().catch(() => undefined);
  };

  setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
};

export const useAppUpdate = () => {
  const {
    needRefresh: [updateAvailable, setUpdateAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, registration) => {
      if (registration) watchForUpdates(registration);
    },
  });

  return {
    updateAvailable,
    applyUpdate: () => updateServiceWorker(true),
    dismiss: () => setUpdateAvailable(false),
  };
};
