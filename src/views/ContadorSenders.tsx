import { Building2, CheckCircle2, ChevronRight, Play, Save } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import type { SenderFormData } from '../services/business/contadorService';
import type { AdminUserRow, AuthUser, Sender } from '../types';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(sender?.name ?? '');
    setRuc(sender?.ruc ?? '');
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
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSaveSender({ name: name.trim(), ruc: ruc.trim() });
  };

  if (loading) {
    return (
      <div className="py-24">
        <LoadingIndicator label="Cargando empresas" />
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-card bg-slate-100">
          <Building2 size={28} className="text-slate-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">Sin empresas asignadas</p>
          <p className="mt-1 text-sm text-slate-500">
            Contacta al administrador para que te asigne empresas.
          </p>
        </div>
      </div>
    );
  }

  const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId) ?? null;

  return (
    <div className="space-y-5 pb-8">
      <div className="pb-1 pt-2">
        <p className="text-sm text-slate-500">Hola, {firstName}</p>
        <p className="mt-0.5 text-lg font-bold text-slate-900">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} asignada
          {empresas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div>
        <p className="mb-2 px-1 text-sm font-semibold text-slate-700">Selecciona una empresa</p>
        <div className="space-y-2">
          {empresas.map((empresa) => {
            const isSelected = empresa.id === selectedEmpresaId;
            return (
              <button
                key={empresa.id}
                type="button"
                onClick={() => onSelectEmpresa(empresa.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-control text-sm font-semibold ${
                    isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getInitials(empresa)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold leading-tight ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {empresa.name || '—'}
                  </p>
                  <p
                    className={`mt-0.5 truncate text-xs ${
                      isSelected ? 'text-white/70' : 'text-slate-500'
                    }`}
                  >
                    {empresa.email}
                  </p>
                </div>
                {isSelected ? (
                  <CheckCircle2 size={18} className="shrink-0 text-white" />
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedEmpresa && (
        <div>
          <p className="mb-2 px-1 text-sm font-semibold text-slate-700">
            Configurar emisor · {selectedEmpresa.name || selectedEmpresa.email}
          </p>

          {senderLoading ? (
            <Card className="py-10">
              <LoadingIndicator label="Cargando emisor" size="md" />
            </Card>
          ) : (
            <Card className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Input
                      label="Razón social"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrors((p) => ({ ...p, name: '' }));
                      }}
                      placeholder={sender?.name || 'Nombre de la empresa'}
                      aria-invalid={Boolean(errors.name) || undefined}
                    />
                    {errors.name && <p className="mt-1 px-1 text-sm text-danger">{errors.name}</p>}
                  </div>

                  <div>
                    <Input
                      label="RUC"
                      type="text"
                      value={ruc}
                      onChange={(e) => {
                        setRuc(e.target.value.replace(/\D/g, ''));
                        setErrors((p) => ({ ...p, ruc: '' }));
                      }}
                      placeholder={sender?.ruc || '20123456789'}
                      maxLength={11}
                      inputMode="numeric"
                      aria-invalid={Boolean(errors.ruc) || undefined}
                    />
                    {errors.ruc && <p className="mt-1 px-1 text-sm text-danger">{errors.ruc}</p>}
                  </div>
                </div>

                {sender ? (
                  <Button variant="success" fullWidth onClick={() => onOperar(sender)}>
                    <Play size={16} />
                    Operar como esta empresa
                  </Button>
                ) : (
                  <p className="px-2 text-center text-sm text-slate-500">
                    Guarda el emisor primero para poder operar como esta empresa.
                  </p>
                )}

                <Button type="submit" fullWidth loading={saving}>
                  {!saving && <Save size={16} />}
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ContadorSenders;
