// views/Clients.tsx

import { AlertCircle, Pencil, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import ClientFormModal from '../components/ClientFormModal';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDeleteDialog from '../components/ui/ConfirmDeleteDialog';
import Input from '../components/ui/Input';
import type { Client } from '../types';

interface ClientsProps {
  clients: Client[];
  senderId: number | null;
  onSave: (client: Client) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const documentLabel = (client: Client): string => {
  if (client.dni) return `DNI: ${client.dni}`;
  if (client.ruc) return `RUC: ${client.ruc}`;
  return 'Sin documento';
};

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

  const openCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (confirmDeleteId === null) return;
    onDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {!senderId && (
        <div className="flex items-center gap-3 rounded-card border border-warning/30 bg-warning/10 p-4">
          <AlertCircle className="shrink-0 text-warning" size={18} />
          <p className="text-sm font-medium text-warning">
            Para agregar clientes, primero configura tu empresa en la sección Perfil.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar por nombre o documento"
            aria-label="Buscar cliente por nombre o documento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search size={18} />}
          />
        </div>

        <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Actualizar lista">
          <RefreshCw size={18} />
        </Button>

        <Button size="icon" onClick={openCreateModal} aria-label="Agregar cliente">
          <UserPlus size={20} />
        </Button>
      </div>

      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <Card dashed className="py-12 text-center">
            <Users size={48} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">
              {search ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no tienes clientes.'}
            </p>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <h4 className="truncate pr-2 text-sm font-semibold text-slate-900">
                  {client.name}
                </h4>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">{documentLabel(client)}</span>
                  {client.phone && <Badge>{client.phone}</Badge>}
                </div>
              </div>

              <div className="ml-4 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditModal(client)}
                  aria-label={`Editar a ${client.name}`}
                >
                  <Pencil size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDeleteId(client.id)}
                  aria-label={`Eliminar a ${client.name}`}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDeleteDialog
          title="Eliminar cliente"
          message="¿Seguro que deseas eliminar a este cliente? Se borrará de tu agenda permanentemente."
          confirmLabel="Sí, eliminar cliente"
          cancelLabel="No, cancelar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
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
