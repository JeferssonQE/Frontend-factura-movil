
import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle, Building2, Pencil, AlertTriangle, X } from 'lucide-react';
import { Sender } from '../types';

interface SendersProps {
  senders: Sender[];
  activeSenderId: string | null;
  onSave: (sender: Sender) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
}

const Senders: React.FC<SendersProps> = ({ senders, activeSenderId, onSave, onDelete, onActivate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<Partial<Sender> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const sender: Sender = {
      id: (editingSender?.id as string) || Date.now().toString(),
      name: formData.get('name') as string,
      ruc: formData.get('ruc') as string,
      sunatUser: formData.get('sunatUser') as string,
      sunatPass: formData.get('sunatPass') as string,
    };
    
    onSave(sender);
    setIsModalOpen(false);
    setEditingSender(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestiona tus empresas emisoras</p>
        <button 
          onClick={() => {
            setEditingSender(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="space-y-4">
        {senders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
            <Building2 size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sin empresas configuradas</p>
          </div>
        ) : (
          senders.map((s) => (
            <div 
              key={s.id} 
              className={`bg-white p-6 rounded-[36px] shadow-sm border transition-all ${
                activeSenderId === s.id ? 'border-blue-500 ring-[6px] ring-blue-50 shadow-md' : 'border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div onClick={() => onActivate(s.id)} className="flex-1 cursor-pointer min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-slate-800 text-[14px] uppercase tracking-tight truncate">{s.name}</h3>
                    {activeSenderId === s.id && (
                      <CheckCircle size={16} className="text-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">RUC: {s.ruc}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  <button 
                    onClick={() => { setEditingSender(s); setIsModalOpen(true); }}
                    className="p-2.5 text-slate-300 hover:text-blue-600 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="p-2.5 text-slate-300 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex gap-6 text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> USUARIO: {s.sunatUser}</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> CLAVE SOL ACTIVA</div>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">ELIMINAR EMPRESA</h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8 leading-relaxed">¿Seguro que deseas eliminar esta empresa? Perderás la conexión con SUNAT configurada.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">Confirmar Eliminación</button>
              <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-white border border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Building2 size={24} /></div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingSender ? 'Editar' : 'Nueva'} Empresa</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Razón Social</label>
                <input name="name" defaultValue={editingSender?.name} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 uppercase focus:ring-2 focus:ring-blue-500" placeholder="EJ. MI NEGOCIO SAC" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">RUC (11 DÍGITOS)</label>
                <input name="ruc" defaultValue={editingSender?.ruc} required maxLength={11} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800" placeholder="20XXXXXXXXX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Usuario SOL</label><input name="sunatUser" defaultValue={editingSender?.sunatUser} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 uppercase" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Clave SOL</label><input name="sunatPass" type="password" defaultValue={editingSender?.sunatPass} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800" /></div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">Guardar Configuración</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Senders;
