import React, { useState } from 'react';
import { User, Building, LogOut, Plus, Edit3, Trash2, Eye, EyeOff, CheckCircle2, Mail, Key } from 'lucide-react';
import { Sender } from '../types';

interface ProfileProps {
  user: any;
  sender: Sender | null;
  onSaveSender: (sender: Sender) => void;
  onDeleteSender: (id: string) => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, sender, onSaveSender, onDeleteSender, onLogout }) => {
  const [isEditing, setIsEditing] = useState(!sender);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<Partial<Sender>>(sender || {
    name: '',
    ruc: '',
    sunatUser: '',
    sunatPass: ''
  });

  const handleSave = () => {
    if (!form.name || !form.ruc || form.ruc.length !== 11) return;
    
    const senderData: Sender = {
      id: sender?.id || Date.now().toString(),
      name: form.name!,
      ruc: form.ruc!,
      sunatUser: form.sunatUser || '',
      sunatPass: form.sunatPass || ''
    };
    
    onSaveSender(senderData);
    setIsEditing(false);
  };

  const getUserInitials = () => {
    const name = user?.user_metadata?.name || user?.email || '';
    if (name.includes('@')) return name.substring(0, 2).toUpperCase();
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center text-white font-black text-lg">
            {getUserInitials()}
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              {user?.user_metadata?.name || 'Usuario'}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
              <Mail size={12} />
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Empresa / Sender */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Building className="text-blue-600" size={20} />
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Mi Empresa</h4>
          </div>
          {sender && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-blue-600 p-2"
            >
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
            <span className="text-[10px] font-black uppercase tracking-widest">Agregar Empresa</span>
          </button>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Razón Social
              </label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
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
                value={form.ruc || ''}
                onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                placeholder="20123456789"
                maxLength={11}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.ruc && form.ruc.length !== 11 && (
                <p className="text-[9px] text-red-500 mt-1">El RUC debe tener 11 dígitos</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Key size={12} />
                Credenciales SUNAT (SOL)
              </p>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.sunatUser || ''}
                  onChange={(e) => setForm({ ...form, sunatUser: e.target.value.toUpperCase() })}
                  placeholder="Usuario SOL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.sunatPass || ''}
                    onChange={(e) => setForm({ ...form, sunatPass: e.target.value })}
                    placeholder="Clave SOL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    setForm(sender);
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
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Razón Social</p>
              <p className="text-sm font-black text-slate-800">{sender.name}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">RUC</p>
              <p className="text-sm font-black text-slate-800">{sender.ruc}</p>
            </div>
            {sender.sunatUser && (
              <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500" size={18} />
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Credenciales SUNAT configuradas</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
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
