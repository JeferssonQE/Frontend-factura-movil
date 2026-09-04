// views/ResetPassword.tsx

import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { authService } from '../services/core/authService';

interface ResetPasswordProps {
  onSuccess: () => void;
}

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 4) errors.push('Mínimo 4 caracteres');

  return { isValid: errors.length === 0, errors };
};

const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validaciones
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const formValid = passwordValidation.isValid && passwordsMatch && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValid) {
      setError('Por favor corrige los errores antes de continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.updatePassword(password);
      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
      console.error('Error updating password:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-emerald-600" size={24} />
          </div>
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4">
            ¡Contraseña Actualizada!
          </h2>
          <p className="text-[10px] text-slate-600 mb-6">
            Tu contraseña ha sido cambiada exitosamente.
            <br />
            <span className="text-emerald-600 font-bold">Redirigiendo al sistema...</span>
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/logo-icon.png"
          alt="FactuMovil AI"
          className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
        />
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">
          FactuMovil AI
        </h1>
        <p className="text-[10px] text-slate-400 mt-1">Cambiar Contraseña</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Lock className="text-blue-600" size={16} />
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">
            Nueva Contraseña
          </h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
          <p className="text-[9px] text-blue-700 text-center">
            <strong>Crea una nueva contraseña</strong>
            <br />
            Mínimo 4 caracteres para acceso rápido
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                required
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  password && !passwordValidation.isValid
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && !passwordValidation.isValid && (
              <div className="mt-2 space-y-1">
                {passwordValidation.errors.map((error, index) => (
                  <p key={index} className="text-[8px] text-red-600">
                    • {error}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-[8px] text-red-600 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Indicador de validación */}
          {password && confirmPassword && (
            <div
              className={`rounded-xl p-3 ${formValid ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}
            >
              <div className="flex items-center gap-2">
                {formValid ? (
                  <CheckCircle2 className="text-emerald-600" size={14} />
                ) : (
                  <AlertTriangle className="text-amber-600" size={14} />
                )}
                <span
                  className={`text-[9px] font-bold ${formValid ? 'text-emerald-700' : 'text-amber-700'}`}
                >
                  {formValid ? 'Contraseña válida' : 'Revisa los errores'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl text-center border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formValid}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Lock size={18} />
                Cambiar Contraseña
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-[9px] text-slate-300 mt-8 uppercase tracking-widest text-center">
        🔒 Cambio seguro de contraseña
      </p>
    </div>
  );
};

export default ResetPassword;
