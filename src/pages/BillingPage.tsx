// src/pages/BillingPage.tsx
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import Billing from '../views/Billing';

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSender,
    products,
    clients,
    invoices,
    persistInvoice,
    saveDraft,
    saveClient,
    saveProductSilent,
    showToast,
    refreshAllData,
  } = useAppData();

  return (
    <Billing
      sender={activeSender}
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
          sale_price: data.sale_price,
          igv_type: data.igv_type,
        });
      }}
    />
  );
};

export default BillingPage;
