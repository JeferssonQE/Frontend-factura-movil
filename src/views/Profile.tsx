// views/Profile.tsx

import {
  ArrowLeftRight,
  Building,
  ChevronRight,
  Crown,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import EmpresaModal from '../components/EmpresaModal';
import Badge, { type BadgeTone } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { type AuthUser, type Sender, type SenderUpsertInput, UserPlan } from '../types';

interface ProfileProps {
  user: AuthUser | null;
  sender: Sender | null;
  isAdmin: boolean;
  isContador?: boolean;
  canEditIdentity: boolean;
  onSaveSender: (sender: SenderUpsertInput) => Promise<void>;
  onGoToAdmin: () => void;
  onChangeSender?: () => void;
  onLogout: () => void;
}

const PLAN_STYLE: Record<string, { tone: BadgeTone; label: string }> = {
  free: { tone: 'neutral', label: 'Free' },
  pro: { tone: 'info', label: 'Pro' },
  enterprise: { tone: 'info', label: 'Enterprise' },
};

const roleLabel = (isAdmin: boolean, isContador: boolean): string => {
  if (isAdmin) return 'Admin';
  return isContador ? 'Contador' : 'Empresa';
};

const Profile: React.FC<ProfileProps> = ({
  user,
  sender,
  isAdmin,
  isContador = false,
  canEditIdentity,
  onSaveSender,
  onGoToAdmin,
  onChangeSender,
  onLogout,
}) => {
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);

  const getUserInitials = () => {
    const base = user?.name || user?.email || 'US';
    if (base.includes('@')) return base.substring(0, 2).toUpperCase();
    return base
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const plan = PLAN_STYLE[user?.plan as string] ?? PLAN_STYLE.free;
  const displayName = user?.name || 'Usuario';
  const displayEmail = user?.email || '';
  const hasPaidPlan = user?.plan === UserPlan.PRO || user?.plan === UserPlan.ENTERPRISE;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-card bg-primary text-lg font-bold text-white">
            {isAdmin ? <ShieldCheck size={28} /> : getUserInitials()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
              <Mail size={14} className="shrink-0" />
              {displayEmail}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Badge tone="info">{roleLabel(isAdmin, isContador)}</Badge>
              <Badge tone={plan.tone}>
                {hasPaidPlan && <Crown size={12} />}
                {plan.label}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {isAdmin && (
        <button
          type="button"
          onClick={onGoToAdmin}
          className="flex w-full items-center justify-between rounded-card border border-slate-200 bg-white p-4 text-left transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-control bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Panel de usuarios</p>
              <p className="text-sm text-slate-500">Gestionar cuentas y planes</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      )}

      {!isAdmin && (
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <Building className="text-accent" size={20} />
            <h4 className="text-base font-semibold text-slate-900">
              {isContador ? 'Empresa activa' : 'Mi empresa'}
            </h4>
          </div>

          {!sender && isContador && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-slate-500">Sin empresa activa</p>
              {onChangeSender && (
                <Button fullWidth onClick={onChangeSender}>
                  <ArrowLeftRight size={16} />
                  Seleccionar empresa
                </Button>
              )}
            </div>
          )}

          {!sender && !isContador && (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-card bg-slate-100">
                <Building className="text-slate-400" size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">Empresa sin configurar</p>
              <p className="px-6 text-sm leading-relaxed text-slate-500">
                Tu empresa aún no está configurada. Contacta a tu administrador.
              </p>
            </div>
          )}

          {sender && (
            <div className="space-y-3">
              <Card tone="muted" className="p-4">
                <p className="mb-1 text-xs text-slate-500">Razón social</p>
                <p className="truncate text-sm font-semibold text-slate-900">{sender.name}</p>
              </Card>
              <Card tone="muted" className="p-4">
                <p className="mb-1 text-xs text-slate-500">RUC</p>
                <p className="text-sm font-semibold text-slate-900">{sender.ruc}</p>
              </Card>

              <Button variant="outline" fullWidth onClick={() => setShowEmpresaModal(true)}>
                <Pencil size={16} />
                Editar datos de la empresa
              </Button>

              {isContador && onChangeSender && (
                <Button variant="outline" fullWidth onClick={onChangeSender}>
                  <ArrowLeftRight size={16} />
                  Cambiar empresa
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      <Button variant="outline" fullWidth onClick={onLogout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>

      <p className="pt-4 text-center text-xs text-slate-400">FactuMovil AI v2.0</p>

      {showEmpresaModal && sender && (
        <EmpresaModal
          sender={sender}
          canEditIdentity={canEditIdentity}
          onSave={onSaveSender}
          onClose={() => setShowEmpresaModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;
