// src/pages/BillingPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Billing from '../views/Billing';
import { useAppData } from '../context/AppDataContext';

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSender, products, clients, invoices, persistInvoice, saveClient } = useAppData();

  return (
    <Billing
      sender={activeSender}
      products={products}
      clients={clients}
      invoices={invoices}
      onEmit={async (invoice) => {
        await persistInvoice(invoice);
      }}
      onAddClient={async (client) => {
        await saveClient(client);
      }}
      onSelectSender={() => navigate('/profile')}
    />
  );
};

export default BillingPage;
