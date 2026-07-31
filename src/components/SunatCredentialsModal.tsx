// components/SunatCredentialsModal.tsx
import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSunatCredentialsCheck } from '../hooks/useSunatCredentialsCheck';
import SunatCredentialsVerdict from './SunatCredentialsVerdict';

interface SunatCredentialsModalProps {
  hasCredentials: boolean;
  empresaName?: string;
  onSaveCredentials: (sunatUser: string, sunatPass: string) => void | Promise<void>;
  onVerified?: () => void | Promise<void>;
  /** Prueba el acceso en SUNAT despues de guardar. */
  verifyOnSave?: boolean;
  /** Id de la empresa cuando quien verifica es un contador, no la propia empresa. */
  empresaUserId?: string;
  onClose: () => void;
}

const SunatCredentialsModal: React.FC<SunatCredentialsModalProps> = ({
  hasCredentials,
  empresaName,
  onSaveCredentials,
  onVerified,
  verifyOnSave = true,
  empresaUserId,
  onClose,
}) => {
  const [sunatUser, setSunatUser] = useState('');
  const [sunatPass, setSunatPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [verdictSeen, setVerdictSeen] = useState(false);
  const { phase, status, message, check, reset } = useSunatCredentialsCheck(() => setVerdictSeen(true), empresaUserId);

  const busy = saving || phase === 'checking';

  /** Cualquier salida del modal refresca los datos si SUNAT alcanzó a dar un veredicto. */
  const handleClose = async () => {
    if (verdictSeen) await onVerified?.();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    reset();

    const user = sunatUser.trim();
    const pass = sunatPass.trim();

    if (!user || !pass) {
      setFormError('Ingresa el usuario y la clave SOL.');
      return;
    }

    try {
      setSaving(true);
      await onSaveCredentials(user, pass);
    } catch {
      setFormError('No se pudieron guardar las credenciales. Intenta de nuevo.');
      return;
    } finally {
      setSaving(false);
    }

    if (!verifyOnSave) {
      onClose();
      return;
    }
    await check();
  };

  if (phase !== 'idle') {
    return (
      <ModalShell>
        <SunatCredentialsVerdict
          phase={phase}
          status={status}
          errorMessage={message}
          onRetry={reset}
          onAccept={handleClose}
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
              {hasCredentials ? 'Editar credenciales' : 'Configurar credenciales'}
            </h3>
            {empresaName && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 truncate max-w-[220px]">
                {empresaName}
              </p>
            )}
          </div>
        </div>

        <button onClick={handleClose} className="p-2 text-slate-300">
          <X size={20} />
        </button>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700 text-xs font-black uppercase">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Usuario SOL
          </label>
          <input
            name="sunat_user"
            value={sunatUser}
            onChange={(event) => setSunatUser(event.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="Usuario SOL"
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Clave SOL
          </label>
          <div className="relative">
            <input
              name="sunat_pass"
              type={showPass ? 'text' : 'password'}
              value={sunatPass}
              onChange={(event) => setSunatPass(event.target.value)}
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

        <p className="text-[10px] text-slate-400 font-semibold ml-1 leading-relaxed">
          Se cifran antes de guardarse. Al guardar probamos el acceso en SUNAT para confirmar que
          puedes emitir.
        </p>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar y probar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const ModalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
      {children}
    </div>
  </div>
);

export default SunatCredentialsModal;
