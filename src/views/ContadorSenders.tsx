import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, ChevronRight, Save, ShieldCheck, Play, AlertTriangle, Pencil } from 'lucide-react';
import { Sender, AuthUser, AdminUserRow } from '../types';
import { SenderFormData } from '../services/business/contadorService';
import SunatCredentialsModal from '../components/SunatCredentialsModal';

interface ContadorSendersProps {
  user: AuthUser;
  empresas: AdminUserRow[];
  loading: boolean;
  selectedEmpresaId: string | null;
  sender: Sender | null;
  senderLoading: boolean;
  saving: boolean;
  onSelectEmpresa: (id: string) => void;
  onSaveSender: (data: SenderFormData) => Promise<void>;
  onOperar: (sender: Sender) => void;
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
  loading,
  selectedEmpresaId,
  sender,
  senderLoading,
  saving,
  onSelectEmpresa,
  onSaveSender,
  onOperar,
}) => {
  const firstName = user.name?.split(' ')[0] ?? 'Contador';

  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(sender?.name ?? '');
    setRuc(sender?.ruc ?? '');
    setShowCredsModal(false);
    setErrors({});
  }, [sender, selectedEmpresaId]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'La razón social es requerida';
    if (!ruc.trim()) {
      next.ruc = 'El RUC es requerido';
    } else if (!/^\d{11}$/.test(ruc.trim())) {
      next.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSaveSender({ name: name.trim(), ruc: ruc.trim(), sunat_user: '', sunat_pass: '' });
  };

  const handleSaveCredentials = async (sunatUser: string, sunatPass: string) => {
    await onSaveSender({ name: name.trim(), ruc: ruc.trim(), sunat_user: sunatUser, sunat_pass: sunatPass });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <img
          src="/logo-icon.png"
          alt=""
          className="w-20 h-20"
          style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
        />
        <p className="text-[10px] font-medium text-blue-600 uppercase tracking-[4px]">
          Cargando empresas
        </p>
        <div className="flex gap-1.5 mt-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1 h-1 rounded-full bg-blue-500"
              style={{ animation: `fm-dot 3s ease-in-out ${i * 0.55}s infinite` }}
            />
          ))}
        </div>
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
  const hasCredentials = sender?.has_sunat_credentials === true;
  const canOperate = hasCredentials;

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

      {/* Formulario de edición del emisor */}
      {selectedEmpresa && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
            Configurar emisor · {selectedEmpresa.name || selectedEmpresa.email}
          </p>

          {senderLoading ? (
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm py-10 flex flex-col items-center gap-2">
              <img
                src="/logo-icon.png"
                alt=""
                className="w-14 h-14"
                style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
              />
              <p className="text-[9px] font-medium text-blue-600 uppercase tracking-[3px]">
                Cargando emisor
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-[22px] border border-slate-100 shadow-sm p-5 space-y-4">
              {hasCredentials ? (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-2xl px-3 py-2.5">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" strokeWidth={3} />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                    Credenciales SUNAT configuradas
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 rounded-2xl px-3 py-2.5">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" strokeWidth={3} />
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                    Faltan credenciales SUNAT
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                    placeholder={sender?.name || 'Nombre de la empresa'}
                    className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-[12px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white transition-colors ${errors.name ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-slate-300'}`}
                  />
                  {errors.name && <p className="text-[9px] text-red-500 font-semibold mt-1 px-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    RUC
                  </label>
                  <input
                    type="text"
                    value={ruc}
                    onChange={(e) => { setRuc(e.target.value.replace(/\D/g, '')); setErrors((p) => ({ ...p, ruc: '' })); }}
                    placeholder={sender?.ruc || '20123456789'}
                    maxLength={11}
                    className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-[12px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white transition-colors ${errors.ruc ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-slate-300'}`}
                  />
                  {errors.ruc && <p className="text-[9px] text-red-500 font-semibold mt-1 px-1">{errors.ruc}</p>}
                </div>

                <div className="pt-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Credenciales SUNAT
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCredsModal(true)}
                    className="w-full flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-transform hover:border-slate-300"
                  >
                    <span className="text-[11px] font-bold text-slate-600">
                      {hasCredentials ? 'Configuradas y cifradas' : 'Sin configurar'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest shrink-0">
                      <Pencil size={12} strokeWidth={3} />
                      {hasCredentials ? 'Editar' : 'Configurar'}
                    </span>
                  </button>
                </div>
              </div>

              {sender && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onOperar(sender)}
                    disabled={!canOperate}
                    className={[
                      'w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-transform',
                      canOperate
                        ? 'bg-emerald-600 text-white active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <Play size={13} strokeWidth={3} />
                    Operar como esta empresa
                  </button>
                  {!canOperate && (
                    <p className="text-[9px] text-amber-600 font-semibold text-center px-2">
                      Configura y guarda las credenciales SUNAT para poder operar.
                    </p>
                  )}
                </div>
              )}

              {!sender && (
                <p className="text-[9px] text-slate-400 font-semibold text-center px-2">
                  Guarda el emisor primero para poder operar como esta empresa.
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Save size={13} strokeWidth={3} />
                )}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          )}
        </div>
      )}

      {showCredsModal && sender && selectedEmpresaId && (
        <SunatCredentialsModal
          hasCredentials={hasCredentials}
          empresaName={sender.name}
          onSaveCredentials={handleSaveCredentials}
          empresaUserId={selectedEmpresaId}
          onClose={() => setShowCredsModal(false)}
        />
      )}
    </div>
  );
};

export default ContadorSenders;
