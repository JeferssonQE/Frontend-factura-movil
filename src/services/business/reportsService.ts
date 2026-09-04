// services/business/reportsService.ts
import { apiClient } from '../core/apiClient';

export type SalesByMonthItem = {
  month: string;
  total_invoices: number;
  total_sales: number;
  total_igv: number;
};

export type TopProductItem = {
  description: string;
  total_quantity: number;
  total_sales: number;
};

export type DashboardSummary = {
  total_invoices: number;
  total_sales: number;
  total_clients: number;
  total_products: number;
  status_counts: Record<string, number>;
  emitted_invoices: number;
  pending_invoices: number;
  failed_invoices: number;
  annulled_invoices: number;
};

export type IgvSummary = {
  date_from: string;
  date_to: string;
  invoice_count: number;
  total_sin_igv: number;
  total_igv: number;
  total_ventas: number;
};

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

export const reportsService = {
  async getSalesByMonth(year?: number, senderId?: number): Promise<SalesByMonthItem[]> {
    const base = qs(senderId);
    const yearPart = year ? `${base ? '&' : '?'}year=${encodeURIComponent(year)}` : '';
    return apiClient.get<SalesByMonthItem[]>(`/reports/sales-by-month${base}${yearPart}`);
  },

  async getTopProducts(limit = 10, senderId?: number): Promise<TopProductItem[]> {
    const base = qs(senderId);
    return apiClient.get<TopProductItem[]>(
      `/reports/top-products${base}${base ? '&' : '?'}limit=${encodeURIComponent(limit)}`,
    );
  },

  async getDashboardSummary(senderId?: number): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>(`/reports/dashboard-summary${qs(senderId)}`);
  },

  async getIgvSummary(dateFrom: string, dateTo: string, senderId?: number): Promise<IgvSummary> {
    const base = qs(senderId);
    const sep = base ? '&' : '?';
    return apiClient.get<IgvSummary>(
      `/reports/igv-summary${base}${sep}date_from=${dateFrom}&date_to=${dateTo}`,
    );
  },
};
