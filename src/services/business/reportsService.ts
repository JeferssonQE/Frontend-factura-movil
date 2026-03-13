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

export const reportsService = {
  async getSalesByMonth(year?: number): Promise<SalesByMonthItem[]> {
    const query = year ? `?year=${encodeURIComponent(year)}` : '';
    return apiClient.get<SalesByMonthItem[]>(`/reports/sales-by-month${query}`);
  },

  async getTopProducts(limit = 10): Promise<TopProductItem[]> {
    return apiClient.get<TopProductItem[]>(
      `/reports/top-products?limit=${encodeURIComponent(limit)}`
    );
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>('/reports/dashboard-summary');
  },
};