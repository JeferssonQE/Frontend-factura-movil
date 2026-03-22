import { apiClient } from '../core/apiClient';
import { Sender, AdminUserRow } from '../../types';

export type ContadorAssignment = {
  contador_user_id: string;
  sender_id: number;
};

export const contadorService = {
  async getMyAssignedSenders(): Promise<Sender[]> {
    return apiClient.get<Sender[]>('/contadores/me/senders');
  },

  async getContadores(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/contadores');
  },

  async getAllSenders(): Promise<Sender[]> {
    return apiClient.get<Sender[]>('/admin/users/senders');
  },

  async getAllAssignments(): Promise<ContadorAssignment[]> {
    return apiClient.get<ContadorAssignment[]>('/admin/users/contadores/assignments');
  },

  async assignSender(contadorUserId: string, senderId: number): Promise<void> {
    await apiClient.post<void>(`/contadores/${contadorUserId}/senders/${senderId}`);
  },

  async removeSender(contadorUserId: string, senderId: number): Promise<void> {
    await apiClient.delete<void>(`/contadores/${contadorUserId}/senders/${senderId}`);
  },

  async updateSender(senderId: number, data: { name?: string; ruc?: string; sunat_user?: string; sunat_pass?: string }): Promise<void> {
    await apiClient.patch<void>(`/contadores/me/senders/${senderId}`, data);
  },
};
