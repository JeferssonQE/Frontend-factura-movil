// components/Toast.tsx
import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const isError = type === 'error';

  return (
    <div className="fixed top-0 left-0 right-0 z-[400] flex justify-center px-4 pt-4 pointer-events-none">
      <div
        role="alert"
        className={`pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-[22px] px-5 py-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${
          isError ? 'bg-red-600 text-white shadow-red-200/50' : 'bg-slate-900 text-white shadow-slate-300/40'
        }`}
      >
        {isError ? (
          <AlertTriangle size={20} className="shrink-0" />
        ) : (
          <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
        )}
        <p className="flex-1 text-xs font-bold leading-snug">{message}</p>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-1 rounded-full hover:bg-white/15 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
