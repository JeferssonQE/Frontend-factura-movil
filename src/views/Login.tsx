// views/Login.tsx

import { Eye, EyeOff, Lock, LogIn, Mail, Shield } from 'lucide-react';
import React, { useState } from 'react';
import type { z } from 'zod';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Notice from '../components/ui/Notice';
import { emailSchema, loginSchema, passwordSchema } from '../schemas/auth';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const validateField = (
  schema: z.ZodSchema,
  value: unknown,
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
  const emailInvalid = Boolean(email) && !emailValidation.isValid;
  const passwordInvalid = Boolean(password) && !passwordValidation.isValid;

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-8 text-center">
        <img
          src="/logo-icon.png"
          alt="FactuMovil AI"
          className="mx-auto mb-4 size-20 drop-shadow-lg"
        />
        <h1 className="text-xl font-bold text-slate-900">FactuMovil AI</h1>
        <p className="mt-1 text-sm text-slate-500">Facturación electrónica segura</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Shield className="text-success" size={18} />
          <h2 className="text-lg font-semibold text-slate-900">Iniciar sesión</h2>
        </div>

        <div className="space-y-3 empty:hidden">
          {attemptCount > 0 && !isBlocked && (
            <Notice tone="warning">Intentos fallidos: {attemptCount}/5</Notice>
          )}

          {isBlocked && (
            <Notice tone="danger">
              Cuenta bloqueada. Tiempo restante: {formatTime(blockTimeLeft)}
            </Notice>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@empresa.com"
              required
              icon={<Mail size={18} />}
              aria-invalid={emailInvalid || undefined}
            />
            {emailInvalid && <p className="mt-1 text-sm text-danger">{emailValidation.error}</p>}
          </div>

          <div>
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              icon={<Lock size={18} />}
              aria-invalid={passwordInvalid || undefined}
              trailing={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              }
            />
            {passwordInvalid && (
              <p className="mt-1 text-sm text-danger">{passwordValidation.error}</p>
            )}
          </div>

          {error && <Notice tone="danger">{error}</Notice>}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            disabled={isBlocked || !emailValidation.isValid || !passwordValidation.isValid}
          >
            {!loading && <LogIn size={18} />}
            Entrar
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        Sesión segura • Expira por inactividad
      </p>
    </div>
  );
};

export default Login;
