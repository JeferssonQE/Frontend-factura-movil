// services/business/inventoryService.ts
import { apiClient } from '../core/apiClient';
import { InventoryProduct } from '../../types';

export type InventoryProductPayload = {
  nombre: string;
  categoria?: string | null;
  unidad_medida: string;
  precio_venta: number;
  precio_compra_ref?: number | null;
  foto_url?: string | null;
  cantidad_inicial: number;
  precio_compra?: number | null;
  fecha_vencimiento?: string | null;
};

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

export const inventoryService = {
  async getInventory(senderId?: number): Promise<InventoryProduct[]> {
    return apiClient.get<InventoryProduct[]>(`/inventory${qs(senderId)}`);
  },

  async createProduct(payload: InventoryProductPayload, senderId?: number): Promise<InventoryProduct> {
    return apiClient.post<InventoryProduct>(`/inventory${qs(senderId)}`, payload);
  },
};
