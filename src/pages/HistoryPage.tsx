// src/pages/HistoryPage.tsx
import React from 'react';
import History from '../views/History';
import { useAppData } from '../context/AppDataContext';

const HistoryPage: React.FC = () => {
  const { invoices, emitCreditNote } = useAppData();

  return (
    <History
      invoices={invoices}
      onEmitCreditNote={emitCreditNote}
    />
  );
};

export default HistoryPage;
