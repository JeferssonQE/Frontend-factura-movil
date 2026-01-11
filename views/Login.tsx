import React, { useState } from 'react';
import { Mail, Lock, Loader2, UserPlus, LogIn, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { AuthService } from '../services/supabase';
import { emailSchema, passwordSchema, nameSchema, loginSchema, signUpSchema } from '../schemas/auth';

interface LoginProps {
  onSuccess: () => void;
}

// Validar campos individuales
const validateField = (schema: z.ZodSchema, value: any): { isValid: boolean; error?: string } => {
  const result = schema.safeParse(value);
  if (result.success) {
    return { isValid: true };
  }
  return { isValid: false, error: result.error.issues[0].message };
};

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Validaciones en tiempo real
  const emailValidation = validateField(emailSchema, email);
  const passwordValidation = validateField(passwordSchema, password);
  const nameValidation = validateField(nameSchema, name);

  // Bloqueo temporal por intentos fallidos
  React.useEffect(() => {
    if (attemptCount >= 5) {
      setIsBlocked(true);
      setBlockTimeLeft(300); // 5 minutos
      
      const timer = setInterval(() => {
        setBlockTimeLeft(prev => {
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
    }
  }, [attemptCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError(`Demasiados intentos. Espera ${Math.ceil(blockTimeLeft / 60)} minutos.`);
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Validar login
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          setError(result.error.issues[0].message);
          setLoading(false);
          return;
        }

        await AuthService.signIn(email, password);
        setAttemptCount(0);
        onSuccess();
      } else {
        // Validar registro
        const result = signUpSchema.safeParse({ email, password, name });
        if (!result.success) {
          setError(result.error.issues[0].message);
          setLoading(false);
          return;
        }

        const signUpResult = await AuthService.signUp(email, password, name.trim());
        
        if (signUpResult.user && !signUpResult.user.email_confirmed_at) {
          setRegisteredEmail(email);
          setShowEmailConfirmation(true);
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setAttemptCount(prev => prev + 1);
      
      if (!isLogin && err.message?.includes('already registered')) {
        setShowPasswordReset(true);
        setRegisteredEmail(email);
      } else if (isLogin) {
        setError('Email o contraseña incorrectos');
      } else {
        setError('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const emailValidationCheck = validateField(emailSchema, registeredEmail || email);
    
    if (!emailValidationCheck.isValid) {
      setError(emailValidationCheck.error || 'Email inválido');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await AuthService.resetPassword(registeredEmail || email);
      setResetSuccess(true);
      setShowNewPasswordForm(true);
    } catch (err: any) {
      setError('Error enviando email de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar que la contraseña sea válida
    const passwordCheck = validateField(passwordSchema, newPassword);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.error || 'Contraseña inválida');
      return;
    }

    setChangePasswordLoading(true);
    setError('');

    try {
      await AuthService.updatePassword(newPassword);
      setResetSuccess(false);
      setShowNewPasswordForm(false);
      setShowPasswordReset(false);
      setIsLogin(true);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setAttemptCount(0);
      setResetSuccess(false);
    } catch (err: any) {
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <button
            onClick={() => {
              setShowPasswordReset(false);
              setIsLogin(true);
              setResetSuccess(false);
              setShowNewPasswordForm(false);
              setNewPassword('');
              setConfirmPassword('');
              setError('');
            }}
            className="mb-4 text-slate-600 hover:text-slate-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2"
          >
            ← Volver
          </button>
        </div>
        <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-amber-600" size={24} />
          </div>
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4">
            Email Ya Registrado
          </h2>
          <p className="text-[10px] text-slate-600 mb-6">
            El email <strong>{registeredEmail}</strong> ya tiene una cuenta.<br />
            <span className="text-emerald-600 font-bold">¡Tus datos de empresa están seguros!</span>
          </p>
          
          {showNewPasswordForm ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lock className="text-blue-600" size={16} />
                  <span className="text-[10px] font-bold text-blue-700">Nueva Contraseña</span>
                </div>
                <p className="text-[9px] text-blue-600 mb-4">
                  Ingresa tu nueva contraseña
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 text-[9px] font-bold p-3 rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordLoading || !newPassword || !confirmPassword}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {changePasswordLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Lock size={14} />
                        Cambiar Contraseña
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : resetSuccess ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Mail className="text-emerald-600" size={16} />
                  <span className="text-[10px] font-bold text-emerald-700">Email Enviado</span>
                </div>
                <p className="text-[9px] text-emerald-600">
                  Revisa tu bandeja de entrada para restablecer tu contraseña
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordReset(false);
                  setIsLogin(true);
                  setResetSuccess(false);
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Volver al Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[9px] text-blue-700 mb-3">
                  <strong>¿Olvidaste tu contraseña?</strong><br />
                  Te enviaremos un enlace para crear una nueva
                </p>
                <button
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <Mail size={14} />
                      Recuperar Contraseña
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-[9px] text-emerald-700 mb-3">
                  <strong>¿Recuerdas tu contraseña?</strong><br />
                  Inicia sesión para acceder a tus datos
                </p>
                <button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setIsLogin(true);
                    setEmail(registeredEmail);
                  }}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <LogIn size={14} />
                  Iniciar Sesión
                </button>
              </div>
            </div>
          )}
          
          {error && !showNewPasswordForm && (
            <div className="bg-red-50 text-red-600 text-[9px] font-bold p-3 rounded-xl mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-blue-600" size={24} />
          </div>
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4">
            Confirma tu Email
          </h2>
          <p className="text-[10px] text-slate-600 mb-6">
            Enviamos un enlace de confirmación a:<br />
            <strong>{registeredEmail}</strong>
          </p>
          <button
            onClick={() => setShowEmailConfirmation(false)}
            className="text-[10px] font-bold text-blue-600 uppercase tracking-wider"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">FactuMovil AI</h1>
        <p className="text-[10px] text-slate-400 mt-1">Facturación Electrónica Segura</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="text-emerald-600" size={16} />
          <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
        </div>

        {/* Indicador de seguridad */}
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
              <span className="text-[9px] font-bold text-red-700 uppercase">Cuenta Bloqueada</span>
            </div>
            <p className="text-[8px] text-red-600">
              Tiempo restante: {formatTime(blockTimeLeft)}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Nombre Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  name && !nameValidation.isValid ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {name && !nameValidation.isValid && (
                <p className="text-[8px] text-red-600 mt-1">{nameValidation.error}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  email && !emailValidation.isValid ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
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
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={4}
                className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                  !isLogin && password && !passwordValidation.isValid ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
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
            {!isLogin && password && !passwordValidation.isValid && (
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
            disabled={loading || isBlocked || (!isLogin && (!emailValidation.isValid || !passwordValidation.isValid || !nameValidation.isValid))}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isLogin ? (
              <>
                <LogIn size={18} />
                Entrar Seguro
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          {isLogin && (
            <button
              onClick={() => {
                const emailValidationCheck = validateField(emailSchema, email);
                if (emailValidationCheck.isValid && email) {
                  setRegisteredEmail(email);
                  setShowPasswordReset(true);
                } else {
                  setError('Ingresa un email válido primero');
                }
              }}
              className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
          
          <button
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setAttemptCount(0);
              setShowPasswordReset(false);
              setResetSuccess(false);
            }}
            className="text-[10px] font-bold text-blue-600 uppercase tracking-wider"
            disabled={isBlocked}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>

      <div className="text-center mt-6 space-y-2">
        <p className="text-[9px] text-slate-300 uppercase tracking-widest">
          🔒 Sesión segura • Válida por 30 días
        </p>
        <p className="text-[8px] text-slate-400">
          MVP - Contraseñas simples permitidas
        </p>
      </div>
    </div>
  );
};

export default Login;
