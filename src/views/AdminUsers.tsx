// views/AdminUsers.tsx

import {
  Building2,
  KeyRound,
  type LucideIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlink,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDeleteDialog from '../components/ui/ConfirmDeleteDialog';
import Input from '../components/ui/Input';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import Modal from '../components/ui/Modal';
import Notice from '../components/ui/Notice';
import SegmentedControl from '../components/ui/SegmentedControl';
import Select from '../components/ui/Select';
import Switch from '../components/ui/Switch';
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

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

const ROLE_OPTIONS = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'admin', label: 'Admin' },
  { value: 'contador', label: 'Contador' },
];

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

const StatCard: React.FC<{
  icon: LucideIcon;
  iconClassName: string;
  value: number;
  label: string;
}> = ({ icon: Icon, iconClassName, value, label }) => (
  <Card className="flex flex-col items-center gap-2 p-4">
    <div className={`flex size-10 items-center justify-center rounded-control ${iconClassName}`}>
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </Card>
);

// Contrasena temporal: el campo se ve en claro a proposito, porque el admin se la tiene
// que dictar o copiar al usuario.
const TempPasswordField: React.FC<{
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
}> = ({ value, onChange, onGenerate }) => (
  <div className="flex items-end gap-2">
    <div className="flex-1">
      <Input
        label="Contraseña temporal (mín. 8)"
        type="text"
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete="off"
      />
    </div>
    <Button variant="outline" onClick={onGenerate} className="h-12">
      Generar
    </Button>
  </div>
);

const ModalActions: React.FC<{
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
  submitLabel: string;
  busyLabel: string;
  submitIcon: React.ReactNode;
}> = ({ onCancel, onSubmit, busy, submitLabel, busyLabel, submitIcon }) => (
  <div className="flex gap-3 pt-2">
    <Button variant="outline" className="flex-1" onClick={onCancel}>
      Cancelar
    </Button>
    <Button className="flex-1" onClick={onSubmit} loading={busy}>
      {!busy && submitIcon}
      {busy ? busyLabel : submitLabel}
    </Button>
  </div>
);

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

  const handleToggleEnvironment = async (userId: string, sender: Sender) => {
    const goingLive = sender.billing_environment !== 'prod';
    const question = goingLive
      ? `¿Pasar a ${sender.name} a PRODUCCIÓN? Desde ese momento cada comprobante es real ante SUNAT y anularlo exige una nota de crédito.`
      : `¿Devolver a ${sender.name} a PRUEBAS? Lo que ya emitió en producción no se deshace.`;
    if (!window.confirm(question)) return;

    setBusy(userId, true);
    try {
      const updated = await adminService.setBillingEnvironment(
        sender.id,
        goingLive ? 'prod' : 'dev',
      );
      setSenders((prev) => ({ ...prev, [userId]: updated }));
    } catch (e: unknown) {
      // El backend explica que falta (por ejemplo, que la autorizacion al PSE entre en
      // vigencia). Se muestra tal cual: inventar un texto aca seria perder el motivo.
      setError(e instanceof Error ? e.message : 'Error al cambiar el ambiente');
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

  const tabOptions: { value: AdminTab; label: string }[] = [
    { value: 'usuarios', label: 'Empresas' },
    {
      value: 'contadores',
      label: `Contadores${contadores.length > 0 ? ` (${contadores.length})` : ''}`,
    },
  ];

  const rowStateClasses = (isActive: boolean, isBusy: boolean): string =>
    [isActive ? '' : 'border-l-4 border-l-danger', isBusy ? 'pointer-events-none opacity-50' : '']
      .filter(Boolean)
      .join(' ');

  return (
    <div className="space-y-5 pb-8">
      <SegmentedControl
        options={tabOptions}
        value={activeTab}
        onChange={setActiveTab}
        aria-label="Sección de administración"
      />

      {activeTab === 'contadores' && (
        <div className="space-y-3">
          <Button fullWidth onClick={handleOpenCreateContador}>
            <UserPlus size={16} /> Nuevo contador
          </Button>

          {contadores.length === 0 && !loading && (
            <Card dashed className="py-14 text-center">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Sin contadores</p>
              <p className="mt-1 text-sm text-slate-500">Crea uno con el botón "Nuevo contador".</p>
            </Card>
          )}

          {contadores.map((contador) => {
            const contadorAssignments = assignments[contador.id] ?? [];
            const isActive = contador.is_active;
            const isBusy = !!actionLoading[contador.id];
            return (
              <Card key={contador.id} className={rowStateClasses(isActive, isBusy)}>
                <div className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(contador)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {contador.name || '—'}
                      </p>
                      {!isActive && <Badge tone="danger">Inactivo</Badge>}
                    </div>
                    <p className="truncate text-sm text-slate-500">{contador.email}</p>
                  </div>
                  <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(contador)}
                    disabled={isBusy}
                    title={isActive ? 'Desactivar contador' : 'Activar contador'}
                    aria-label={isActive ? 'Desactivar contador' : 'Activar contador'}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleOpenEditContador(contador)}
                    aria-label="Editar contador"
                  >
                    <Pencil size={16} />
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-100 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Empresas asignadas ({contadorAssignments.length})
                  </p>

                  {contadorAssignments.length > 0 && (
                    <div className="space-y-1.5">
                      {contadorAssignments.map((empresaId) => {
                        const empresaInfo = users.find((u) => u.id === empresaId);
                        return (
                          <div
                            key={empresaId}
                            className="flex items-center gap-2 rounded-control bg-slate-50 px-3 py-2"
                          >
                            <Building2 size={14} className="shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-700">
                                {empresaInfo?.name ??
                                  empresaInfo?.email ??
                                  `Empresa ${empresaId.slice(0, 8)}...`}
                              </p>
                              {empresaInfo?.email && empresaInfo?.name && (
                                <p className="truncate text-xs text-slate-500">
                                  {empresaInfo.email}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveEmpresa(contador.id, empresaId)}
                              aria-label="Desvincular empresa"
                              title="Desvincular empresa"
                            >
                              <Unlink size={14} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button variant="outline" fullWidth onClick={() => handleOpenAssign(contador)}>
                    <Plus size={16} /> Asignar empresa
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'usuarios' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Users}
              iconClassName="bg-slate-100 text-slate-600"
              value={stats.total}
              label="Total"
            />
            <StatCard
              icon={UserCheck}
              iconClassName="bg-success/10 text-success"
              value={stats.active}
              label="Activos"
            />
            <StatCard
              icon={UserX}
              iconClassName="bg-danger/10 text-danger"
              value={stats.inactive}
              label="Inactivos"
            />
          </div>

          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                type="text"
                placeholder="Buscar por nombre o email"
                aria-label="Buscar usuario por nombre o email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>

            <Button onClick={handleOpenCreate} aria-label="Crear nuevo usuario" className="h-12">
              <UserPlus size={16} /> Nuevo
            </Button>

            <Button
              variant="outline"
              size="icon-lg"
              onClick={load}
              disabled={loading}
              aria-label="Recargar lista"
              className="h-12 w-12"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>

          {error && (
            <Notice tone="danger" onDismiss={() => setError(null)}>
              {error}
            </Notice>
          )}

          {!loading && filtered.length > 0 && (
            <p className="px-1 text-sm text-slate-500">
              {filtered.length === users.length
                ? `${users.length} usuario${users.length !== 1 ? 's' : ''}`
                : `${filtered.length} de ${users.length} usuario${users.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {loading && (
            <div className="py-16">
              <LoadingIndicator label="Cargando usuarios" size="md" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <Card dashed className="py-14 text-center">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                {search ? 'Sin resultados' : 'Sin usuarios'}
              </p>
              {search && (
                <Button variant="ghost" className="mt-2" onClick={() => setSearch('')}>
                  Limpiar búsqueda
                </Button>
              )}
            </Card>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((user) => {
                const isSelf = user.id === currentUserId;
                const isBusy = !!actionLoading[user.id];
                const sender = senders[user.id];
                const canEditCompany = user.role === UserRole.EMPRESA && !!sender;
                const displayName = user.name || user.email;

                return (
                  <Card key={user.id} className={rowStateClasses(user.is_active, isBusy)}>
                    <div className="flex items-start gap-3 p-4">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-sm font-semibold text-primary"
                        aria-hidden="true"
                      >
                        {user.role === UserRole.ADMIN ? (
                          <Shield size={17} strokeWidth={2.5} />
                        ) : (
                          getInitials(user)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name || '—'}
                          </p>
                          {isSelf && <Badge tone="info">Tú</Badge>}
                        </div>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                        {sender && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <Building2 size={12} className="shrink-0" />
                            <span className="truncate font-semibold text-slate-700">
                              {sender.name}
                            </span>
                            <span>·</span>
                            <span>{sender.ruc}</span>
                            <Badge
                              tone={sender.billing_environment === 'prod' ? 'success' : 'warning'}
                            >
                              {sender.billing_environment === 'prod' ? 'Producción' : 'Pruebas'}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <Badge tone={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4">
                      <Select
                        size="sm"
                        value={user.plan}
                        onChange={(e) => handleChangePlan(user.id, e.target.value)}
                        disabled={isBusy}
                        aria-label={`Plan de ${displayName}`}
                      >
                        {PLAN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>

                      <Select
                        size="sm"
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        disabled={isBusy || isSelf}
                        aria-label={`Rol de ${displayName}`}
                        title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>

                      {sender && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleEnvironment(user.id, sender)}
                          disabled={isBusy}
                          title={
                            sender.billing_environment === 'prod'
                              ? 'Devolver a pruebas'
                              : 'Pasar a producción (emite ante SUNAT)'
                          }
                        >
                          {sender.billing_environment === 'prod' ? 'A pruebas' : 'A producción'}
                        </Button>
                      )}

                      <div className="flex-1" />

                      <Switch
                        checked={user.is_active}
                        onChange={() => handleToggleActive(user)}
                        disabled={isBusy || isSelf}
                        title={
                          isSelf
                            ? 'No puedes desactivarte a ti mismo'
                            : user.is_active
                              ? 'Desactivar cuenta'
                              : 'Activar cuenta'
                        }
                        aria-label={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                      />

                      {canEditCompany && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEdit(user)}
                          disabled={isBusy}
                          title="Editar empresa"
                          aria-label={`Editar empresa de ${displayName}`}
                        >
                          <Pencil size={16} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenReset(user.id)}
                        disabled={isBusy}
                        title="Cambiar contraseña"
                        aria-label={`Cambiar contraseña de ${displayName}`}
                      >
                        <KeyRound size={16} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteUserId(user.id)}
                        disabled={isBusy || isSelf}
                        title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                        aria-label={`Eliminar ${displayName}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {assignModal && (
        <Modal
          layout="form"
          title="Asignar empresa"
          description={assignModal.contadorName}
          icon={<Building2 size={22} />}
          iconTone="accent"
          onClose={() => setAssignModal(null)}
        >
          {assignError && (
            <div className="mb-4">
              <Notice tone="danger">{assignError}</Notice>
            </div>
          )}

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
                  <div className="py-8">
                    <LoadingIndicator label="Cargando" size="md" />
                  </div>
                ) : available.length === 0 ? (
                  <div className="py-8 text-center">
                    <Building2 size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Sin empresas disponibles</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Todas las cuentas de empresa ya están asignadas.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="px-1 text-sm font-medium text-slate-700">
                      Selecciona una cuenta empresa
                    </p>
                    <div className="-mx-1 max-h-64 space-y-2 overflow-y-auto px-1">
                      {available.map((empresa) => (
                        <button
                          key={empresa.id}
                          type="button"
                          onClick={() => handleAssignEmpresa(empresa.id)}
                          disabled={assignBusy}
                          className="flex w-full items-center gap-3 rounded-control border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-accent active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-slate-100 text-xs font-semibold text-slate-600">
                            {getInitials(empresa)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {empresa.name || '—'}
                            </p>
                            <p className="truncate text-xs text-slate-500">{empresa.email}</p>
                          </div>
                          {assignBusy ? (
                            <RefreshCw size={14} className="shrink-0 animate-spin text-accent" />
                          ) : (
                            <Plus size={14} className="shrink-0 text-slate-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Button variant="outline" fullWidth onClick={() => setAssignModal(null)}>
                  Cancelar
                </Button>
              </div>
            );
          })()}
        </Modal>
      )}

      {showCreate && (
        <Modal
          layout="form"
          title="Nueva empresa"
          description="Plan Free · Rol Empresa"
          icon={<Building2 size={22} />}
          iconTone="accent"
          onClose={() => setShowCreate(false)}
        >
          {createError && (
            <div className="mb-4">
              <Notice tone="danger">{createError}</Notice>
            </div>
          )}

          <div className="space-y-3">
            <p className="ml-1 text-sm font-semibold text-slate-700">Datos de la empresa</p>

            <Input
              label="RUC (11 dígitos)"
              type="text"
              inputMode="numeric"
              value={createForm.ruc}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  ruc: e.target.value.replace(/\D/g, '').slice(0, RUC_LENGTH),
                }))
              }
              placeholder="20123456789"
              maxLength={RUC_LENGTH}
              autoFocus
              trailing={
                rucLookupBusy ? <RefreshCw size={16} className="animate-spin text-accent" /> : null
              }
            />

            <Input
              label="Razón social"
              type="text"
              value={createForm.razon_social}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  razon_social: e.target.value.toUpperCase().slice(0, RAZON_SOCIAL_MAX_LENGTH),
                }))
              }
              placeholder="Se completa con el RUC"
              maxLength={RAZON_SOCIAL_MAX_LENGTH}
            />

            <p className="ml-1 pt-2 text-sm font-semibold text-slate-700">Acceso del usuario</p>

            <Input
              label="Nombre de contacto"
              type="text"
              value={createForm.name}
              onChange={handleCreateFormChange('name')}
              placeholder="Juan Pérez"
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              value={createForm.email}
              onChange={handleCreateFormChange('email')}
              placeholder="usuario@empresa.com"
              autoComplete="email"
            />

            <TempPasswordField
              value={createForm.password}
              onChange={handleCreateFormChange('password')}
              onGenerate={generateTempPassword}
            />

            <Notice tone="info">
              El usuario deberá cambiar esta contraseña al iniciar sesión.
            </Notice>

            <ModalActions
              onCancel={() => setShowCreate(false)}
              onSubmit={handleCreateUser}
              busy={createBusy}
              submitLabel="Crear empresa"
              busyLabel="Creando…"
              submitIcon={<UserPlus size={16} />}
            />
          </div>
        </Modal>
      )}

      {showCreateContador && (
        <Modal
          layout="form"
          title="Nuevo contador"
          description="Rol Contador · Sin empresa"
          icon={<Users size={22} />}
          iconTone="accent"
          onClose={() => setShowCreateContador(false)}
        >
          {contadorError && (
            <div className="mb-4">
              <Notice tone="danger">{contadorError}</Notice>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Nombre"
              type="text"
              value={contadorForm.name}
              onChange={(e) => setContadorForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Juan Pérez"
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              value={contadorForm.email}
              onChange={(e) => setContadorForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="contador@correo.com"
              autoComplete="email"
            />

            <TempPasswordField
              value={contadorForm.password}
              onChange={(e) => setContadorForm((prev) => ({ ...prev, password: e.target.value }))}
              onGenerate={() =>
                setContadorForm((prev) => ({ ...prev, password: randomTempPassword() }))
              }
            />

            <Notice tone="info">
              El contador deberá cambiar esta contraseña al iniciar sesión. Podrás asignarle
              empresas después.
            </Notice>

            <ModalActions
              onCancel={() => setShowCreateContador(false)}
              onSubmit={handleCreateContador}
              busy={contadorBusy}
              submitLabel="Crear contador"
              busyLabel="Creando…"
              submitIcon={<UserPlus size={16} />}
            />
          </div>
        </Modal>
      )}

      {editContadorId && (
        <Modal
          layout="form"
          title="Editar contador"
          description={editContadorForm.email}
          icon={<Users size={22} />}
          iconTone="accent"
          onClose={() => setEditContadorId(null)}
        >
          {editContadorError && (
            <div className="mb-4">
              <Notice tone="danger">{editContadorError}</Notice>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Nombre"
              type="text"
              value={editContadorForm.name}
              onChange={(e) => setEditContadorForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Juan Pérez"
            />

            <Input
              label="Email"
              type="email"
              value={editContadorForm.email}
              onChange={(e) => setEditContadorForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="contador@correo.com"
            />

            <ModalActions
              onCancel={() => setEditContadorId(null)}
              onSubmit={handleUpdateContador}
              busy={editContadorBusy}
              submitLabel="Guardar"
              busyLabel="Guardando…"
              submitIcon={<Pencil size={16} />}
            />
          </div>
        </Modal>
      )}

      {editUserId && (
        <Modal
          layout="form"
          title="Editar empresa"
          description={editUserName}
          icon={<Building2 size={22} />}
          iconTone="accent"
          onClose={() => setEditUserId(null)}
        >
          {editError && (
            <div className="mb-4">
              <Notice tone="danger">{editError}</Notice>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Nombre de contacto"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Juan Pérez"
            />

            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="empresa@correo.com"
            />

            <Input
              label="Razón social"
              type="text"
              value={editForm.razon_social}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, razon_social: e.target.value.toUpperCase() }))
              }
              placeholder="MI EMPRESA SAC"
            />

            <Input
              label="RUC (11 dígitos)"
              type="text"
              inputMode="numeric"
              value={editForm.ruc}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  ruc: e.target.value.replace(/\D/g, '').slice(0, 11),
                }))
              }
              placeholder="20123456789"
              maxLength={11}
            />

            <ModalActions
              onCancel={() => setEditUserId(null)}
              onSubmit={handleUpdateCompany}
              busy={editBusy}
              submitLabel="Guardar cambios"
              busyLabel="Guardando…"
              submitIcon={<Pencil size={16} />}
            />
          </div>
        </Modal>
      )}

      {resetUserId && (
        <Modal
          layout="form"
          title="Cambiar contraseña"
          description={resetUserName}
          icon={<KeyRound size={22} />}
          iconTone="accent"
          onClose={() => setResetUserId(null)}
        >
          {resetError && (
            <div className="mb-4">
              <Notice tone="danger">{resetError}</Notice>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Nueva contraseña (mín. 8 caracteres)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              autoComplete="new-password"
            />

            <ModalActions
              onCancel={() => setResetUserId(null)}
              onSubmit={handleResetPassword}
              busy={resetBusy}
              submitLabel="Cambiar clave"
              busyLabel="Guardando…"
              submitIcon={<KeyRound size={16} />}
            />
          </div>
        </Modal>
      )}

      {deleteUserId && (
        <ConfirmDeleteDialog
          title="Eliminar usuario"
          message={`Se eliminará permanentemente la cuenta de ${deleteUserName}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          busy={deleteBusy}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUserId(null)}
        />
      )}
    </div>
  );
};

export default AdminUsers;
