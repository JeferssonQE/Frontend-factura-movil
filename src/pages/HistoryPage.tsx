// src/pages/HistoryPage.tsx
import React, { useEffect, useRef } from 'react';
import History from '../views/History';
import { useAppData } from '../context/AppDataContext';
import { invoiceService } from '../services/business/invoiceService';
import { InvoiceStatus } from '../types';

const POLL_INTERVAL_MS = 10_000; // 10 segundos

const HistoryPage: React.FC = () => {
  const { invoices, emitCreditNote, refreshAllData } = useAppData();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const procesandoIds = invoices
    .filter((inv) => inv.status === InvoiceStatus.PROCESANDO)
    .map((inv) => inv.id);

  useEffect(() => {
    if (procesandoIds.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      let changed = false;
      await Promise.allSettled(
        procesandoIds.map(async (id) => {
          try {
            const s = await invoiceService.getInvoiceStatus(id);
            if (s.status !== InvoiceStatus.PROCESANDO) changed = true;
          } catch { /* ignorar errores individuales */ }
        })
      );
      if (changed) await refreshAllData();
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [procesandoIds.join(','), refreshAllData]); // eslint-disable-line

  return <History invoices={invoices} onEmitCreditNote={emitCreditNote} />;
};

export default HistoryPage;
