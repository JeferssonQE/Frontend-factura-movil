// src/pages/HistoryPage.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import History from '../views/History';
import { useAppData } from '../context/AppDataContext';
import { invoiceService } from '../services/business/invoiceService';
import { pdfCache } from '../services/business/pdfCache';
import { InvoiceStatus } from '../types';

const POLL_INTERVAL_MS = 4_000; // 4 segundos
const PREFETCH_PDF_COUNT = 5;

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, emitCreditNote, emitDraft, deleteInvoice, refreshAllData, patchInvoice, activeSenderId, activeSender } = useAppData();
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
      let statusChanged = false;
      await Promise.allSettled(
        procesandoIds.map(async (id) => {
          try {
            const s = await invoiceService.getInvoiceStatus(id, activeSenderId ?? undefined);
            if (s.status === InvoiceStatus.PROCESANDO) {
              patchInvoice(id, { sunat_current_step: s.current_step });
            } else {
              statusChanged = true;
            }
          } catch { /* ignorar errores individuales */ }
        })
      );
      if (statusChanged) await refreshAllData();
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [procesandoIds.join(','), refreshAllData, patchInvoice, activeSenderId]); // eslint-disable-line

  useEffect(() => {
    const recientes = invoices
      .filter((inv) => inv.status === InvoiceStatus.EMITIDO)
      .slice(0, PREFETCH_PDF_COUNT)
      .filter((inv) => !pdfCache.has(inv.id));
    if (recientes.length === 0) return;
    Promise.allSettled(
      recientes.map((inv) => pdfCache.load(inv.id, activeSenderId ?? undefined))
    );
  }, [invoices, activeSenderId]);

  return <History invoices={invoices} activeSenderId={activeSenderId} credentialsInvalid={activeSender?.sunat_credentials_invalid} onEmitCreditNote={emitCreditNote} onEmitDraft={emitDraft} onDeleteInvoice={deleteInvoice} onFixCredentials={() => navigate('/profile')} onRefresh={refreshAllData} />;
};

export default HistoryPage;
