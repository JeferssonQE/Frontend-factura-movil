// views/Login.tsx
import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { z } from 'zod';
import { emailSchema, passwordSchema, loginSchema } from '../schemas/auth';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const validateField = (
  schema: z.ZodSchema,
  value: unknown
): { isValid: boolean; error?: string } => {
  const result = schema.safeParse(value);

  if (result.success) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: result.error.issues[0]?.message || 'Valor inválido',
  };
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);

  const emailValidation = validateField(emailSchema, email);
  const passwordValidation = validateField(passwordSchema, password);

  React.useEffect(() => {
    if (attemptCount < 5) return;

    setIsBlocked(true);
    setBlockTimeLeft(300);

    const timer = setInterval(() => {
      setBlockTimeLeft((prev) => {
        if (prev <= 1) {
          setIsBlocked(false);
          setAttemptCount(0);
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptCount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isBlocked) {
      setError(`Demasiados intentos. Espera ${Math.ceil(blockTimeLeft / 60)} minutos.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = loginSchema.safeParse({ email, password });

      if (!result.success) {
        setError(result.error.issues[0]?.message || 'Datos inválidos');
        setLoading(false);
        return;
      }

      await onLogin(email, password);
      setAttemptCount(0);
    } catch (err: any) {
      setAttemptCount((prev) => prev + 1);
      setError(err?.message || 'Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">
          FactuMovil AI
        </h1>
        <p className="text-[10px] text-slate-400 mt-1">Facturación Electrónica Segura</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="text-emerald-600" size={16} />
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">
            Iniciar Sesión
          </h2>
        </div>

        {attemptCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={14} />
              <span className="text-[9px] font-bold text-amber-700">
                Intentos fallidos: {attemptCount}/5
              </span>
            </div>
          </div>
        )}

        {isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="text-red-600" size={14} />
              <span className="text-[9px] font-bold text-red-700 uppercase">
                Cuenta Bloqueada
              </span>
            </div>
            <p className="text-[8px] text-red-600">Tiempo restante: {formatTime(blockTimeLeft)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@empresa.com"
                required
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  email && !emailValidation.isValid
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>
            {email && !emailValidation.isValid && (
              <p className="text-[8px] text-red-600 mt-1">{emailValidation.error}</p>
            )}
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  password && !passwordValidation.isValid
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && !passwordValidation.isValid && (
              <p className="text-[8px] text-red-600 mt-1">• {passwordValidation.error}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl text-center border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isBlocked || !emailValidation.isValid || !passwordValidation.isValid}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <LogIn size={18} />
                Entrar Seguro
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center mt-6 space-y-2">
        <p className="text-[9px] text-slate-300 uppercase tracking-widest">
          🔒 Sesión segura • Expira por inactividad
        </p>
      </div>
    </div>
  );
};

export default Login;