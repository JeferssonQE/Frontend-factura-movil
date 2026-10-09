// components/Toast.tsx

import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const isError = type === 'error';

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[400] flex justify-center px-4 pt-4">
      <div
        role="alert"
        className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card px-5 py-4 text-white shadow-2xl ${
          isError ? 'bg-danger' : 'bg-primary'
        }`}
      >
        {isError ? (
          <AlertTriangle size={20} className="shrink-0" />
        ) : (
          <CheckCircle2 size={20} className="shrink-0" />
        )}
        <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
