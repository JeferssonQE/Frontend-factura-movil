import React from 'react';
import { Building2, ArrowRight, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { Sender, AuthUser, AdminUserRow } from '../types';

interface ContadorSendersProps {
  user: AuthUser;
  empresas: AdminUserRow[];
  selectedEmpresaId: string | null;
  senders: Sender[];
  activeSenderId: number | null;
  loading: boolean;
  sendersLoading: boolean;
  onSelectEmpresa: (id: string) => void;
  onSelectSender: (id: number) => void;
}

const getInitials = (u: AdminUserRow): string => {
  const base = u.name || u.email;
  if (base.includes('@')) return base.substring(0, 2).toUpperCase();
  return base
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const ContadorSenders: React.FC<ContadorSendersProps> = ({
  user,
  empresas,
  selectedEmpresaId,
  senders,
  activeSenderId,
  loading,
  sendersLoading,
  onSelectEmpresa,
  onSelectSender,
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

  if (empresas.length === 0) {
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

  const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId) ?? null;
  const activeSender = senders.find((s) => s.id === activeSenderId) ?? null;
  const otherSenders = senders.filter((s) => s.id !== activeSenderId);

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="pt-2 pb-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Hola, {firstName}
        </p>
        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight mt-0.5">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} asignada{empresas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Step 1: Empresa selector */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
          1 · Selecciona una empresa
        </p>
        <div className="space-y-2">
          {empresas.map((empresa) => {
            const isSelected = empresa.id === selectedEmpresaId;
            return (
              <button
                key={empresa.id}
                onClick={() => onSelectEmpresa(empresa.id)}
                className={[
                  'w-full flex items-center gap-3 rounded-[22px] px-4 py-3.5 text-left transition-all active:scale-[0.98]',
                  isSelected
                    ? 'bg-slate-900 shadow-xl shadow-slate-200'
                    : 'bg-white border border-slate-100 shadow-sm hover:border-slate-200',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[11px] shrink-0',
                    isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {getInitials(empresa)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'text-[11px] font-black uppercase tracking-tight truncate leading-tight',
                      isSelected ? 'text-white' : 'text-slate-800',
                    ].join(' ')}
                  >
                    {empresa.name || '—'}
                  </p>
                  <p
                    className={[
                      'text-[9px] truncate mt-0.5',
                      isSelected ? 'text-white/50' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {empresa.email}
                  </p>
                </div>
                {isSelected ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" strokeWidth={3} />
                ) : (
                  <ChevronRight size={15} className="text-slate-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Senders de la empresa seleccionada */}
      {selectedEmpresa && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
            2 · Elige el emisor de {selectedEmpresa.name || selectedEmpresa.email}
          </p>

          {sendersLoading ? (
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm py-10 flex flex-col items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Cargando emisores...
              </p>
            </div>
          ) : senders.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-dashed border-slate-200 py-10 flex flex-col items-center gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-[18px] bg-slate-100 flex items-center justify-center">
                <Building2 size={20} className="text-slate-300" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Sin emisores registrados
              </p>
              <p className="text-[9px] text-slate-300">
                Esta empresa aún no tiene empresas emisoras configuradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                    onClick={() => onSelectSender(activeSender.id)}
                    className="w-full bg-white text-slate-900 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    Operar ahora
                    <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
              )}

              {otherSenders.length > 0 && (
                <div className="space-y-2.5">
                  {activeSender && (
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Cambiar emisor
                    </p>
                  )}
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
                        <p className="text-[10px] text-slate-400 mt-0.5">RUC: {sender.ruc}</p>
                      </div>
                      <button
                        onClick={() => onSelectSender(sender.id)}
                        className="shrink-0 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        Entrar
                        <ArrowRight size={11} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!activeSender && senders.length > 0 && (
                <div className="space-y-2.5">
                  {senders.map((sender) => (
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
                        <p className="text-[10px] text-slate-400 mt-0.5">RUC: {sender.ruc}</p>
                      </div>
                      <button
                        onClick={() => onSelectSender(sender.id)}
                        className="shrink-0 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        Entrar
                        <ArrowRight size={11} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt if no empresa selected */}
      {!selectedEmpresa && (
        <div className="bg-slate-50 rounded-[22px] border border-dashed border-slate-200 py-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Selecciona una empresa arriba
          </p>
          <p className="text-[9px] text-slate-300">para ver sus emisores disponibles</p>
        </div>
      )}
    </div>
  );
};

export default ContadorSenders;
