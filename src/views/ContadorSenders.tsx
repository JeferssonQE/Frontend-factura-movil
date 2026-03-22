import React from 'react';
import { Building2, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Sender, AuthUser } from '../types';

interface ContadorSendersProps {
  user: AuthUser;
  senders: Sender[];
  activeSenderId: number | null;
  loading: boolean;
  onSelect: (senderId: number) => void;
}

const ContadorSenders: React.FC<ContadorSendersProps> = ({
  user,
  senders,
  activeSenderId,
  loading,
  onSelect,
}) => {
  const firstName = user.name?.split(' ')[0] ?? 'Contador';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center">
          <RefreshCw className="animate-spin text-slate-400" size={26} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Cargando empresas...
        </p>
      </div>
    );
  }

  if (senders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center">
          <Building2 size={28} className="text-slate-300" />
        </div>
        <div>
          <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
            Sin empresas asignadas
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Contacta al administrador para que te asigne empresas.
          </p>
        </div>
      </div>
    );
  }

  const activeSender = senders.find((s) => s.id === activeSenderId) ?? null;
  const otherSenders = senders.filter((s) => s.id !== activeSenderId);

  return (
    <div className="space-y-5 pb-8">
      <div className="pt-2 pb-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Hola, {firstName}
        </p>
        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight mt-0.5">
          {senders.length} empresa{senders.length !== 1 ? 's' : ''} asignada{senders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {activeSender && (
        <div className="bg-slate-900 rounded-[28px] p-5 shadow-xl shadow-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={13} className="text-emerald-400" strokeWidth={3} />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
              Operando ahora
            </span>
          </div>

          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-[14px] uppercase tracking-tight leading-tight truncate">
                {activeSender.name}
              </p>
              <p className="text-white/50 text-[10px] font-medium mt-0.5">
                RUC: {activeSender.ruc}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelect(activeSender.id)}
            className="w-full bg-white text-slate-900 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Operar ahora
            <ArrowRight size={14} strokeWidth={3} />
          </button>
        </div>
      )}

      {otherSenders.length > 0 && (
        <div>
          {activeSender && (
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
              Cambiar empresa
            </p>
          )}

          <div className="space-y-2.5">
            {otherSenders.map((sender) => (
              <div
                key={sender.id}
                className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-slate-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate">
                    {sender.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    RUC: {sender.ruc}
                  </p>
                </div>

                <button
                  onClick={() => onSelect(sender.id)}
                  className="shrink-0 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  Entrar
                  <ArrowRight size={11} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContadorSenders;
