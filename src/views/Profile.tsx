// views/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  Mail,
  Building,
  LogOut,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { AuthUser, Sender, SenderUpsertInput, UserRole, UserPlan } from '../types';

interface ProfileProps {
  user: AuthUser | null;
  sender: Sender | null;
  isAdmin: boolean;
  onSaveSender: (sender: SenderUpsertInput) => Promise<void>;
  onDeleteSender: () => void;
  onGoToAdmin: () => void;
  onLogout: () => void;
}

interface SenderFormState {
  name: string;
  ruc: string;
  sunat_user: string;
  sunat_pass: string;
}

const EMPTY_FORM: SenderFormState = { name: '', ruc: '', sunat_user: '', sunat_pass: '' };

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free:       { bg: 'bg-slate-100',   text: 'text-slate-500',  label: 'FREE'       },
  pro:        { bg: 'bg-blue-50',     text: 'text-blue-600',   label: 'PRO'        },
  enterprise: { bg: 'bg-purple-50',   text: 'text-purple-600', label: 'ENTERPRISE' },
};

const Profile: React.FC<ProfileProps> = ({
  user,
  sender,
  isAdmin,
  onSaveSender,
  onDeleteSender,
  onGoToAdmin,
  onLogout,
}) => {
  // Admin without a sender starts collapsed (not forced into create form)
  const [isEditing, setIsEditing] = useState(!sender && !isAdmin);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState<SenderFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!sender) {
      setForm(EMPTY_FORM);
      setIsEditing(!isAdmin); // admin doesn't need a sender
      return;
    }
    setForm({ name: sender.name, ruc: sender.ruc, sunat_user: '', sunat_pass: '' });
  }, [sender, isAdmin]);

  const handleSave = async () => {
    if (!form.name || !form.ruc || form.ruc.length !== 11) return;

    const payload: SenderUpsertInput = {
      name: form.name.trim().toUpperCase(),
      ruc: form.ruc.trim(),
      sunat_user: form.sunat_user.trim() || undefined,
      sunat_pass: form.sunat_pass.trim() || undefined,
    };

    setSaving(true);
    setSaveError(null);

    try {
      await onSaveSender(payload);
      setIsEditing(false);
      setForm((prev) => ({ ...prev, sunat_user: '', sunat_pass: '' }));
    } catch (err: any) {
      console.error('[Profile] Error al guardar sender:', err);
      setSaveError(err?.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSender = () => {
    setShowDeleteConfirm(false);
    onDeleteSender();
  };

  const getUserInitials = () => {
    const base = user?.name || user?.email || 'US';
    if (base.includes('@')) return base.substring(0, 2).toUpperCase();
    return base.split(' ').filter(Boolean).map((p) => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const plan = PLAN_STYLE[user?.plan as string] ?? PLAN_STYLE.free;
  const displayName = user?.name || 'Usuario';
  const displayEmail = user?.email || '';

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
              {/* Role badge */}
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                isAdmin ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-600'
              }`}>
                {isAdmin ? 'Admin' : 'Empresa'}
              </span>

              {/* Plan badge */}
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
      {!isAdmin && <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Building className="text-blue-600" size={20} />
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
              Mi Empresa
            </h4>
          </div>

          {sender && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-blue-600 p-2">
              <Edit3 size={18} />
            </button>
          )}
        </div>

        {/* No sender + not editing → show add button */}
        {!sender && !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
          >
            <Plus size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Agregar Empresa
            </span>
          </button>

        /* Editing / create form */
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Razón Social
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toUpperCase() }))}
                placeholder="MI EMPRESA SAC"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                RUC (11 dígitos)
              </label>
              <input
                type="text"
                value={form.ruc}
                onChange={(e) => setForm((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                placeholder="20123456789"
                maxLength={11}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.ruc && form.ruc.length !== 11 && (
                <p className="text-[9px] text-red-500 mt-1">El RUC debe tener 11 dígitos</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Credenciales SUNAT (SOL)
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.sunat_user}
                  onChange={(e) => setForm((p) => ({ ...p, sunat_user: e.target.value.toUpperCase() }))}
                  placeholder={sender ? 'Actualizar usuario SOL (opcional)' : 'Usuario SOL'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.sunat_pass}
                    onChange={(e) => setForm((p) => ({ ...p, sunat_pass: e.target.value }))}
                    placeholder={sender ? 'Actualizar clave SOL (opcional)' : 'Clave SOL'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-red-500 text-[11px] font-black uppercase">{saveError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {(sender || isAdmin) && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                    if (sender) setForm({ name: sender.name, ruc: sender.ruc, sunat_user: '', sunat_pass: '' });
                    else setForm(EMPTY_FORM);
                  }}
                  disabled={saving}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!form.name || !form.ruc || form.ruc.length !== 11 || saving}
                className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

        /* Read-only sender view */
        ) : sender ? (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Razón Social</p>
              <p className="text-sm font-black text-slate-800">{sender.name}</p>
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
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
              <Trash2 size={16} />
              Eliminar Empresa
            </button>
          </div>
        ) : null}
      </div>}

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

      {/* ── Delete confirm modal ──────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="text-red-500" size={28} />
              </div>
              <div>
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">
                  Eliminar Empresa
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Esta acción eliminará la empresa configurada.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSender}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
