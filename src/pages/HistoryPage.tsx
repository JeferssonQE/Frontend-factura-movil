// src/pages/HistoryPage.tsx
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useAppData } from '../context/AppDataContext';
import { invoiceService } from '../services/business/invoiceService';
import { pdfCache } from '../services/business/pdfCache';
import { InvoiceStatus } from '../types';
import History from '../views/History';

const POLL_INTERVAL_MS = 4_000; // 4 segundos
const PREFETCH_PDF_COUNT = 5;

// Una emisión tarda ~40s; cinco minutos es holgado. Pasado ese punto el backend ya cerró la
// factura o nunca lo hará, y seguir sondeando solo castiga al servidor: la pantalla queda a la
// espera del refresco manual.
const MAX_POLL_ATTEMPTS = 75;

const HistoryPage: React.FC = () => {
  const {
    invoices,
    emitCreditNote,
    emitDraft,
    deleteInvoice,
    refreshAllData,
    patchInvoice,
    activeSenderId,
  } = useAppData();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const procesandoIds = invoices
    .filter((inv) => inv.status === InvoiceStatus.PROCESANDO)
    .map((inv) => inv.id);

  useEffect(() => {
    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    if (procesandoIds.length === 0) {
      stopPolling();
      return;
    }

    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        stopPolling();
        await refreshAllData();
        return;
      }

      let statusChanged = false;
      await Promise.allSettled(
        procesandoIds.map(async (id) => {
          try {
            const s = await invoiceService.getInvoiceStatus(id, activeSenderId ?? undefined);
            // Mientras siga PROCESANDO no hay nada que anotar: el proveedor no reporta
            // avance, solo el veredicto. Se sigue sondeando hasta que cambie de estado.
            if (s.status !== InvoiceStatus.PROCESANDO) {
              statusChanged = true;
            }
          } catch {
            /* ignorar errores individuales */
          }
        }),
      );
      if (statusChanged) await refreshAllData();
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return stopPolling;
  }, [procesandoIds.join(','), refreshAllData, patchInvoice, activeSenderId]); // eslint-disable-line

  useEffect(() => {
    const recientes = invoices
      .filter((inv) => inv.status === InvoiceStatus.EMITIDO)
      .slice(0, PREFETCH_PDF_COUNT)
      .filter((inv) => !pdfCache.has(inv.id));
    if (recientes.length === 0) return;
    Promise.allSettled(recientes.map((inv) => pdfCache.load(inv.id, activeSenderId ?? undefined)));
  }, [invoices, activeSenderId]);

  return (
    <History
      invoices={invoices}
      activeSenderId={activeSenderId}
      onEmitCreditNote={emitCreditNote}
      onEmitDraft={emitDraft}
      onDeleteInvoice={deleteInvoice}
      onRefresh={refreshAllData}
    />
  );
};

export default HistoryPage;
