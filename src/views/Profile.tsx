// views/Profile.tsx
import React, { useState } from 'react';
import {
  Mail,
  Building,
  LogOut,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Crown,
  ChevronRight,
  ArrowLeftRight,
  Pencil,
} from 'lucide-react';
import { AuthUser, Sender, SenderUpsertInput, UserPlan } from '../types';
import EmpresaModal from '../components/EmpresaModal';

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

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free:       { bg: 'bg-slate-100',   text: 'text-slate-500',  label: 'FREE'       },
  pro:        { bg: 'bg-blue-50',     text: 'text-blue-600',   label: 'PRO'        },
  enterprise: { bg: 'bg-purple-50',   text: 'text-purple-600', label: 'ENTERPRISE' },
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
    return base.split(' ').filter(Boolean).map((p) => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const plan = PLAN_STYLE[user?.plan as string] ?? PLAN_STYLE.free;
  const displayName = user?.name || 'Usuario';
  const displayEmail = user?.email || '';
  const accentText = isContador ? 'text-teal-600' : 'text-blue-600';

  return (
    <div className="space-y-6">

      {/* ── User card ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center text-white font-black text-lg shrink-0 ${isAdmin ? 'bg-purple-700' : 'bg-slate-900'}`}>
            {isAdmin ? <ShieldCheck size={28} /> : getUserInitials()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
              <Mail size={12} />
              {displayEmail}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                isAdmin ? 'bg-purple-50 text-purple-700' : isContador ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-600'
              }`}>
                {isAdmin ? 'Admin' : isContador ? 'Contador' : 'Empresa'}
              </span>

              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 ${plan.bg} ${plan.text}`}>
                {user?.plan === UserPlan.PRO || user?.plan === UserPlan.ENTERPRISE ? <Crown size={10} /> : null}
                {plan.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin shortcut ────────────────────────────────────── */}
      {isAdmin && (
        <button
          onClick={onGoToAdmin}
          className="w-full bg-purple-50 border border-purple-100 p-5 rounded-[28px] flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black text-purple-800 uppercase tracking-widest">Panel de Usuarios</p>
              <p className="text-[9px] text-purple-500 mt-0.5">Gestionar cuentas y planes</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-purple-400" />
        </button>
      )}

      {/* ── Sender / empresa section ──────────────────────────── */}
      {!isAdmin && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Building className={accentText} size={20} />
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                {isContador ? 'Empresa Activa' : 'Mi Empresa'}
              </h4>
            </div>

            {sender && (
              <button onClick={() => setShowEmpresaModal(true)} className={`${accentText} p-2`}>
                <Edit3 size={18} />
              </button>
            )}
          </div>

          {!sender && isContador && (
            <div className="text-center py-6 space-y-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sin empresa activa</p>
              {onChangeSender && (
                <button
                  onClick={onChangeSender}
                  className="w-full bg-teal-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight size={14} />
                  Seleccionar Empresa
                </button>
              )}
            </div>
          )}

          {!sender && !isContador && (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-[20px] bg-slate-100 flex items-center justify-center mx-auto">
                <Building className="text-slate-300" size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Empresa sin configurar
              </p>
              <p className="text-[9px] text-slate-400 leading-relaxed px-6">
                Tu empresa aún no está configurada. Contacta a tu administrador.
              </p>
            </div>
          )}

          {sender && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Razón Social</p>
                <p className="text-sm font-black text-slate-800 truncate">{sender.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">RUC</p>
                <p className="text-sm font-black text-slate-800">{sender.ruc}</p>
              </div>

              <div className={`rounded-xl p-4 flex items-center gap-3 ${sender.has_sunat_credentials ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <CheckCircle2 className={sender.has_sunat_credentials ? 'text-emerald-500' : 'text-amber-500'} size={18} />
                <p className={`text-[10px] font-bold uppercase ${sender.has_sunat_credentials ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {sender.has_sunat_credentials ? 'Credenciales SUNAT configuradas' : 'Credenciales SUNAT pendientes'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEmpresaModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest active:scale-[0.98] transition-transform hover:border-slate-300"
              >
                <Pencil size={12} strokeWidth={3} />
                {sender.has_sunat_credentials ? 'Editar datos y credenciales' : 'Configurar credenciales SUNAT'}
              </button>

              {isContador && onChangeSender && (
                <button
                  onClick={onChangeSender}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <ArrowLeftRight size={14} />
                  Cambiar Empresa
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Logout ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={onLogout}
          className="w-full bg-white border border-slate-200 text-slate-600 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>

      <p className="text-[9px] text-slate-300 text-center uppercase tracking-widest pt-4">
        FactuMovil AI v2.0
      </p>

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
