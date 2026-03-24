import { apiClient } from '../core/apiClient';
import { Sender, AdminUserRow } from '../../types';

export type ContadorAssignment = {
  contador_user_id: string;
  empresa_user_id: string;
  empresa_nombre?: string | null;
  empresa_email?: string | null;
};

export const contadorService = {
  async getMyAssignedEmpresas(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/contadores/me/empresas');
  },

  async getSendersForEmpresa(empresaUserId: string): Promise<Sender[]> {
    return apiClient.get<Sender[]>(`/contadores/me/empresas/${empresaUserId}/senders`);
  },

  async getContadores(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/contadores');
  },

  async getAllAssignments(): Promise<ContadorAssignment[]> {
    return apiClient.get<ContadorAssignment[]>('/admin/users/contadores/assignments');
  },

  async assignEmpresa(contadorUserId: string, empresaUserId: string): Promise<void> {
    await apiClient.post<void>(`/contadores/${contadorUserId}/empresas/${empresaUserId}`);
  },

  async removeEmpresa(contadorUserId: string, empresaUserId: string): Promise<void> {
    await apiClient.delete<void>(`/contadores/${contadorUserId}/empresas/${empresaUserId}`);
  },

  async updateSender(senderId: number, data: { name?: string; ruc?: string; sunat_user?: string; sunat_pass?: string }): Promise<void> {
    await apiClient.patch<void>(`/contadores/me/senders/${senderId}`, data);
  },
};
