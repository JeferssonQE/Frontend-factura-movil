import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, ChevronRight, Save, Eye, EyeOff, ShieldCheck, Play } from 'lucide-react';
import { Sender, AuthUser, AdminUserRow } from '../types';
import { SenderFormData } from '../services/business/contadorService';

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
  const [sunatUser, setSunatUser] = useState('');
  const [sunatPass, setSunatPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(sender?.name ?? '');
    setRuc(sender?.ruc ?? '');
    setSunatUser('');
    setSunatPass('');
    setShowPass(false);
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
    if ((sunatUser && !sunatPass) || (!sunatUser && sunatPass)) {
      next.credentials = 'Debes ingresar usuario y clave SUNAT juntos';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: SenderFormData = { name: name.trim(), ruc: ruc.trim(), sunat_user: sunatUser, sunat_pass: sunatPass };
    await onSaveSender(data);
  };

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
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm py-10 flex flex-col items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Cargando...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-[22px] border border-slate-100 shadow-sm p-5 space-y-4">
              {sender?.has_sunat_credentials && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-2xl px-3 py-2.5">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" strokeWidth={3} />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                    Credenciales SUNAT configuradas
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
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Credenciales SUNAT
                  </p>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={sunatUser}
                      onChange={(e) => { setSunatUser(e.target.value); setErrors((p) => ({ ...p, credentials: '' })); }}
                      placeholder="Usuario SUNAT"
                      autoComplete="off"
                      className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-[12px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white transition-colors ${errors.credentials ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-slate-300'}`}
                    />
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={sunatPass}
                        onChange={(e) => { setSunatPass(e.target.value); setErrors((p) => ({ ...p, credentials: '' })); }}
                        placeholder="Clave SOL"
                        autoComplete="new-password"
                        className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 pr-12 text-[12px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white transition-colors ${errors.credentials ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-slate-300'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.credentials && <p className="text-[9px] text-red-500 font-semibold px-1">{errors.credentials}</p>}
                  </div>
                </div>
              </div>

              {sender && (
                <button
                  type="button"
                  onClick={() => onOperar(sender)}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Play size={13} strokeWidth={3} />
                  Operar como esta empresa
                </button>
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
    </div>
  );
};

export default ContadorSenders;
