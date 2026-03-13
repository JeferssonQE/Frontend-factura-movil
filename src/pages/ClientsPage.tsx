// src/pages/ClientsPage.tsx
import React from 'react';
import Clients from '../views/Clients';
import { useAppData } from '../context/AppDataContext';

const ClientsPage: React.FC = () => {
  const { clients, activeSenderId, saveClient, deleteClient } = useAppData();

  return (
    <Clients
      clients={clients}
      senderId={activeSenderId}
      onSave={saveClient}
      onDelete={deleteClient}
    />
  );
};

export default ClientsPage;
