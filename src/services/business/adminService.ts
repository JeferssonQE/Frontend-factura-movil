// services/business/adminService.ts

import type { AdminUserRow, BillingEnvironment, Sender, UserPlan, UserRole } from '../../types';
import { apiClient } from '../core/apiClient';

export type UpdateCompanyPayload = {
  name: string;
  email: string;
  razon_social: string;
  ruc: string;
};

export type UpdateCompanyResult = {
  sender: Sender;
  user: AdminUserRow;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
  razon_social: string;
  ruc: string;
};

export type CreateContadorPayload = {
  email: string;
  password: string;
  name: string;
};

export type UpdateContadorPayload = {
  name: string;
  email: string;
};

export type UserStatusResponse = {
  message: string;
  user: AdminUserRow;
};

export const adminService = {
  async listUsers(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/admin/users');
  },

  async listSenders(): Promise<Sender[]> {
    return apiClient.get<Sender[]>('/admin/users/senders');
  },

  /**
   * Cambia donde emite una empresa. El backend le pregunta al proveedor antes de dejar
   * pasar a produccion, asi que un 409 aqui significa que el RUC todavia no esta
   * habilitado: el mensaje dice que falta.
   */
  async setBillingEnvironment(
    senderId: number,
    billingEnvironment: BillingEnvironment,
  ): Promise<Sender> {
    return apiClient.put<Sender>(`/admin/users/senders/${senderId}/billing-environment`, {
      billing_environment: billingEnvironment,
    });
  },

  async updateCompany(userId: string, payload: UpdateCompanyPayload): Promise<UpdateCompanyResult> {
    return apiClient.put<UpdateCompanyResult>(`/admin/users/${userId}/company`, payload);
  },

  async createUser(payload: CreateUserPayload): Promise<AdminUserRow> {
    return apiClient.post<AdminUserRow>('/admin/users', payload);
  },

  async createContador(payload: CreateContadorPayload): Promise<AdminUserRow> {
    return apiClient.post<AdminUserRow>('/admin/users/contador', payload);
  },

  async updateContador(userId: string, payload: UpdateContadorPayload): Promise<AdminUserRow> {
    return apiClient.put<AdminUserRow>(`/admin/users/${userId}/contador`, payload);
  },

  async activateUser(userId: string): Promise<UserStatusResponse> {
    return apiClient.put<UserStatusResponse>(`/admin/users/${userId}/activate`);
  },

  async deactivateUser(userId: string): Promise<UserStatusResponse> {
    return apiClient.put<UserStatusResponse>(`/admin/users/${userId}/deactivate`);
  },

  async changeUserPlan(userId: string, plan: UserPlan | string): Promise<UserStatusResponse> {
    return apiClient.patch<UserStatusResponse>(`/admin/users/${userId}/plan`, { plan });
  },

  async changeUserRole(userId: string, role: UserRole): Promise<UserStatusResponse> {
    return apiClient.patch<UserStatusResponse>(`/admin/users/${userId}/role`, { role });
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/admin/users/${userId}`);
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  },
};
