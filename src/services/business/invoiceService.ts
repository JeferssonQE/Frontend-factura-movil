// services/business/invoiceService.ts
import { apiClient } from '../core/apiClient';
import {
  CreditNoteReason,
  Invoice,
  InvoiceStatus,
  InvoiceType,
  UnitOfMeasure,
} from '../../types';

export type InvoiceItemPayload = {
  product_id?: number | null;
  description: string;
  quantity: number;
  unit: UnitOfMeasure;
  unit_price: number;
  has_igv: boolean;
};

export type CreateInvoicePayload = {
  client_id?: number;
  client_name?: string;
  client_document?: string;
  invoice_type: InvoiceType;
  invoice_date: string;
  items: InvoiceItemPayload[];
};

export type EmitInvoiceResponse = {
  message: string;
  invoice_id: number;
  status: InvoiceStatus;
};

export type InvoiceStatusResponse = {
  invoice_id: number;
  status: InvoiceStatus;
  task_id: string | null;
  sunat_message: string | null;
  pdf_available: boolean;
  numero_comprobante_sunat: string | null;
  series: string;
  number: string;
  total: string;
};

export type InvoiceNumeroComprobanteResponse = {
  invoice_id: number;
  numero_comprobante_sunat: string | null;
  series: string;
  number: string;
  status: InvoiceStatus;
  can_emit_credit_note: boolean;
};

export type CreateCreditNotePayload = {
  date: string;
  reason: CreditNoteReason;
  sustento: string;
};

export const invoiceService = {
  async getInvoices(status?: InvoiceStatus): Promise<Invoice[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<Invoice[]>(`/invoices${query}`);
  },

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return apiClient.get<Invoice>(`/invoices/${invoiceId}`);
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
    return apiClient.post<Invoice>('/invoices', payload);
  },

  async emitInvoice(invoiceId: number): Promise<EmitInvoiceResponse> {
    return apiClient.put<EmitInvoiceResponse>(`/invoices/${invoiceId}/emit`);
  },

  async getInvoiceStatus(invoiceId: number): Promise<InvoiceStatusResponse> {
    return apiClient.get<InvoiceStatusResponse>(`/invoices/${invoiceId}/status`);
  },

  async getInvoicePdf(invoiceId: number): Promise<Blob> {
    return apiClient.get<Blob>(`/invoices/${invoiceId}/pdf`);
  },

  async getNumeroComprobante(invoiceId: number): Promise<InvoiceNumeroComprobanteResponse> {
    return apiClient.get<InvoiceNumeroComprobanteResponse>(
      `/invoices/${invoiceId}/numero-comprobante`
    );
  },

  async createCreditNote(
    invoiceId: number,
    payload: CreateCreditNotePayload
  ): Promise<Invoice> {
    return apiClient.post<Invoice>(`/invoices/${invoiceId}/credit-note`, payload);
  },
};