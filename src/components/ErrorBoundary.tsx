import React from 'react';
import * as Sentry from '@sentry/react';
import { RefreshCw } from 'lucide-react';

const ErrorFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-8 text-center gap-6">
    <img
      src="/logo-icon.png"
      alt=""
      className="w-16 h-16 opacity-90"
      style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
    />
    <div className="space-y-2">
      <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
        Algo salió mal
      </p>
      <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-xs">
        Tuvimos un problema inesperado. Nuestro equipo ya fue notificado.
        Intenta recargar la aplicación.
      </p>
    </div>
    <button
      onClick={() => window.location.reload()}
      className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform"
    >
      <RefreshCw size={13} strokeWidth={3} />
      Recargar
    </button>
  </div>
);

export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    {children}
  </Sentry.ErrorBoundary>
);
