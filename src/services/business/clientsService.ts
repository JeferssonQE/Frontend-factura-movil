// services/business/clientsService.ts
import { apiClient } from '../core/apiClient';
import { Client } from '../../types';

export type ClientPayload = {
  name: string;
  dni?: string;
  ruc?: string;
  phone?: string;
};

export const clientsService = {
  async getClients(): Promise<Client[]> {
    return apiClient.get<Client[]>('/clients');
  },

  async createClient(payload: ClientPayload): Promise<Client> {
    return apiClient.post<Client>('/clients', payload);
  },

  async updateClient(clientId: number, payload: ClientPayload): Promise<Client> {
    return apiClient.put<Client>(`/clients/${clientId}`, payload);
  },

  async deleteClient(clientId: number): Promise<void> {
    await apiClient.delete<void>(`/clients/${clientId}`);
  },
};