// views/AdminUsers.tsx
import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  RefreshCw,
  X,
  AlertCircle,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  UserCheck,
  UserX,
  Crown,
  Sparkles,
} from 'lucide-react';
import { AdminUserRow, UserRole, UserPlan } from '../types';
import { adminService } from '../services/business/adminService';

interface AdminUsersProps {
  currentUserId: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free:       { bg: 'bg-slate-100',    text: 'text-slate-500',  label: 'FREE'       },
  pro:        { bg: 'bg-blue-50',      text: 'text-blue-600',   label: 'PRO'        },
  enterprise: { bg: 'bg-purple-50',    text: 'text-purple-600', label: 'ENTERPRISE' },
};

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  admin:   { bg: 'bg-purple-50', text: 'text-purple-700' },
  empresa: { bg: 'bg-blue-50',   text: 'text-blue-600'   },
};

const getInitials = (user: AdminUserRow) => {
  const base = user.name || user.email;
  if (base.includes('@')) return base.substring(0, 2).toUpperCase();
  return base.split(' ').filter(Boolean).map((p) => p[0]).join('').substring(0, 2).toUpperCase();
};

// ─── component ──────────────────────────────────────────────────────────────

const AdminUsers: React.FC<AdminUsersProps> = ({ currentUserId }) => {
  const [users,         setUsers]         = useState<AdminUserRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // modals
  const [showCreate,   setShowCreate]   = useState(false);
  const [resetUserId,  setResetUserId]  = useState<string | null>(null);

  // create form
  const [createForm,  setCreateForm]  = useState({ name: '', email: '', password: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy,  setCreateBusy]  = useState(false);

  // reset password form
  const [newPassword, setNewPassword] = useState('');
  const [resetError,  setResetError]  = useState<string | null>(null);
  const [resetBusy,   setResetBusy]   = useState(false);

  // ── data ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminService.listUsers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const busy = (id: string, v: boolean) =>
    setActionLoading((p) => ({ ...p, [id]: v }));

  // ── actions ───────────────────────────────────────────────────────────────

  const toggleActive = async (user: AdminUserRow) => {
    if (user.id === currentUserId) return;
    busy(user.id, true);
    try {
      const r = user.is_active
        ? await adminService.deactivateUser(user.id)
        : await adminService.activateUser(user.id);
      setUsers((p) => p.map((u) => (u.id === user.id ? r.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    } finally {
      busy(user.id, false);
    }
  };

  const changePlan = async (userId: string, plan: string) => {
    busy(userId, true);
    try {
      const r = await adminService.changeUserPlan(userId, plan as UserPlan);
      setUsers((p) => p.map((u) => (u.id === userId ? r.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar plan');
    } finally {
      busy(userId, false);
    }
  };

  const changeRole = async (userId: string, role: string) => {
    busy(userId, true);
    try {
      const r = await adminService.changeUserRole(userId, role as UserRole);
      setUsers((p) => p.map((u) => (u.id === userId ? r.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar rol');
    } finally {
      busy(userId, false);
    }
  };

  const createUser = async () => {
    setCreateError(null);
    const { name, email, password } = createForm;
    if (!name.trim() || !email.trim() || password.length < 8) {
      setCreateError('Completa todos los campos. La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setCreateBusy(true);
    try {
      const u = await adminService.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setUsers((p) => [u, ...p]);
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '' });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Error al crear usuario');
    } finally {
      setCreateBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!resetUserId) return;
    setResetError(null);
    if (newPassword.length < 8) {
      setResetError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setResetBusy(true);
    try {
      await adminService.resetUserPassword(resetUserId, newPassword);
      setResetUserId(null);
      setNewPassword('');
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    } finally {
      setResetBusy(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total:      users.length,
    active:     users.filter((u) => u.is_active).length,
    inactive:   users.filter((u) => !u.is_active).length,
    pro:        users.filter((u) => u.plan === 'pro' || u.plan === 'enterprise').length,
  };

  const resetUserName = users.find((u) => u.id === resetUserId)?.name
    || users.find((u) => u.id === resetUserId)?.email
    || '';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-6">

      {/* ── Stats cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total',    value: stats.total,    icon: Users,     color: 'text-slate-600',  bg: 'bg-slate-100'   },
          { label: 'Activos',  value: stats.active,   icon: UserCheck, color: 'text-emerald-600',bg: 'bg-emerald-50'  },
          { label: 'Inactivos',value: stats.inactive, icon: UserX,     color: 'text-red-500',    bg: 'bg-red-50'      },
          { label: 'Pro/Ent',  value: stats.pro,      icon: Crown,     color: 'text-purple-600', bg: 'bg-purple-50'   },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-3 flex flex-col items-center text-center">
            <div className={`${s.bg} ${s.color} w-8 h-8 rounded-xl flex items-center justify-center mb-2`}>
              <s.icon size={16} strokeWidth={2.5} />
            </div>
            <p className="text-base font-black text-slate-900 leading-none">{s.value}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search + actions ────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-3 pl-10 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 font-medium outline-none"
          />
        </div>

        <button
          onClick={() => { setCreateError(null); setCreateForm({ name: '', email: '', password: '' }); setShowCreate(true); }}
          className="bg-slate-900 text-white px-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <UserPlus size={16} />
          Nuevo
        </button>

        <button
          onClick={load}
          disabled={loading}
          className="bg-white text-slate-400 p-3 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={16} />
          <p className="text-red-700 text-[10px] font-black uppercase flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400"><X size={14} /></button>
        </div>
      )}

      {/* ── Table header ────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4">
          {['Usuario', 'Plan', 'Rol', ''].map((h) => (
            <p key={h} className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{h}</p>
          ))}
        </div>
      )}

      {/* ── User rows ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="animate-spin text-slate-400" size={28} />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Cargando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Users size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sin usuarios</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const isSelf = user.id === currentUserId;
            const isBusy = !!actionLoading[user.id];
            const plan   = PLAN_STYLE[user.plan]   ?? PLAN_STYLE.free;
            const role   = ROLE_STYLE[user.role]   ?? ROLE_STYLE.empresa;

            return (
              <div
                key={user.id}
                className={`bg-white rounded-[24px] border shadow-sm transition-all ${
                  user.is_active ? 'border-slate-100' : 'border-red-100'
                } ${isBusy ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {/* Main row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3">

                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-[11px] shrink-0 ${
                      user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role === UserRole.ADMIN ? <Shield size={16} /> : getInitials(user)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-slate-800 uppercase truncate tracking-tight leading-tight">
                        {user.name || '—'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate leading-tight">{user.email}</p>
                    </div>
                  </div>

                  {/* Plan selector */}
                  <div className="relative">
                    <select
                      value={user.plan}
                      onChange={(e) => changePlan(user.id, e.target.value)}
                      disabled={isBusy}
                      className={`appearance-none text-[8px] font-black uppercase tracking-widest pl-2 pr-5 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer ${plan.bg} ${plan.text}`}
                    >
                      <option value="free">FREE</option>
                      <option value="pro">PRO</option>
                      <option value="enterprise">ENT</option>
                    </select>
                    <ChevronDown size={9} className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 ${plan.text}`} />
                  </div>

                  {/* Role selector */}
                  <div className="relative">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      disabled={isBusy || isSelf}
                      className={`appearance-none text-[8px] font-black uppercase tracking-widest pl-2 pr-5 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-purple-400 outline-none cursor-pointer disabled:opacity-50 ${role.bg} ${role.text}`}
                    >
                      <option value="empresa">EMPRESA</option>
                      <option value="admin">ADMIN</option>
                    </select>
                    <ChevronDown size={9} className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 ${role.text}`} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={isBusy || isSelf}
                      className="disabled:opacity-30 transition-colors"
                      title={isSelf ? 'No puedes desactivarte a ti mismo' : user.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {user.is_active
                        ? <ToggleRight className="text-emerald-500" size={26} />
                        : <ToggleLeft className="text-slate-300" size={26} />
                      }
                    </button>

                    <button
                      onClick={() => { setResetError(null); setNewPassword(''); setResetUserId(user.id); }}
                      disabled={isBusy}
                      className="p-1.5 text-slate-300 hover:text-amber-500 disabled:opacity-30 transition-colors"
                      title="Cambiar contraseña"
                    >
                      <KeyRound size={15} />
                    </button>
                  </div>
                </div>

                {/* Inactive ribbon */}
                {!user.is_active && (
                  <div className="px-4 pb-3">
                    <span className="text-[8px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest">
                      Cuenta desactivada
                    </span>
                  </div>
                )}

                {/* Self badge */}
                {isSelf && (
                  <div className="px-4 pb-3">
                    <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                      Tú
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create user modal ───────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Nuevo Usuario</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Plan FREE · Rol Empresa</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 text-slate-300"><X size={20} /></button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-5">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-red-700 text-[10px] font-black uppercase">{createError}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contraseña (mín. 8 caracteres)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={createUser}
                  disabled={createBusy}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createBusy ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {createBusy ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset password modal ────────────────────────────────────────── */}
      {resetUserId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Cambiar Contraseña</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[180px]">{resetUserName}</p>
                </div>
              </div>
              <button onClick={() => setResetUserId(null)} className="p-2 text-slate-300"><X size={20} /></button>
            </div>

            {resetError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-5">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-red-700 text-[10px] font-black uppercase">{resetError}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setResetUserId(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={resetPassword}
                  disabled={resetBusy}
                  className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetBusy ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {resetBusy ? 'Guardando...' : 'Cambiar Clave'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
