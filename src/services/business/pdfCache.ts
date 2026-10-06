// services/business/pdfCache.ts
import { PDFService } from '../integrations/pdfService';
import { invoiceService } from './invoiceService';

const cache = new Map<number, string>();
const inFlight = new Map<number, Promise<string | null>>();

export const pdfCache = {
  has(invoiceId: number): boolean {
    return cache.has(invoiceId);
  },

  get(invoiceId: number): string | null {
    return cache.get(invoiceId) ?? null;
  },

  async load(invoiceId: number, senderId?: number): Promise<string | null> {
    const cached = cache.get(invoiceId);
    if (cached !== undefined) return cached;

    const pending = inFlight.get(invoiceId);
    if (pending) return pending;

    // El PDF ya no viaja dentro de la factura: se baja del endpoint, que a su vez lo trae
    // del link que guardo Factu API. Se convierte a base64 porque PDFService -compartir,
    // descargar, ver- trabaja con base64.
    const request = invoiceService
      .getInvoicePdf(invoiceId)
      .then(async (blob) => {
        const base64 = await PDFService.blobToBase64(blob);
        if (base64) cache.set(invoiceId, base64);
        return base64;
      })
      .catch(() => null)
      .finally(() => inFlight.delete(invoiceId));

    inFlight.set(invoiceId, request);
    return request;
  },

  clear(): void {
    cache.clear();
    inFlight.clear();
  },
};
