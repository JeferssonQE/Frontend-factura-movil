// views/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  Mail,
  Building,
  LogOut,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Crown,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { AuthUser, Sender, SenderUpsertInput, UserPlan } from '../types';

interface ProfileProps {
  user: AuthUser | null;
  sender: Sender | null;
  isAdmin: boolean;
  isContador?: boolean;
  onSaveSender: (sender: SenderUpsertInput) => Promise<void>;
  onGoToAdmin: () => void;
  onChangeSender?: () => void;
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
  isContador = false,
  onSaveSender,
  onGoToAdmin,
  onChangeSender,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<SenderFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!sender) {
      setForm(EMPTY_FORM);
      setIsEditing(false);
      return;
    }
    setForm({ name: sender.name, ruc: sender.ruc, sunat_user: '', sunat_pass: '' });
  }, [sender]);

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
                isAdmin ? 'bg-purple-50 text-purple-700' : isContador ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-600'
              }`}>
                {isAdmin ? 'Admin' : isContador ? 'Contador' : 'Empresa'}
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
      {!isAdmin && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Building className={isContador ? 'text-teal-600' : 'text-blue-600'} size={20} />
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                {isContador ? 'Empresa Activa' : 'Mi Empresa'}
              </h4>
            </div>

            {sender && !isEditing && !isContador && (
              <button onClick={() => setIsEditing(true)} className="text-blue-600 p-2">
                <Edit3 size={18} />
              </button>
            )}

            {sender && !isEditing && isContador && (
              <button onClick={() => setIsEditing(true)} className="text-teal-600 p-2">
                <Edit3 size={18} />
              </button>
            )}
          </div>

          {/* Contador: no sender selected */}
          {isContador && !sender && (
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

          {/* Contador editing: full form */}
          {isContador && sender && isEditing && (
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    placeholder="Actualizar usuario SOL (opcional)"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.sunat_pass}
                      onChange={(e) => setForm((p) => ({ ...p, sunat_pass: e.target.value }))}
                      placeholder="Actualizar clave SOL (opcional)"
                      autoComplete="new-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <span className="text-red-500 text-[11px] font-black uppercase">{saveError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                    setForm({ name: sender.name, ruc: sender.ruc, sunat_user: '', sunat_pass: '' });
                  }}
                  disabled={saving}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.ruc || form.ruc.length !== 11 || saving}
                  className="flex-1 bg-teal-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>

              {onChangeSender && (
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

          {/* Contador read-only */}
          {isContador && sender && !isEditing && (
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
              {onChangeSender && (
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

          {/* Empresa sin empresa configurada (legacy) */}
          {!isContador && !sender && (
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

          {/* Empresa: Razón Social y RUC solo lectura, SUNAT editable */}
          {!isContador && sender && (
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                  Razón Social <Lock size={10} />
                </p>
                <p className="text-sm font-black text-slate-600">{sender.name}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                  RUC <Lock size={10} />
                </p>
                <p className="text-sm font-black text-slate-600">{sender.ruc}</p>
              </div>
              <p className="text-[9px] text-slate-400 px-1 leading-relaxed">
                Estos datos los gestiona tu administrador.
              </p>

              {isEditing ? (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Credenciales SUNAT (SOL)
                  </p>
                  <input
                    type="text"
                    value={form.sunat_user}
                    onChange={(e) => setForm((p) => ({ ...p, sunat_user: e.target.value.toUpperCase() }))}
                    placeholder="Usuario SOL"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.sunat_pass}
                      onChange={(e) => setForm((p) => ({ ...p, sunat_pass: e.target.value }))}
                      placeholder="Clave SOL"
                      autoComplete="new-password"
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

                  {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <span className="text-red-500 text-[11px] font-black uppercase">{saveError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSaveError(null);
                        setForm({ name: sender.name, ruc: sender.ruc, sunat_user: '', sunat_pass: '' });
                      }}
                      disabled={saving}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!form.sunat_user || !form.sunat_pass || saving}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl p-4 flex items-center gap-3 ${sender.has_sunat_credentials ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <CheckCircle2 className={sender.has_sunat_credentials ? 'text-emerald-500' : 'text-amber-500'} size={18} />
                  <p className={`text-[10px] font-bold uppercase ${sender.has_sunat_credentials ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {sender.has_sunat_credentials ? 'Credenciales SUNAT configuradas' : 'Credenciales SUNAT pendientes'}
                  </p>
                </div>
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
    </div>
  );
};

export default Profile;
