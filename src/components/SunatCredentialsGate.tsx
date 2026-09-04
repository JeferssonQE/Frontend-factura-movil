// components/SunatCredentialsGate.tsx

import { CheckCircle2, CloudOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import { CREDENTIALS_VERDICT } from '../config/sunatCredentials';
import { useSunatCredentialsCheck } from '../hooks/useSunatCredentialsCheck';

interface SunatCredentialsGateProps {
  empresaName: string;
  onVerified: () => void | Promise<void>;
  onFixCredentials: () => void | Promise<void>;
  onSkip: () => void;
  /** Id de la empresa cuando quien verifica es un contador, no la propia empresa. */
  empresaUserId?: string;
}

/**
 * Comprueba el acceso a SUNAT antes de dejar llenar un comprobante.
 *
 * Solo se monta cuando el estado de las credenciales es PENDIENTE (nunca se pudieron
 * verificar). La espera no esta acotada porque la verificacion comparte cola con las
 * emisiones, asi que siempre hay salida: si SUNAT rechaza el login la emision falla sin
 * emitir nada y el comprobante queda reintentable.
 */
const SunatCredentialsGate: React.FC<SunatCredentialsGateProps> = ({
  empresaName,
  onVerified,
  onFixCredentials,
  onSkip,
  empresaUserId,
}) => {
  const { phase, status, message, check } = useSunatCredentialsCheck(undefined, empresaUserId);

  useEffect(() => {
    check();
  }, [check]);

  const handleVerified = async () => {
    await onVerified();
  };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-xs">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 truncate">
          {empresaName}
        </p>

        {phase !== 'done' && phase !== 'error' && (
          <>
            <IconBadge className="bg-blue-50 text-blue-600">
              <Loader2 size={38} className="animate-spin" />
            </IconBadge>
            <Title>Verificando tu acceso</Title>
            <Message>
              Estamos probando tus credenciales en SUNAT para confirmar que puedes emitir.
            </Message>
            <button
              onClick={onSkip}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 active:text-slate-600 transition-colors"
            >
              Continuar sin verificar
            </button>
          </>
        )}

        {phase === 'done' && status === 'VALIDA' && (
          <>
            <IconBadge className="bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={38} />
            </IconBadge>
            <Title>Credenciales verificadas</Title>
            <Message>{CREDENTIALS_VERDICT.VALIDA.message}</Message>
            <PrimaryButton onClick={handleVerified} className="bg-blue-600 shadow-blue-200/50">
              <ShieldCheck size={20} /> Empezar a emitir
            </PrimaryButton>
          </>
        )}

        {phase === 'done' && status === 'INVALIDA' && (
          <>
            <IconBadge className="bg-red-50 text-red-500">
              <KeyRound size={38} />
            </IconBadge>
            <Title>{CREDENTIALS_VERDICT.INVALIDA.title}</Title>
            <Message>{CREDENTIALS_VERDICT.INVALIDA.message}</Message>
            <PrimaryButton
              onClick={onFixCredentials}
              className="bg-gradient-to-r from-orange-500 to-red-500 shadow-red-200/50"
            >
              <KeyRound size={20} /> Corregir credenciales
            </PrimaryButton>
          </>
        )}

        {(phase === 'error' || (phase === 'done' && status === 'PENDIENTE')) && (
          <>
            <IconBadge className="bg-amber-50 text-amber-600">
              <CloudOff size={38} />
            </IconBadge>
            <Title>No pudimos verificar</Title>
            <Message>{phase === 'error' ? message : CREDENTIALS_VERDICT.PENDIENTE.message}</Message>
            <PrimaryButton onClick={onSkip} className="bg-slate-900 shadow-slate-200/50">
              Continuar de todos modos
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
};

const IconBadge: React.FC<{ className: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={`w-20 h-20 mx-auto mb-6 rounded-[32px] flex items-center justify-center ${className}`}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">{children}</h2>
);

const Message: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-slate-500 text-sm leading-relaxed mb-8">{children}</p>
);

const PrimaryButton: React.FC<{
  onClick: () => void | Promise<void>;
  className: string;
  children: React.ReactNode;
}> = ({ onClick, className, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-white h-16 rounded-[24px] shadow-xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 ${className}`}
  >
    {children}
  </button>
);

export default SunatCredentialsGate;
