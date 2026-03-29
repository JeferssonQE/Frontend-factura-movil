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
  nro_comprobante_sunat: string | null;
  series: string;
  number: string;
  total: string;
};

export type InvoiceNumeroComprobanteResponse = {
  invoice_id: number;
  nro_comprobante_sunat: string | null;
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

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&') : '';
};

export const invoiceService = {
  async getInvoices(status?: InvoiceStatus, senderId?: number): Promise<Invoice[]> {
    return apiClient.get<Invoice[]>(`/invoices${qs({ status, sender_id: senderId })}`);
  },

  async getInvoice(invoiceId: number, senderId?: number): Promise<Invoice> {
    return apiClient.get<Invoice>(`/invoices/${invoiceId}${qs({ sender_id: senderId })}`);
  },

  async createInvoice(payload: CreateInvoicePayload, senderId?: number): Promise<Invoice> {
    return apiClient.post<Invoice>(`/invoices${qs({ sender_id: senderId })}`, payload);
  },

  async emitInvoice(invoiceId: number, senderId?: number): Promise<EmitInvoiceResponse> {
    return apiClient.put<EmitInvoiceResponse>(`/invoices/${invoiceId}/emit${qs({ sender_id: senderId })}`);
  },

  async getInvoiceStatus(invoiceId: number, senderId?: number): Promise<InvoiceStatusResponse> {
    return apiClient.get<InvoiceStatusResponse>(`/invoices/${invoiceId}/status${qs({ sender_id: senderId })}`);
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
    payload: CreateCreditNotePayload,
    senderId?: number,
  ): Promise<Invoice> {
    return apiClient.post<Invoice>(`/invoices/${invoiceId}/credit-note${qs({ sender_id: senderId })}`, payload);
  },

  async deleteInvoice(invoiceId: number, senderId?: number): Promise<void> {
    return apiClient.delete<void>(`/invoices/${invoiceId}${qs({ sender_id: senderId })}`);
  },
};