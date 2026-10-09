// views/ResetPassword.tsx

import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Notice from '../components/ui/Notice';
import { authService } from '../services/core/authService';

interface ResetPasswordProps {
  onSuccess: () => void;
}

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 4) errors.push('Mínimo 4 caracteres');

  return { isValid: errors.length === 0, errors };
};

const PasswordToggle: React.FC<{ visible: boolean; onToggle: () => void }> = ({
  visible,
  onToggle,
}) => (
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={onToggle}
    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
  >
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </Button>
);

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-sm p-6 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="text-success" size={28} />
          </div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">¡Contraseña actualizada!</h2>
          <p className="mb-6 text-sm text-slate-600">
            Tu contraseña ha sido cambiada exitosamente.
            <br />
            <span className="font-semibold text-success">Redirigiendo al sistema…</span>
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-success" size={20} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-8 text-center">
        <img
          src="/logo-icon.png"
          alt="FactuMovil AI"
          className="mx-auto mb-4 size-20 drop-shadow-lg"
        />
        <h1 className="text-xl font-bold text-slate-900">FactuMovil AI</h1>
        <p className="mt-1 text-sm text-slate-500">Cambiar contraseña</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Lock className="text-accent" size={18} />
          <h2 className="text-lg font-semibold text-slate-900">Nueva contraseña</h2>
        </div>

        <div className="mb-6">
          <Notice tone="info">
            <strong>Crea una nueva contraseña.</strong> Mínimo 4 caracteres para acceso rápido.
          </Notice>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Nueva contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<Lock size={18} />}
              aria-invalid={password && !passwordValidation.isValid ? true : undefined}
              trailing={
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
            />
            {password && !passwordValidation.isValid && (
              <div className="mt-2 space-y-1">
                {passwordValidation.errors.map((message) => (
                  <p key={message} className="text-sm text-danger">
                    • {message}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Confirmar contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<Lock size={18} />}
              aria-invalid={confirmPassword && !passwordsMatch ? true : undefined}
              trailing={
                <PasswordToggle
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                />
              }
            />
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-sm text-danger">Las contraseñas no coinciden</p>
            )}
          </div>

          {password && confirmPassword && (
            <Notice tone={formValid ? 'success' : 'warning'}>
              {formValid ? 'Contraseña válida' : 'Revisa los errores'}
            </Notice>
          )}

          {error && <Notice tone="danger">{error}</Notice>}

          <Button type="submit" size="lg" fullWidth loading={loading} disabled={!formValid}>
            {!loading && <Lock size={18} />}
            Cambiar contraseña
          </Button>
        </form>
      </Card>

      <p className="mt-8 text-center text-xs text-slate-500">Cambio seguro de contraseña</p>
    </div>
  );
};

export default ResetPassword;
