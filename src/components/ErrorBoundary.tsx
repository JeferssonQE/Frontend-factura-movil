import * as Sentry from '@sentry/react';
import { RefreshCw } from 'lucide-react';
import type React from 'react';
import Button from './ui/Button';

const ErrorFallback: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-8 text-center">
    <img
      src="/logo-icon.png"
      alt=""
      className="size-16 opacity-90"
      style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
    />
    <div className="space-y-2">
      <p className="text-lg font-bold text-slate-900">Algo salió mal</p>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">
        Tuvimos un problema inesperado. Nuestro equipo ya fue notificado. Intenta recargar la
        aplicación.
      </p>
    </div>
    <Button variant="secondary" onClick={() => window.location.reload()}>
      <RefreshCw size={16} />
      Recargar
    </Button>
  </div>
);

export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>{children}</Sentry.ErrorBoundary>
);
