// components/UpdatePrompt.tsx
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

// Abajo y sobre la barra de navegacion: arriba vive el Toast, y los dos pueden coincidir.
const UpdatePrompt = () => {
  const { updateAvailable, applyUpdate, dismiss } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[400] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card bg-primary py-3 pl-5 pr-3 text-white shadow-2xl"
      >
        <RefreshCw size={20} className="shrink-0 text-accent" />
        <p className="flex-1 text-sm font-medium leading-snug">Hay una versión nueva</p>
        <button
          type="button"
          onClick={applyUpdate}
          className="shrink-0 rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
        >
          Actualizar
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ahora no"
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
