// services/business/productsService.ts
import { apiClient } from '../core/apiClient';
import { Product, UnitOfMeasure } from '../../types';

export type ProductPayload = {
  description: string;
  unit: UnitOfMeasure;
  base_price: number;
  has_igv: boolean;
};

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

const normalizeProduct = (product: Product): Product => ({
  ...product,
  base_price: Number(product.base_price) || 0,
});

export const productsService = {
  async getProducts(senderId?: number): Promise<Product[]> {
    const products = await apiClient.get<Product[]>(`/products${qs(senderId)}`);
    return products.map(normalizeProduct);
  },

  async createProduct(payload: ProductPayload, senderId?: number): Promise<Product> {
    return normalizeProduct(await apiClient.post<Product>(`/products${qs(senderId)}`, payload));
  },

  async updateProduct(productId: number, payload: ProductPayload, senderId?: number): Promise<Product> {
    return normalizeProduct(await apiClient.put<Product>(`/products/${productId}${qs(senderId)}`, payload));
  },

  async deleteProduct(productId: number, senderId?: number): Promise<void> {
    await apiClient.delete<void>(`/products/${productId}${qs(senderId)}`);
  },
};