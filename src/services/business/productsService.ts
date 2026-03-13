// services/business/productsService.ts
import { apiClient } from '../core/apiClient';
import { Product, UnitOfMeasure } from '../../types';

export type ProductPayload = {
  description: string;
  unit: UnitOfMeasure;
  base_price: number;
  has_igv: boolean;
};

export const productsService = {
  async getProducts(): Promise<Product[]> {
    return apiClient.get<Product[]>('/products');
  },

  async createProduct(payload: ProductPayload): Promise<Product> {
    return apiClient.post<Product>('/products', payload);
  },

  async updateProduct(productId: number, payload: ProductPayload): Promise<Product> {
    return apiClient.put<Product>(`/products/${productId}`, payload);
  },

  async deleteProduct(productId: number): Promise<void> {
    await apiClient.delete<void>(`/products/${productId}`);
  },
};