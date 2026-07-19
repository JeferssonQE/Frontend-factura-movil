// components/EmpresaModal.tsx
import React, { useState } from 'react';
import { Building2, X, AlertCircle, Eye, EyeOff, Loader2, Lock, Search } from 'lucide-react';
import { Sender, SenderUpsertInput } from '../types';
import { lookupService } from '../services/business/lookupService';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';

const RUC_LENGTH = 11;

interface EmpresaModalProps {
  sender: Sender | null;
  canEditIdentity: boolean;
  onSave: (payload: SenderUpsertInput) => Promise<void>;
  onClose: () => void;
}

const EmpresaModal: React.FC<EmpresaModalProps> = ({ sender, canEditIdentity, onSave, onClose }) => {
  const [ruc, setRuc] = useState(sender?.ruc ?? '');
  const [razonSocial, setRazonSocial] = useState(sender?.name ?? '');
  const [sunatUser, setSunatUser] = useState('');
  const [sunatPass, setSunatPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasCredentials = sender?.has_sunat_credentials === true;

  useDebouncedLookup(canEditIdentity ? ruc : '', RUC_LENGTH, async (value) => {
    if (value === sender?.ruc) return;
    setLookingUp(true);
    setFormError(null);
    const result = await lookupService.lookupRuc(value);
    setLookingUp(false);
    if (!result) {
      setRazonSocial('');
      setFormError('No encontramos ese RUC en SUNAT. Verifícalo.');
      return;
    }
    setRazonSocial(result.razon_social);
  });

  const handleRucChange = (value: string) => {
    setRuc(value.replace(/\D/g, '').slice(0, RUC_LENGTH));
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const user = sunatUser.trim();
    const pass = sunatPass.trim();

    if (canEditIdentity) {
      if (ruc.length !== RUC_LENGTH) {
        setFormError('El RUC debe tener 11 dígitos.');
        return;
      }
      if (!razonSocial) {
        setFormError('Ingresa un RUC válido para traer la razón social.');
        return;
      }
    }

    if ((user && !pass) || (!user && pass)) {
      setFormError('Ingresa el usuario y la clave SOL juntos.');
      return;
    }

    const identityChanged = canEditIdentity && ruc !== sender?.ruc;
    if (!identityChanged && !user) {
      setFormError('No hay cambios para guardar.');
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: razonSocial || sender?.name || '',
        ruc: ruc || sender?.ruc || '',
        sunat_user: user || undefined,
        sunat_pass: pass || undefined,
      });
      onClose();
    } catch {
      setFormError('No se pudieron guardar los datos. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
                Datos de la empresa
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                Identidad y credenciales SOL
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300">
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-red-700 text-xs font-black uppercase">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              RUC {!canEditIdentity && <Lock size={11} />}
            </label>
            <input
              value={ruc}
              onChange={(e) => handleRucChange(e.target.value)}
              readOnly={!canEditIdentity}
              inputMode="numeric"
              placeholder="20123456789"
              className={`w-full border-none rounded-2xl p-4 text-sm font-black text-slate-800 outline-none ${
                canEditIdentity ? 'bg-slate-50 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 text-slate-500'
              }`}
            />
            {!canEditIdentity && (
              <p className="text-[10px] text-slate-400 font-semibold ml-1 mt-1.5">
                El RUC y la razón social los gestiona el administrador.
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Razón Social <Lock size={11} />
              {lookingUp && <Loader2 size={11} className="animate-spin text-blue-500" />}
            </label>
            <div className="relative">
              <input
                value={razonSocial}
                readOnly
                placeholder={canEditIdentity ? 'Se completa con el RUC' : ''}
                className="w-full bg-slate-100 border-none rounded-2xl p-4 pr-10 text-sm font-black text-slate-600 outline-none truncate"
              />
              {canEditIdentity && (
                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-3 ml-1">
              Credenciales SUNAT (SOL)
            </p>

            <div className="space-y-4">
              <input
                name="sunat_user"
                value={sunatUser}
                onChange={(e) => setSunatUser(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder="Usuario SOL"
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <div className="relative">
                <input
                  name="sunat_pass"
                  type={showPass ? 'text' : 'password'}
                  value={sunatPass}
                  onChange={(e) => setSunatPass(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Clave SOL"
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold ml-1 mt-3">
              {hasCredentials
                ? 'Déjalas en blanco para conservar las credenciales actuales.'
                : 'Se cifran antes de guardarse y se usan solo para emitir en SUNAT.'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || lookingUp}
              className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmpresaModal;
