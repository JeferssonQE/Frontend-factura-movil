// views/AdminUsers.tsx

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronDown,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Unlink,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import { adminService } from '../services/business/adminService';
import { type ContadorAssignment, contadorService } from '../services/business/contadorService';
import { lookupService } from '../services/business/lookupService';
import { type AdminUserRow, type Sender, type UserPlan, UserRole } from '../types';

// ─── props ──────────────────────────────────────────────────────────────────

interface AdminUsersProps {
  currentUserId: string;
}

// ─── lookup tables ──────────────────────────────────────────────────────────

const PLAN_META: Record<string, { bg: string; text: string; selectRing: string; label: string }> = {
  free: {
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    selectRing: 'focus:ring-slate-400',
    label: 'FREE',
  },
  pro: { bg: 'bg-blue-50', text: 'text-blue-600', selectRing: 'focus:ring-blue-400', label: 'PRO' },
  enterprise: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    selectRing: 'focus:ring-purple-400',
    label: 'ENTERPRISE',
  },
};

const ROLE_META: Record<string, { bg: string; text: string; selectRing: string }> = {
  admin: { bg: 'bg-purple-50', text: 'text-purple-700', selectRing: 'focus:ring-purple-400' },
  empresa: { bg: 'bg-blue-50', text: 'text-blue-600', selectRing: 'focus:ring-blue-400' },
  contador: { bg: 'bg-emerald-50', text: 'text-emerald-700', selectRing: 'focus:ring-emerald-400' },
};

type AdminTab = 'usuarios' | 'contadores';

interface ContadorAssignments {
  [contadorId: string]: string[];
}

interface AssignModalState {
  contadorId: string;
  contadorName: string;
}

// ─── pure helpers ────────────────────────────────────────────────────────────

const getInitials = (user: AdminUserRow): string => {
  const base = user.name || user.email;
  if (base.includes('@')) return base.substring(0, 2).toUpperCase();
  return base
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const randomTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const RUC_LENGTH = 11;
const RAZON_SOCIAL_MAX_LENGTH = 100;

// ─── sub-components ──────────────────────────────────────────────────────────

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

interface ModalErrorProps {
  message: string;
}

const ModalError: React.FC<ModalErrorProps> = ({ message }) => (
  <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-5">
    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
    <p className="text-red-700 text-[10px] font-black uppercase leading-relaxed">{message}</p>
  </div>
);

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, children }) => (
  <div>
    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
      {label}
    </label>
    {children}
  </div>
);

const inputClass =
  'w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300';

// ─── component ──────────────────────────────────────────────────────────────

const AdminUsers: React.FC<AdminUsersProps> = ({ currentUserId }) => {
  // ── state ─────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<ContadorAssignments>({});
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [allAssignments, setAllAssignments] = useState<ContadorAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    razon_social: '',
    ruc: '',
    name: '',
    email: '',
    password: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [rucLookupBusy, setRucLookupBusy] = useState(false);

  const [showCreateContador, setShowCreateContador] = useState(false);
  const [contadorForm, setContadorForm] = useState({ name: '', email: '', password: '' });
  const [contadorError, setContadorError] = useState<string | null>(null);
  const [contadorBusy, setContadorBusy] = useState(false);

  const [editContadorId, setEditContadorId] = useState<string | null>(null);
  const [editContadorForm, setEditContadorForm] = useState({ name: '', email: '' });
  const [editContadorError, setEditContadorError] = useState<string | null>(null);
  const [editContadorBusy, setEditContadorBusy] = useState(false);

  const [senders, setSenders] = useState<Record<string, Sender>>({});
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', razon_social: '', ruc: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ── data ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userList, senderList] = await Promise.all([
        adminService.listUsers(),
        adminService.listSenders(),
      ]);
      setUsers(userList);
      setSenders(Object.fromEntries(senderList.map((s) => [s.user_id, s])));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const rawAssignments = await contadorService.getAllAssignments();
      setAllAssignments(rawAssignments);
      const map: ContadorAssignments = {};
      for (const a of rawAssignments) {
        map[a.contador_user_id] = [...(map[a.contador_user_id] ?? []), a.empresa_user_id];
      }
      setAssignments(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar asignaciones');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contadores') loadAssignments();
  }, [activeTab]);

  // ── helpers ───────────────────────────────────────────────────────────────

  const setBusy = (id: string, value: boolean) =>
    setActionLoading((prev) => ({ ...prev, [id]: value }));

  // ── action handlers ───────────────────────────────────────────────────────

  const handleToggleActive = async (user: AdminUserRow) => {
    if (user.id === currentUserId) return;
    setBusy(user.id, true);
    try {
      const result = user.is_active
        ? await adminService.deactivateUser(user.id)
        : await adminService.activateUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? result.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado del usuario');
    } finally {
      setBusy(user.id, false);
    }
  };

  const handleChangePlan = async (userId: string, plan: string) => {
    setBusy(userId, true);
    try {
      const result = await adminService.changeUserPlan(userId, plan as UserPlan);
      setUsers((prev) => prev.map((u) => (u.id === userId ? result.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar plan');
    } finally {
      setBusy(userId, false);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    setBusy(userId, true);
    try {
      const result = await adminService.changeUserRole(userId, role as UserRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? result.user : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar rol');
    } finally {
      setBusy(userId, false);
    }
  };

  const EMPTY_CREATE_FORM = { razon_social: '', ruc: '', name: '', email: '', password: '' };

  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setShowCreate(true);
  };

  const generateTempPassword = () => {
    setCreateForm((prev) => ({ ...prev, password: randomTempPassword() }));
  };

  const handleCreateRucLookup = async (ruc: string) => {
    setRucLookupBusy(true);
    const result = await lookupService.lookupRuc(ruc);
    setRucLookupBusy(false);
    if (result?.razon_social) {
      setCreateForm((prev) => ({
        ...prev,
        razon_social: result.razon_social.toUpperCase().slice(0, RAZON_SOCIAL_MAX_LENGTH),
      }));
    }
  };

  useDebouncedLookup(createForm.ruc, RUC_LENGTH, handleCreateRucLookup);

  const handleCreateUser = async () => {
    setCreateError(null);
    const { razon_social, ruc, name, email, password } = createForm;
    if (
      !razon_social.trim() ||
      ruc.length !== 11 ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      setCreateError(
        'Completa todos los campos. RUC de 11 dígitos y contraseña de al menos 8 caracteres.',
      );
      return;
    }
    if (!isValidEmail(email.trim())) {
      setCreateError('Ingresa un email válido (ejemplo: nombre@correo.com).');
      return;
    }
    setCreateBusy(true);
    try {
      const newUser = await adminService.createUser({
        razon_social: razon_social.trim().toUpperCase(),
        ruc,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setUsers((prev) => [newUser, ...prev]);
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Error al crear empresa');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleOpenEdit = (user: AdminUserRow) => {
    const sender = senders[user.id];
    if (!sender) return;
    setEditError(null);
    setEditForm({
      name: user.name ?? '',
      email: user.email,
      razon_social: sender.name,
      ruc: sender.ruc,
    });
    setEditUserId(user.id);
  };

  const handleUpdateCompany = async () => {
    if (!editUserId) return;
    setEditError(null);
    const { name, email, razon_social, ruc } = editForm;
    if (!name.trim() || !email.trim() || !razon_social.trim() || ruc.length !== 11) {
      setEditError('Completa nombre, email, razón social y un RUC de 11 dígitos.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEditError('Ingresa un email válido (ejemplo: nombre@correo.com).');
      return;
    }
    setEditBusy(true);
    try {
      const { sender, user } = await adminService.updateCompany(editUserId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        razon_social: razon_social.trim().toUpperCase(),
        ruc,
      });
      setSenders((prev) => ({ ...prev, [editUserId]: sender }));
      setUsers((prev) => prev.map((u) => (u.id === editUserId ? user : u)));
      setEditUserId(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Error al actualizar empresa');
    } finally {
      setEditBusy(false);
    }
  };

  const handleOpenReset = (userId: string) => {
    setResetError(null);
    setNewPassword('');
    setResetUserId(userId);
  };

  const handleResetPassword = async () => {
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

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setDeleteBusy(true);
    try {
      await adminService.deleteUser(deleteUserId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar usuario');
      setDeleteUserId(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCreateFormChange =
    (field: keyof typeof createForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── contador handlers ─────────────────────────────────────────────────────

  const handleOpenAssign = (contador: AdminUserRow) => {
    setAssignError(null);
    setAssignModal({
      contadorId: contador.id,
      contadorName: contador.name ?? contador.email,
    });
  };

  const handleAssignEmpresa = async (empresaUserId: string) => {
    if (!assignModal) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      await contadorService.assignEmpresa(assignModal.contadorId, empresaUserId);
      setAssignments((prev) => ({
        ...prev,
        [assignModal.contadorId]: [...(prev[assignModal.contadorId] ?? []), empresaUserId],
      }));
      setAllAssignments((prev) => [
        ...prev,
        { contador_user_id: assignModal.contadorId, empresa_user_id: empresaUserId },
      ]);
      setAssignModal(null);
    } catch (e: unknown) {
      setAssignError(e instanceof Error ? e.message : 'Error al asignar');
    } finally {
      setAssignBusy(false);
    }
  };

  const handleRemoveEmpresa = async (contadorId: string, empresaUserId: string) => {
    try {
      await contadorService.removeEmpresa(contadorId, empresaUserId);
      setAssignments((prev) => ({
        ...prev,
        [contadorId]: (prev[contadorId] ?? []).filter((id) => id !== empresaUserId),
      }));
      setAllAssignments((prev) =>
        prev.filter(
          (a) => !(a.contador_user_id === contadorId && a.empresa_user_id === empresaUserId),
        ),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al quitar asignación');
    }
  };

  const EMPTY_CONTADOR_FORM = { name: '', email: '', password: '' };

  const handleOpenCreateContador = () => {
    setContadorError(null);
    setContadorForm(EMPTY_CONTADOR_FORM);
    setShowCreateContador(true);
  };

  const handleCreateContador = async () => {
    setContadorError(null);
    const { name, email, password } = contadorForm;
    if (!name.trim() || !email.trim() || password.length < 8) {
      setContadorError('Completa nombre, email y una contraseña de al menos 8 caracteres.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setContadorError('Ingresa un email válido (ejemplo: nombre@correo.com).');
      return;
    }
    setContadorBusy(true);
    try {
      const newContador = await adminService.createContador({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setUsers((prev) => [newContador, ...prev]);
      setShowCreateContador(false);
      setContadorForm(EMPTY_CONTADOR_FORM);
    } catch (e: unknown) {
      setContadorError(e instanceof Error ? e.message : 'Error al crear contador');
    } finally {
      setContadorBusy(false);
    }
  };

  const handleOpenEditContador = (contador: AdminUserRow) => {
    setEditContadorError(null);
    setEditContadorForm({ name: contador.name ?? '', email: contador.email });
    setEditContadorId(contador.id);
  };

  const handleUpdateContador = async () => {
    if (!editContadorId) return;
    setEditContadorError(null);
    const { name, email } = editContadorForm;
    if (!name.trim() || !email.trim()) {
      setEditContadorError('Completa nombre y email.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEditContadorError('Ingresa un email válido (ejemplo: nombre@correo.com).');
      return;
    }
    setEditContadorBusy(true);
    try {
      const updated = await adminService.updateContador(editContadorId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      setUsers((prev) => prev.map((u) => (u.id === editContadorId ? updated : u)));
      setEditContadorId(null);
    } catch (e: unknown) {
      setEditContadorError(e instanceof Error ? e.message : 'Error al actualizar contador');
    } finally {
      setEditContadorBusy(false);
    }
  };

  // ── derived values ────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q);
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  const contadores = users.filter((u) => u.role === UserRole.CONTADOR);

  const resetUserName =
    users.find((u) => u.id === resetUserId)?.name ??
    users.find((u) => u.id === resetUserId)?.email ??
    '';

  const editUserName =
    users.find((u) => u.id === editUserId)?.name ??
    users.find((u) => u.id === editUserId)?.email ??
    '';

  const deleteUserName =
    users.find((u) => u.id === deleteUserId)?.name ??
    users.find((u) => u.id === deleteUserId)?.email ??
    '';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">
      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'usuarios'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Empresas
        </button>
        <button
          onClick={() => setActiveTab('contadores')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'contadores'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Contadores {contadores.length > 0 && `(${contadores.length})`}
        </button>
      </div>

      {/* ── Contadores tab ───────────────────────────────────────────────── */}
      {activeTab === 'contadores' && (
        <div className="space-y-3">
          <button
            onClick={handleOpenCreateContador}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            <UserPlus size={14} /> Nuevo Contador
          </button>

          {contadores.length === 0 && !loading && (
            <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-[20px] bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users size={26} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                Sin contadores
              </p>
              <p className="text-[9px] text-slate-300 mt-1">
                Crea uno con el botón "Nuevo Contador".
              </p>
            </div>
          )}

          {contadores.map((contador) => {
            const contadorAssignments = assignments[contador.id] ?? [];
            const isActive = contador.is_active;
            const isBusy = !!actionLoading[contador.id];
            return (
              <div
                key={contador.id}
                className={[
                  'bg-white rounded-[24px] shadow-sm border-l-[3px] border-r border-t border-b transition-opacity',
                  isActive
                    ? 'border-l-transparent border-slate-100'
                    : 'border-l-red-300 border-slate-100',
                  isBusy ? 'opacity-50 pointer-events-none' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center font-black text-[11px] text-emerald-700 shrink-0">
                    {getInitials(contador)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate">
                        {contador.name || '—'}
                      </p>
                      {!isActive && (
                        <span className="shrink-0 text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{contador.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(contador)}
                    disabled={isBusy}
                    title={isActive ? 'Desactivar contador' : 'Activar contador'}
                    aria-label={isActive ? 'Desactivar contador' : 'Activar contador'}
                    className="disabled:opacity-30 transition-transform active:scale-90 shrink-0"
                  >
                    {isActive ? (
                      <ToggleRight className="text-emerald-500" size={26} />
                    ) : (
                      <ToggleLeft className="text-slate-300" size={26} />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenEditContador(contador)}
                    className="text-slate-300 hover:text-blue-500 transition-colors shrink-0"
                    aria-label="Editar contador"
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Empresas asignadas ({contadorAssignments.length})
                  </p>

                  {contadorAssignments.length > 0 && (
                    <div className="space-y-1.5">
                      {contadorAssignments.map((empresaId) => {
                        const empresaInfo = users.find((u) => u.id === empresaId);
                        return (
                          <div
                            key={empresaId}
                            className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2"
                          >
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-700 truncate">
                                {empresaInfo?.name ??
                                  empresaInfo?.email ??
                                  `Empresa ${empresaId.slice(0, 8)}...`}
                              </p>
                              {empresaInfo?.email && empresaInfo?.name && (
                                <p className="text-[9px] text-slate-400 truncate">
                                  {empresaInfo.email}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveEmpresa(contador.id, empresaId)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              aria-label="Desvincular empresa"
                              title="Desvincular empresa"
                            >
                              <Unlink size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenAssign(contador)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    <Plus size={13} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Asignar empresa
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats grid (only on usuarios tab) ───────────────────────────── */}
      {activeTab === 'usuarios' && (
        <>
          {/* ── Stats grid ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Users size={18} className="text-slate-600" strokeWidth={2.5} />
              </div>
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.total}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Total
              </p>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <UserCheck size={18} className="text-emerald-600" strokeWidth={2.5} />
              </div>
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.active}</p>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                Activos
              </p>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <UserX size={18} className="text-red-500" strokeWidth={2.5} />
              </div>
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.inactive}</p>
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                Inactivos
              </p>
            </div>
          </div>

          {/* ── Search + actions bar ─────────────────────────────────────────── */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={15}
                strokeWidth={2.5}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-10 pr-4 shadow-sm text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleOpenCreate}
              className="bg-slate-900 text-white px-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center gap-2 shrink-0"
              aria-label="Crear nuevo usuario"
            >
              <UserPlus size={15} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">
                Nuevo
              </span>
            </button>

            <button
              onClick={load}
              disabled={loading}
              className="bg-white border border-slate-100 text-slate-400 p-3 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-40 shrink-0"
              aria-label="Recargar lista"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* ── Error banner ─────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-2xl flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={16} />
              <p className="text-red-700 text-[10px] font-black uppercase flex-1 leading-relaxed">
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-500 transition-colors shrink-0"
                aria-label="Cerrar error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Section label ────────────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
              {filtered.length === users.length
                ? `${users.length} usuario${users.length !== 1 ? 's' : ''}`
                : `${filtered.length} de ${users.length} usuario${users.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {/* ── Loading state ────────────────────────────────────────────────── */}
          {loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="animate-spin text-slate-400" size={26} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                Cargando usuarios...
              </p>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────────────────── */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-[20px] bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users size={26} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {search ? 'Sin resultados' : 'Sin usuarios'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 text-[9px] font-black text-blue-500 uppercase tracking-widest"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}

          {/* ── User list ────────────────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((user) => {
                const isSelf = user.id === currentUserId;
                const isBusy = !!actionLoading[user.id];
                const planMeta = PLAN_META[user.plan] ?? PLAN_META.free;
                const roleMeta = ROLE_META[user.role] ?? ROLE_META.empresa;
                const sender = senders[user.id];
                const canEditCompany = user.role === UserRole.EMPRESA && !!sender;

                return (
                  <div
                    key={user.id}
                    className={[
                      'bg-white rounded-[24px] shadow-sm border-l-[3px] border-r border-t border-b transition-opacity',
                      user.is_active
                        ? 'border-l-transparent border-slate-100'
                        : 'border-l-red-300 border-slate-100',
                      isBusy ? 'opacity-50 pointer-events-none' : '',
                    ].join(' ')}
                  >
                    {/* Row 1 — Identity */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[11px] shrink-0 ${
                          user.role === UserRole.ADMIN
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === UserRole.CONTADOR
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-600'
                        }`}
                        aria-hidden="true"
                      >
                        {user.role === UserRole.ADMIN ? (
                          <Shield size={17} strokeWidth={2.5} />
                        ) : (
                          getInitials(user)
                        )}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate leading-tight">
                            {user.name || '—'}
                          </p>
                          {isSelf && (
                            <span className="shrink-0 text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              Tú
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                          {user.email}
                        </p>
                        {sender && (
                          <p className="text-[9px] text-slate-500 truncate leading-tight mt-1 flex items-center gap-1">
                            <Building2 size={10} className="text-slate-400 shrink-0" />
                            <span className="font-bold truncate">{sender.name}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-400">{sender.ruc}</span>
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="shrink-0">
                        {user.is_active ? (
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="text-[8px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                            INACTIVO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2 — Actions */}
                    <div className="flex items-center gap-2 px-4 pb-4 border-t border-slate-50 pt-3">
                      {/* Plan selector */}
                      <div className="relative">
                        <select
                          value={user.plan}
                          onChange={(e) => handleChangePlan(user.id, e.target.value)}
                          disabled={isBusy}
                          aria-label={`Plan de ${user.name || user.email}`}
                          className={[
                            'appearance-none text-[8px] font-black uppercase tracking-widest',
                            'pl-2.5 pr-6 py-2 rounded-xl border-none outline-none cursor-pointer',
                            'focus:ring-2 transition-colors',
                            planMeta.bg,
                            planMeta.text,
                            planMeta.selectRing,
                          ].join(' ')}
                        >
                          <option value="free">FREE</option>
                          <option value="pro">PRO</option>
                          <option value="enterprise">ENT</option>
                        </select>
                        <ChevronDown
                          size={9}
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${planMeta.text}`}
                        />
                      </div>

                      {/* Role selector */}
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          disabled={isBusy || isSelf}
                          aria-label={`Rol de ${user.name || user.email}`}
                          title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
                          className={[
                            'appearance-none text-[8px] font-black uppercase tracking-widest',
                            'pl-2.5 pr-6 py-2 rounded-xl border-none outline-none cursor-pointer',
                            'focus:ring-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                            roleMeta.bg,
                            roleMeta.text,
                            roleMeta.selectRing,
                          ].join(' ')}
                        >
                          <option value="empresa">EMPRESA</option>
                          <option value="admin">ADMIN</option>
                          <option value="contador">CONTADOR</option>
                        </select>
                        <ChevronDown
                          size={9}
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${roleMeta.text} ${isSelf ? 'opacity-30' : ''}`}
                        />
                      </div>

                      <div className="flex-1" />

                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={isBusy || isSelf}
                        title={
                          isSelf
                            ? 'No puedes desactivarte a ti mismo'
                            : user.is_active
                              ? 'Desactivar cuenta'
                              : 'Activar cuenta'
                        }
                        aria-label={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                        className="disabled:opacity-30 disabled:cursor-not-allowed transition-transform active:scale-90"
                      >
                        {user.is_active ? (
                          <ToggleRight className="text-emerald-500" size={28} />
                        ) : (
                          <ToggleLeft className="text-slate-300" size={28} />
                        )}
                      </button>

                      {/* Edit company */}
                      {canEditCompany && (
                        <button
                          onClick={() => handleOpenEdit(user)}
                          disabled={isBusy}
                          title="Editar empresa"
                          aria-label={`Editar empresa de ${user.name || user.email}`}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-30 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      )}

                      {/* Reset password */}
                      <button
                        onClick={() => handleOpenReset(user.id)}
                        disabled={isBusy}
                        title="Cambiar contraseña"
                        aria-label={`Cambiar contraseña de ${user.name || user.email}`}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                      >
                        <KeyRound size={15} />
                      </button>

                      {/* Delete user */}
                      <button
                        onClick={() => setDeleteUserId(user.id)}
                        disabled={isBusy || isSelf}
                        title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                        aria-label={`Eliminar ${user.name || user.email}`}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Assign sender modal ──────────────────────────────────────────── */}
      {assignModal && (
        <ModalShell onClose={() => setAssignModal(null)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Asignar Empresa
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">
                {assignModal.contadorName}
              </p>
            </div>
          </div>

          {assignError && <ModalError message={assignError} />}

          {(() => {
            const alreadyMine = new Set(assignments[assignModal.contadorId] ?? []);
            const assignedElsewhere = new Set(
              allAssignments
                .filter((a) => a.contador_user_id !== assignModal.contadorId)
                .map((a) => a.empresa_user_id),
            );
            const available = users.filter(
              (u) =>
                u.role === UserRole.EMPRESA &&
                !alreadyMine.has(u.id) &&
                !assignedElsewhere.has(u.id),
            );

            return (
              <div className="space-y-3">
                {assignmentsLoading ? (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <RefreshCw size={20} className="animate-spin text-slate-400" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Cargando...
                    </p>
                  </div>
                ) : available.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Building2 size={20} className="text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sin empresas disponibles
                    </p>
                    <p className="text-[9px] text-slate-300 mt-1">
                      Todas las cuentas de empresa ya están asignadas.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Selecciona una cuenta empresa
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto -mx-1 px-1">
                      {available.map((empresa) => (
                        <button
                          key={empresa.id}
                          onClick={() => handleAssignEmpresa(empresa.id)}
                          disabled={assignBusy}
                          className="w-full flex items-center gap-3 bg-slate-50 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 font-black text-[10px] text-blue-600">
                            {getInitials(empresa)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                              {empresa.name || '—'}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">{empresa.email}</p>
                          </div>
                          {assignBusy ? (
                            <RefreshCw
                              size={13}
                              className="animate-spin text-emerald-500 shrink-0"
                            />
                          ) : (
                            <Plus size={13} className="text-slate-300 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={() => setAssignModal(null)}
                  className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors mt-1"
                >
                  Cancelar
                </button>
              </div>
            );
          })()}
        </ModalShell>
      )}

      {/* ── Create user modal ────────────────────────────────────────────── */}
      {showCreate && (
        <ModalShell onClose={() => setShowCreate(false)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-slate-900 text-white rounded-2xl shrink-0">
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Nueva Empresa
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Plan FREE · Rol Empresa
              </p>
            </div>
          </div>

          {createError && <ModalError message={createError} />}

          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">
              Datos de la empresa
            </p>

            <FormField label="RUC (11 dígitos)">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={createForm.ruc}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      ruc: e.target.value.replace(/\D/g, '').slice(0, RUC_LENGTH),
                    }))
                  }
                  className={`${inputClass} pr-11`}
                  placeholder="20123456789"
                  maxLength={RUC_LENGTH}
                  autoFocus
                />
                {rucLookupBusy && (
                  <Loader2
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                  />
                )}
              </div>
            </FormField>

            <FormField label="Razón Social">
              <input
                type="text"
                value={createForm.razon_social}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    razon_social: e.target.value.toUpperCase().slice(0, RAZON_SOCIAL_MAX_LENGTH),
                  }))
                }
                className={inputClass}
                placeholder="Se completa con el RUC"
                maxLength={RAZON_SOCIAL_MAX_LENGTH}
              />
            </FormField>

            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1 pt-2">
              Acceso del usuario
            </p>

            <FormField label="Nombre de contacto">
              <input
                type="text"
                value={createForm.name}
                onChange={handleCreateFormChange('name')}
                className={inputClass}
                placeholder="Juan Pérez"
                autoComplete="name"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={createForm.email}
                onChange={handleCreateFormChange('email')}
                className={inputClass}
                placeholder="usuario@empresa.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Contraseña temporal (mín. 8)">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createForm.password}
                  onChange={handleCreateFormChange('password')}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={generateTempPassword}
                  className="shrink-0 px-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Generar
                </button>
              </div>
            </FormField>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={14} />
              <p className="text-[9px] text-blue-700 font-bold leading-relaxed">
                El usuario deberá cambiar esta contraseña al iniciar sesión.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={createBusy}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {createBusy ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <UserPlus size={13} />
                )}
                {createBusy ? 'Creando...' : 'Crear Empresa'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Create contador modal ────────────────────────────────────────── */}
      {showCreateContador && (
        <ModalShell onClose={() => setShowCreateContador(false)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0">
              <Users size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Nuevo Contador
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Rol Contador · Sin empresa
              </p>
            </div>
          </div>

          {contadorError && <ModalError message={contadorError} />}

          <div className="space-y-3">
            <FormField label="Nombre">
              <input
                type="text"
                value={contadorForm.name}
                onChange={(e) => setContadorForm((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClass}
                placeholder="Juan Pérez"
                autoComplete="name"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={contadorForm.email}
                onChange={(e) => setContadorForm((prev) => ({ ...prev, email: e.target.value }))}
                className={inputClass}
                placeholder="contador@correo.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Contraseña temporal (mín. 8)">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contadorForm.password}
                  onChange={(e) =>
                    setContadorForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() =>
                    setContadorForm((prev) => ({ ...prev, password: randomTempPassword() }))
                  }
                  className="shrink-0 px-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Generar
                </button>
              </div>
            </FormField>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
              <p className="text-[9px] text-emerald-700 font-bold leading-relaxed">
                El contador deberá cambiar esta contraseña al iniciar sesión. Podrás asignarle
                empresas después.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateContador(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateContador}
                disabled={contadorBusy}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {contadorBusy ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <UserPlus size={13} />
                )}
                {contadorBusy ? 'Creando...' : 'Crear Contador'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Edit contador modal ──────────────────────────────────────────── */}
      {editContadorId && (
        <ModalShell onClose={() => setEditContadorId(null)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Users size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Editar Contador
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">
                {editContadorForm.email}
              </p>
            </div>
          </div>

          {editContadorError && <ModalError message={editContadorError} />}

          <div className="space-y-3">
            <FormField label="Nombre">
              <input
                type="text"
                value={editContadorForm.name}
                onChange={(e) => setEditContadorForm((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClass}
                placeholder="Juan Pérez"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={editContadorForm.email}
                onChange={(e) =>
                  setEditContadorForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className={inputClass}
                placeholder="contador@correo.com"
              />
            </FormField>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setEditContadorId(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateContador}
                disabled={editContadorBusy}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {editContadorBusy ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Pencil size={13} />
                )}
                {editContadorBusy ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Edit company modal ───────────────────────────────────────────── */}
      {editUserId && (
        <ModalShell onClose={() => setEditUserId(null)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Editar Empresa
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">
                {editUserName}
              </p>
            </div>
          </div>

          {editError && <ModalError message={editError} />}

          <div className="space-y-3">
            <FormField label="Nombre de contacto">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClass}
                placeholder="Juan Pérez"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className={inputClass}
                placeholder="empresa@correo.com"
              />
            </FormField>

            <FormField label="Razón Social">
              <input
                type="text"
                value={editForm.razon_social}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, razon_social: e.target.value.toUpperCase() }))
                }
                className={inputClass}
                placeholder="MI EMPRESA SAC"
              />
            </FormField>

            <FormField label="RUC (11 dígitos)">
              <input
                type="text"
                inputMode="numeric"
                value={editForm.ruc}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    ruc: e.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
                className={inputClass}
                placeholder="20123456789"
                maxLength={11}
              />
            </FormField>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setEditUserId(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCompany}
                disabled={editBusy}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {editBusy ? <RefreshCw size={13} className="animate-spin" /> : <Pencil size={13} />}
                {editBusy ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Reset password modal ─────────────────────────────────────────── */}
      {resetUserId && (
        <ModalShell onClose={() => setResetUserId(null)}>
          <div className="flex items-center gap-3 mb-6 pr-8">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <KeyRound size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">
                Cambiar Contraseña
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">
                {resetUserName}
              </p>
            </div>
          </div>

          {resetError && <ModalError message={resetError} />}

          <div className="space-y-3">
            <FormField label="Nueva contraseña (mín. 8 caracteres)">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass.replace('focus:ring-blue-500', 'focus:ring-amber-500')}
                placeholder="••••••••"
                autoFocus
                autoComplete="new-password"
              />
            </FormField>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setResetUserId(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetBusy}
                className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {resetBusy ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <KeyRound size={13} />
                )}
                {resetBusy ? 'Guardando...' : 'Cambiar Clave'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Delete user modal ────────────────────────────────────────────── */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle className="text-red-500" size={30} />
              </div>
              <div>
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">
                  Eliminar Usuario
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Se eliminará permanentemente la cuenta de
                </p>
                <p className="text-[11px] font-black text-slate-800 mt-1 truncate px-2">
                  {deleteUserName}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteUserId(null)}
                  disabled={deleteBusy}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteBusy}
                  className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteBusy ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  {deleteBusy ? 'Eliminando...' : 'Eliminar'}
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
