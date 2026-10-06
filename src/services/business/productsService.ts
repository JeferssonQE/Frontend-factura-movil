// services/business/productsService.ts

import type { IgvType, Product, UnitOfMeasure } from '../../types';
import { apiClient } from '../core/apiClient';

export type ProductPayload = {
  description: string;
  unit: UnitOfMeasure;
  sale_price: number;
  igv_type: IgvType;
};

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

// El backend manda los importes como string para no perder decimales por el camino.
const normalizeProduct = (product: Product): Product => ({
  ...product,
  sale_price: Number(product.sale_price) || 0,
});

export const productsService = {
  async getProducts(senderId?: number): Promise<Product[]> {
    const products = await apiClient.get<Product[]>(`/products${qs(senderId)}`);
    return products.map(normalizeProduct);
  },

  async createProduct(payload: ProductPayload, senderId?: number): Promise<Product> {
    return normalizeProduct(await apiClient.post<Product>(`/products${qs(senderId)}`, payload));
  },

  async updateProduct(
    productId: number,
    payload: ProductPayload,
    senderId?: number,
  ): Promise<Product> {
    return normalizeProduct(
      await apiClient.put<Product>(`/products/${productId}${qs(senderId)}`, payload),
    );
  },

  async deleteProduct(productId: number, senderId?: number): Promise<void> {
    await apiClient.delete<void>(`/products/${productId}${qs(senderId)}`);
  },
};
