// components/OfflineOverlay.tsx
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineOverlay = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Sin conexión a internet"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center px-8 bg-primary/95 backdrop-blur-xl animate-in fade-in duration-300"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: 'radial-gradient(circle at 50% 38%, rgba(43,127,255,0.22), transparent 60%)',
        }}
      />

      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-28 w-28 rounded-full bg-accent/25 animate-ping" />
        <span className="absolute inline-flex h-24 w-24 rounded-full bg-accent/10" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <WifiOff size={34} strokeWidth={2.2} className="text-white" />
        </div>
      </div>

      <h2
        className="relative mt-9 text-2xl font-extrabold tracking-tight text-white"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
      >
        Sin conexión
      </h2>

      <p className="relative mt-3 max-w-xs text-center text-sm leading-relaxed text-white/70">
        Revisa tu internet para seguir. Tu sesión sigue activa: no necesitas volver a iniciar
        sesión.
      </p>

      <div className="relative mt-9 flex items-center gap-2.5 text-white/45">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Reconectando</span>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
        </span>
      </div>
    </div>
  );
};

export default OfflineOverlay;
