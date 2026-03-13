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
} from 'lucide-react';
import { Sender, SenderUpsertInput } from '../types';

interface ProfileProps {
  user: any;
  sender: Sender | null;
  onSaveSender: (sender: SenderUpsertInput) => void;
  onDeleteSender: () => void;
  onLogout: () => void;
}

interface SenderFormState {
  name: string;
  ruc: string;
  sunat_user: string;
  sunat_pass: string;
}

const EMPTY_FORM: SenderFormState = {
  name: '',
  ruc: '',
  sunat_user: '',
  sunat_pass: '',
};

const Profile: React.FC<ProfileProps> = ({
  user,
  sender,
  onSaveSender,
  onDeleteSender,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(!sender);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState<SenderFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!sender) {
      setForm(EMPTY_FORM);
      setIsEditing(true);
      return;
    }

    setForm({
      name: sender.name,
      ruc: sender.ruc,
      sunat_user: '',
      sunat_pass: '',
    });
  }, [sender]);

  const handleSave = () => {
    if (!form.name || !form.ruc || form.ruc.length !== 11) return;

    onSaveSender({
      name: form.name.trim().toUpperCase(),
      ruc: form.ruc.trim(),
      sunat_user: form.sunat_user.trim() || undefined,
      sunat_pass: form.sunat_pass.trim() || undefined,
    });

    setIsEditing(false);
    setForm((prev) => ({
      ...prev,
      sunat_user: '',
      sunat_pass: '',
    }));
  };

  const handleDeleteSender = () => {
    setShowDeleteConfirm(false);
    onDeleteSender();
  };

  const getUserInitials = () => {
    const baseName = user?.name || user?.user_metadata?.name || user?.email || 'US';
    if (baseName.includes('@')) return baseName.substring(0, 2).toUpperCase();

    return baseName
      .split(' ')
      .filter(Boolean)
      .map((part: string) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const displayName = user?.name || user?.user_metadata?.name || 'Usuario';
  const displayEmail = user?.email || '';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center text-white font-black text-lg">
            {getUserInitials()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
              <Mail size={12} />
              {displayEmail}
            </p>
            {user?.role && (
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-2">
                {user.role}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
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
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Razón Social
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    name: event.target.value.toUpperCase(),
                  }))
                }
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
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ruc: event.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
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
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sunat_user: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={sender ? 'Actualizar usuario SOL (opcional)' : 'Usuario SOL'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.sunat_pass}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sunat_pass: event.target.value,
                      }))
                    }
                    placeholder={sender ? 'Actualizar clave SOL (opcional)' : 'Clave SOL'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {sender && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setForm({
                      name: sender.name,
                      ruc: sender.ruc,
                      sunat_user: '',
                      sunat_pass: '',
                    });
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!form.name || !form.ruc || form.ruc.length !== 11}
                className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                Razón Social
              </p>
              <p className="text-sm font-black text-slate-800">{sender.name}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">RUC</p>
              <p className="text-sm font-black text-slate-800">{sender.ruc}</p>
            </div>

            <div
              className={`rounded-xl p-4 flex items-center gap-3 ${
                sender.has_sunat_credentials ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              <CheckCircle2
                className={sender.has_sunat_credentials ? 'text-emerald-500' : 'text-amber-500'}
                size={18}
              />
              <p
                className={`text-[10px] font-bold uppercase ${
                  sender.has_sunat_credentials ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {sender.has_sunat_credentials
                  ? 'Credenciales SUNAT configuradas'
                  : 'Credenciales SUNAT pendientes'}
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
        )}
      </div>

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
                  Esta acción eliminará la empresa configurada del usuario actual.
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