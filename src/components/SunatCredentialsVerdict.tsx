// components/SunatCredentialsVerdict.tsx

import { AlertCircle, CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import type React from 'react';
import { CHECKING_CREDENTIALS_MESSAGE, CREDENTIALS_VERDICT } from '../config/sunatCredentials';
import type { CheckPhase } from '../hooks/useSunatCredentialsCheck';
import type { SunatCredentialsStatus } from '../types';

interface SunatCredentialsVerdictProps {
  phase: CheckPhase;
  status: SunatCredentialsStatus | null;
  /** Mensaje del error de red; con veredicto de SUNAT manda el copy compartido. */
  errorMessage: string;
  onRetry: () => void;
  onAccept: () => void;
}

const TONES: Record<SunatCredentialsStatus, string> = {
  VALIDA: 'bg-emerald-50 text-emerald-600',
  INVALIDA: 'bg-red-50 text-red-500',
  PENDIENTE: 'bg-amber-50 text-amber-600',
};

const ICONS: Record<SunatCredentialsStatus, React.ReactNode> = {
  VALIDA: <CheckCircle2 size={30} />,
  INVALIDA: <AlertCircle size={30} />,
  PENDIENTE: <CloudOff size={30} />,
};

/** Resultado compacto de la verificacion, para los modales de credenciales. */
const SunatCredentialsVerdict: React.FC<SunatCredentialsVerdictProps> = ({
  phase,
  status,
  errorMessage,
  onRetry,
  onAccept,
}) => {
  if (phase === 'checking') {
    return (
      <Body
        tone="bg-blue-50 text-blue-600"
        icon={<Loader2 size={30} className="animate-spin" />}
        title="Probando tu acceso"
        message={CHECKING_CREDENTIALS_MESSAGE}
      />
    );
  }

  const verdict: SunatCredentialsStatus = status ?? 'PENDIENTE';
  const copy = CREDENTIALS_VERDICT[verdict];
  const rejected = verdict === 'INVALIDA';

  return (
    <>
      <Body
        tone={TONES[verdict]}
        icon={ICONS[verdict]}
        title={copy.title}
        message={phase === 'error' ? errorMessage : copy.message}
      />
      {rejected ? (
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all"
          >
            Corregir credenciales
          </button>
          <button
            onClick={onAccept}
            className="w-full py-4 bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl active:bg-slate-200 transition-all"
          >
            Más tarde
          </button>
        </div>
      ) : (
        <button
          onClick={onAccept}
          className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          {verdict === 'VALIDA' ? 'Listo' : 'Entendido'}
        </button>
      )}
    </>
  );
};

const Body: React.FC<{
  tone: string;
  icon: React.ReactNode;
  title: string;
  message: string;
}> = ({ tone, icon, title, message }) => (
  <div className="py-4 text-center mb-4">
    <div
      className={`w-16 h-16 mx-auto mb-6 rounded-[26px] flex items-center justify-center ${tone}`}
    >
      {icon}
    </div>
    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">{title}</h3>
    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-[260px] mx-auto">
      {message}
    </p>
  </div>
);

export default SunatCredentialsVerdict;
