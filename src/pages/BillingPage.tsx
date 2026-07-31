// src/pages/BillingPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Billing from '../views/Billing';
import { useAppData } from '../context/AppDataContext';

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSender, isContador, products, clients, invoices, persistInvoice, saveDraft, saveClient, saveProductSilent, showToast, refreshAllData, saveSender } = useAppData();

  return (
    <Billing
      sender={activeSender}
      empresaUserId={isContador ? activeSender?.user_id : undefined}
      products={products}
      clients={clients}
      invoices={invoices}
      onEmit={async (invoice) => {
        return await persistInvoice(invoice);
      }}
      onSaveDraft={async (invoice) => {
        return await saveDraft(invoice);
      }}
      onAddClient={async (client) => {
        await saveClient(client);
      }}
      onSelectSender={() => navigate('/profile')}
      onKeepEmitting={() => showToast('COMPROBANTE EN COLA · MÍRALO EN HISTORIAL')}
      onRefresh={refreshAllData}
      onSaveProduct={async (data) => {
        if (!activeSender) return;
        await saveProductSilent({
          id: 0,
          sender_id: activeSender.id,
          description: data.description,
          unit: data.unit,
          base_price: data.base_price,
          has_igv: data.has_igv,
        });
      }}
      onSaveCredentials={async (sunatUser, sunatPass) => {
        if (!activeSender) return;
        await saveSender({
          name: activeSender.name,
          ruc: activeSender.ruc,
          sunat_user: sunatUser,
          sunat_pass: sunatPass,
        });
      }}
    />
  );
};

export default BillingPage;
