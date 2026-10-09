// views/Onboarding.tsx
//
// Era un asistente de dos pasos: contraseña y Clave SOL. El segundo se fue con el scraper
// -FactuMovil emite por Factu API y ya no custodia credenciales de SUNAT-, y sin el no
// queda asistente que guiar: una sola pantalla.

import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Notice from '../components/ui/Notice';
import type { Sender } from '../types';

interface OnboardingProps {
  sender: Sender | null;
  onChangePassword: (newPassword: string) => Promise<void>;
  onFinish: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

const Onboarding: React.FC<OnboardingProps> = ({ sender, onChangePassword, onFinish }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmitPassword = async () => {
    if (!passwordValid) return;
    setLoading(true);
    setError('');
    try {
      await onChangePassword(password);
      onFinish();
    } catch {
      setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
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
        <p className="mt-1 text-sm text-slate-500">Protege tu cuenta</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex items-center justify-center gap-2">
          <ShieldCheck className="text-accent" size={18} />
          <h2 className="text-lg font-semibold text-slate-900">Nueva contraseña</h2>
        </div>

        <div className="mb-6">
          <Notice tone="info">
            Estás usando una contraseña temporal. Crea una nueva para continuar (mínimo{' '}
            {MIN_PASSWORD_LENGTH} caracteres).
          </Notice>
        </div>

        <div className="space-y-4">
          {/* Los datos de la empresa, para que confirme que entro donde debia. */}
          {sender && (
            <>
              <Input label="Razón social" value={sender.name} readOnly />
              <Input label="RUC" value={sender.ruc} readOnly />
            </>
          )}

          <div>
            <Input
              label="Nueva contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              icon={<Lock size={18} />}
              aria-invalid={passwordTooShort || undefined}
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
            {passwordTooShort && (
              <p className="mt-1 text-sm text-danger">Mínimo {MIN_PASSWORD_LENGTH} caracteres</p>
            )}
          </div>

          <div>
            <Input
              label="Confirmar contraseña"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              icon={<Lock size={18} />}
              aria-invalid={passwordsMismatch || undefined}
            />
            {passwordsMismatch && (
              <p className="mt-1 text-sm text-danger">Las contraseñas no coinciden</p>
            )}
          </div>

          {error && <Notice tone="danger">{error}</Notice>}

          <Button
            size="lg"
            fullWidth
            onClick={handleSubmitPassword}
            loading={loading}
            disabled={!passwordValid}
          >
            Guardar y entrar
            {!loading && <ArrowRight size={18} />}
          </Button>

          <Button variant="ghost" fullWidth onClick={onFinish} disabled={loading}>
            Más tarde
          </Button>
        </div>
      </Card>

      <p className="mt-8 text-center text-xs text-slate-500">Configuración inicial segura</p>
    </div>
  );
};

export default Onboarding;
