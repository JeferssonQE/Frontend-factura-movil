import { apiClient } from '../core/apiClient';
import { Sender, AdminUserRow, SunatCredentialsValidation } from '../../types';

export type ContadorAssignment = {
  contador_user_id: string;
  empresa_user_id: string;
  empresa_nombre?: string | null;
  empresa_email?: string | null;
};

export type SenderFormData = {
  name: string;
  ruc: string;
  sunat_user: string;
  sunat_pass: string;
};

export const contadorService = {
  async getMyAssignedEmpresas(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/contadores/me/empresas');
  },

  async getEmpresaSender(empresaUserId: string): Promise<Sender | null> {
    return apiClient.get<Sender | null>(`/contadores/me/empresas/${empresaUserId}/sender`);
  },

  async updateEmpresaSender(empresaUserId: string, data: Partial<SenderFormData>): Promise<Sender> {
    return apiClient.post<Sender>(`/contadores/me/empresas/${empresaUserId}/sender`, data);
  },

  async updateSender(empresaUserId: string, data: Partial<SenderFormData>): Promise<Sender> {
    return apiClient.post<Sender>(`/contadores/me/empresas/${empresaUserId}/sender`, data);
  },

  async startSunatCredentialsValidation(empresaUserId: string): Promise<{ task_id: string }> {
    return apiClient.post<{ task_id: string }>(
      `/contadores/me/empresas/${empresaUserId}/sunat-credentials/validate`,
      {}
    );
  },

  async getSunatCredentialsValidation(empresaUserId: string, taskId: string): Promise<SunatCredentialsValidation> {
    return apiClient.get<SunatCredentialsValidation>(
      `/contadores/me/empresas/${empresaUserId}/sunat-credentials/validation/${taskId}`
    );
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
};
