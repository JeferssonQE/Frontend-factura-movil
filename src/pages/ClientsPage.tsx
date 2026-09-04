// src/pages/ClientsPage.tsx
import type React from 'react';
import { useAppData } from '../context/AppDataContext';
import Clients from '../views/Clients';

const ClientsPage: React.FC = () => {
  const { clients, activeSenderId, saveClient, deleteClient, refreshAllData } = useAppData();

  return (
    <Clients
      clients={clients}
      senderId={activeSenderId}
      onSave={saveClient}
      onDelete={deleteClient}
      onRefresh={refreshAllData}
    />
  );
};

export default ClientsPage;
