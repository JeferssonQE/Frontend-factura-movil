// components/ClientFormModal.tsx

import { AlertCircle, Loader2, UserPlus, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import { clientSchema } from '../schemas/business';
import { lookupService } from '../services/business/lookupService';
import type { Client } from '../types';

interface ClientFormModalProps {
  editingClient: Client | null;
  senderId: number | null;
  onSave: (client: Client) => void;
  onClose: () => void;
}

const DNI_LENGTH = 8;
const RUC_LENGTH = 11;

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

type LookingUp = 'dni' | 'ruc' | null;

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  editingClient,
  senderId,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(editingClient?.name ?? '');
  const [dni, setDni] = useState(editingClient?.dni ?? '');
  const [ruc, setRuc] = useState(editingClient?.ruc ?? '');
  const [phone, setPhone] = useState(editingClient?.phone ?? '');
  const [lookingUp, setLookingUp] = useState<LookingUp>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleDniMatch = useCallback(async (value: string) => {
    setLookingUp('dni');
    const result = await lookupService.lookupDni(value);
    setLookingUp(null);
    if (result?.nombre_completo) setName(result.nombre_completo);
  }, []);

  const handleRucMatch = useCallback(async (value: string) => {
    setLookingUp('ruc');
    const result = await lookupService.lookupRuc(value);
    setLookingUp(null);
    if (result?.razon_social) setName(result.razon_social);
  }, []);

  useDebouncedLookup(dni, DNI_LENGTH, handleDniMatch);
  useDebouncedLookup(ruc, RUC_LENGTH, handleRucMatch);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!senderId) {
      setFormError('Primero configura tu empresa en la sección Perfil.');
      return;
    }

    const result = clientSchema.safeParse({
      name: name.trim(),
      dni: dni.trim(),
      ruc: ruc.trim(),
      phone: phone.trim(),
    });

    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }

    onSave({
      id: editingClient?.id || Date.now(),
      sender_id: senderId,
      name: result.data.name,
      dni: result.data.dni || null,
      ruc: result.data.ruc || null,
      phone: result.data.phone || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <UserPlus size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {editingClient ? 'Editar' : 'Nuevo'} Cliente
            </h3>
          </div>

          <button onClick={onClose} className="p-2 text-slate-300">
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700 text-xs font-black uppercase">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Razón Social o Nombre
            </label>
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                DNI (8 dígitos)
              </label>
              <div className="relative">
                <input
                  name="dni"
                  value={dni}
                  inputMode="numeric"
                  maxLength={DNI_LENGTH}
                  onChange={(event) => setDni(onlyDigits(event.target.value))}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-10 text-sm font-black text-slate-800 outline-none"
                  placeholder="Opcional"
                />
                {lookingUp === 'dni' && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                RUC (11 dígitos)
              </label>
              <div className="relative">
                <input
                  name="ruc"
                  value={ruc}
                  inputMode="numeric"
                  maxLength={RUC_LENGTH}
                  onChange={(event) => setRuc(onlyDigits(event.target.value))}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-10 text-sm font-black text-slate-800 outline-none"
                  placeholder="Opcional"
                />
                {lookingUp === 'ruc' && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Celular / Teléfono
            </label>
            <input
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 outline-none"
              placeholder="999888777"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-90 transition-all"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
