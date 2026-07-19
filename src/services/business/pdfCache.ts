// services/business/pdfCache.ts
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

    const request = invoiceService
      .getInvoice(invoiceId, senderId)
      .then((invoice) => {
        const base64 = invoice.pdf_base64 ?? null;
        if (base64) cache.set(invoiceId, base64);
        return base64;
      })
      .finally(() => inFlight.delete(invoiceId));

    inFlight.set(invoiceId, request);
    return request;
  },

  clear(): void {
    cache.clear();
    inFlight.clear();
  },
};
