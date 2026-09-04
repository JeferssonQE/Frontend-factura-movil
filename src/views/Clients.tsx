// views/Clients.tsx

import {
  AlertCircle,
  AlertTriangle,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import ClientFormModal from '../components/ClientFormModal';
import type { Client } from '../types';

interface ClientsProps {
  clients: Client[];
  senderId: number | null;
  onSave: (client: Client) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, senderId, onSave, onDelete, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredClients = clients.filter(
    (client) =>
      client.sender_id === senderId &&
      (client.name.toLowerCase().includes(search.toLowerCase()) ||
        (client.dni || '').includes(search) ||
        (client.ruc || '').includes(search)),
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId === null) return;
    onDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {!senderId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={18} />
          <p className="text-amber-700 text-[11px] font-black uppercase tracking-wide">
            Para agregar clientes, primero configura tu empresa en la sección Perfil.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o doc..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white border-none rounded-2xl py-3 pl-11 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 font-medium uppercase outline-none"
          />
        </div>

        <button
          onClick={onRefresh}
          className="bg-white border border-slate-200 text-slate-400 p-3 rounded-2xl shadow-sm active:scale-95 transition-all hover:text-slate-600"
          aria-label="Actualizar lista"
        >
          <RefreshCw size={18} />
        </button>

        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <Users size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              No hay clientes registrados
            </p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:border-blue-100"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-[13px] uppercase truncate pr-2 tracking-tight">
                  {client.name}
                </h4>

                <div className="flex gap-2 items-center mt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {client.dni
                      ? `DNI: ${client.dni}`
                      : client.ruc
                        ? `RUC: ${client.ruc}`
                        : 'SIN DOCUMENTO'}
                  </span>

                  {client.phone && (
                    <span className="text-[9px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase">
                      {client.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 ml-4">
                <button
                  onClick={() => {
                    setEditingClient(client);
                    setIsModalOpen(true);
                  }}
                  className="p-2.5 text-slate-300 hover:text-blue-600 transition-all"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => setConfirmDeleteId(client.id)}
                  className="p-2.5 text-slate-300 hover:text-red-600 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">
              ELIMINAR CLIENTE
            </h3>

            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
              ¿Seguro que deseas eliminar a este cliente? Se borrará de tu agenda permanentemente.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Sí, Eliminar Cliente
              </button>

              <button
                onClick={() => setConfirmDeleteId(null)}
                className="w-full bg-white border border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                No, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ClientFormModal
          editingClient={editingClient}
          senderId={senderId}
          onSave={onSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default Clients;
