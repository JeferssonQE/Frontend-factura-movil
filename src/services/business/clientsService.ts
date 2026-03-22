// services/business/clientsService.ts
import { apiClient } from '../core/apiClient';
import { Client } from '../../types';

export type ClientPayload = {
  name: string;
  dni?: string;
  ruc?: string;
  phone?: string;
};

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

export const clientsService = {
  async getClients(senderId?: number): Promise<Client[]> {
    return apiClient.get<Client[]>(`/clients${qs(senderId)}`);
  },

  async createClient(payload: ClientPayload, senderId?: number): Promise<Client> {
    return apiClient.post<Client>(`/clients${qs(senderId)}`, payload);
  },

  async updateClient(clientId: number, payload: ClientPayload, senderId?: number): Promise<Client> {
    return apiClient.put<Client>(`/clients/${clientId}${qs(senderId)}`, payload);
  },

  async deleteClient(clientId: number, senderId?: number): Promise<void> {
    await apiClient.delete<void>(`/clients/${clientId}${qs(senderId)}`);
  },
};