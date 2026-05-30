// views/Onboarding.tsx
import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building,
  ArrowRight,
} from 'lucide-react';
import { Sender } from '../types';

interface OnboardingProps {
  sender: Sender | null;
  onChangePassword: (newPassword: string) => Promise<void>;
  onSaveSunat: (sunatUser: string, sunatPass: string) => Promise<void>;
  onFinish: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

type Step = 1 | 2;

const StepDots: React.FC<{ step: Step }> = ({ step }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    <span className={`h-2 rounded-full transition-all ${step === 1 ? 'w-8 bg-slate-900' : 'w-2 bg-emerald-500'}`} />
    <span className={`h-2 rounded-full transition-all ${step === 2 ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`} />
  </div>
);

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-500">
      {value}
    </div>
  </div>
);

const Onboarding: React.FC<OnboardingProps> = ({ sender, onChangePassword, onSaveSunat, onFinish }) => {
  const [step, setStep] = useState<Step>(1);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [sunatUser, setSunatUser] = useState('');
  const [sunatPass, setSunatPass] = useState('');
  const [showSunatPass, setShowSunatPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;
  const sunatValid = sunatUser.trim().length > 0 && sunatPass.trim().length > 0;

  const handleSubmitPassword = async () => {
    if (!passwordValid) return;
    setLoading(true);
    setError('');
    try {
      await onChangePassword(password);
      setStep(2);
    } catch {
      setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSunat = async () => {
    if (!sunatValid) return;
    setLoading(true);
    setError('');
    try {
      await onSaveSunat(sunatUser.trim(), sunatPass.trim());
      onFinish();
    } catch {
      setError('No se pudieron guardar las credenciales. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">FactuMovil AI</h1>
        <p className="text-[10px] text-slate-400 mt-1">
          {step === 1 ? 'Paso 1 de 2 · Protege tu cuenta' : 'Paso 2 de 2 · Conecta tu SUNAT'}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <StepDots step={step} />

        {step === 1 && (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <ShieldCheck className="text-blue-600" size={16} />
              <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Nueva Contraseña</h2>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
              <p className="text-[9px] text-blue-700 text-center leading-relaxed">
                Estás usando una contraseña temporal.<br />
                Crea una nueva para continuar (mínimo {MIN_PASSWORD_LENGTH} caracteres).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                      passwordTooShort ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTooShort && (
                  <p className="text-[8px] text-red-600 mt-1">Mínimo {MIN_PASSWORD_LENGTH} caracteres</p>
                )}
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                      passwordsMismatch ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {passwordsMismatch && (
                  <p className="text-[8px] text-red-600 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl text-center border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitPassword}
                disabled={loading || !passwordValid}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Guardar y continuar</span><ArrowRight size={18} /></>}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building className="text-blue-600" size={16} />
              <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Conecta tu SUNAT</h2>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
              <p className="text-[9px] text-blue-700 text-center leading-relaxed">
                Necesitas tu Clave SOL para emitir comprobantes.<br />
                Puedes hacerlo ahora o más tarde desde tu perfil.
              </p>
            </div>

            <div className="space-y-4">
              {sender && (
                <>
                  <ReadOnlyField label="Razón Social" value={sender.name} />
                  <ReadOnlyField label="RUC" value={sender.ruc} />
                </>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Credenciales SUNAT (SOL)
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={sunatUser}
                    onChange={(e) => setSunatUser(e.target.value.toUpperCase())}
                    placeholder="Usuario SOL"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="relative">
                    <input
                      type={showSunatPass ? 'text' : 'password'}
                      value={sunatPass}
                      onChange={(e) => setSunatPass(e.target.value)}
                      placeholder="Clave SOL"
                      autoComplete="new-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSunatPass((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSunatPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl text-center border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectSunat}
                disabled={loading || !sunatValid}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /><span>Conectar</span></>}
              </button>

              <button
                type="button"
                onClick={onFinish}
                disabled={loading}
                className="w-full text-slate-400 py-2 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                Más tarde
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-[9px] text-slate-300 mt-8 uppercase tracking-widest text-center">
        🔒 Configuración inicial segura
      </p>
    </div>
  );
};

export default Onboarding;
