import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Users, UserPlus, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { Client } from '../types';

interface ClientsProps {
  clients: Client[];
  senderId: string | null;
  onSave: (client: Client) => void;
  onDelete: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, senderId, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredClients = clients.filter(c => 
    c.senderId === senderId && 
    (c.name.toLowerCase().includes(search.toLowerCase()) || (c.dni || '').includes(search) || (c.ruc || '').includes(search))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!senderId) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const name = (formData.get('name') as string).trim();
    const dni = (formData.get('dni') as string).trim();
    const ruc = (formData.get('ruc') as string).trim();
    const phone = (formData.get('phone') as string).trim();

    if (dni && dni.length !== 8) {
      setFormError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }

    if (ruc && ruc.length !== 11) {
      setFormError("El RUC debe tener exactamente 11 dígitos.");
      return;
    }

    if (!dni && !ruc) {
      setFormError("Debe ingresar al menos un DNI o un RUC.");
      return;
    }

    const client: Client = {
      id: editingClient?.id || Date.now().toString(),
      senderId,
      name: name.toUpperCase(),
      dni: dni || undefined,
      ruc: ruc || undefined,
      phone: phone || undefined
    };
    
    onSave(client);
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o doc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-3 pl-11 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 font-medium uppercase outline-none"
          />
        </div>
        <button 
          onClick={() => {
            setEditingClient(null);
            setFormError(null);
            setIsModalOpen(true);
          }}
          disabled={!senderId}
          className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <Users size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay clientes registrados</p>
          </div>
        ) : (
          filteredClients.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:border-blue-100">
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-[13px] uppercase truncate pr-2 tracking-tight">{c.name}</h4>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {c.dni ? `DNI: ${c.dni}` : c.ruc ? `RUC: ${c.ruc}` : 'SIN DOCUMENTO'}
                  </span>
                  {c.phone && <span className="text-[9px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase">{c.phone}</span>}
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => { setFormError(null); setEditingClient(c); setIsModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-blue-600 transition-all"><Pencil size={18} /></button>
                <button onClick={() => setConfirmDeleteId(c.id)} className="p-2.5 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">ELIMINAR CLIENTE</h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8 leading-relaxed">¿Seguro que deseas eliminar a este cliente? Se borrará de tu agenda permanentemente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">Sí, Eliminar Cliente</button>
              <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-white border border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">No, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserPlus size={24} /></div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingClient ? 'Editar' : 'Nuevo'} Cliente</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300"><X size={20} /></button>
            </div>
            
            {formError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-red-700 text-xs font-black uppercase">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Razón Social o Nombre</label>
                <input name="name" defaultValue={editingClient?.name} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">DNI (8 dígitos)</label>
                  <input name="dni" type="number" maxLength={8} defaultValue={editingClient?.dni} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 outline-none" placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">RUC (11 dígitos)</label>
                  <input name="ruc" type="number" maxLength={11} defaultValue={editingClient?.ruc} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 outline-none" placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Celular / Teléfono</label>
                <input name="phone" defaultValue={editingClient?.phone} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 outline-none" placeholder="999888777" />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-90 transition-all">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;