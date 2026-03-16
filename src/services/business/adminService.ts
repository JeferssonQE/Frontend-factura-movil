// services/business/adminService.ts
import { apiClient } from '../core/apiClient';
import { AdminUserRow, UserRole, UserPlan } from '../../types';

export type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
};

export type UserStatusResponse = {
  message: string;
  user: AdminUserRow;
};

export const adminService = {
  async listUsers(): Promise<AdminUserRow[]> {
    return apiClient.get<AdminUserRow[]>('/admin/users/');
  },

  async createUser(payload: CreateUserPayload): Promise<AdminUserRow> {
    return apiClient.post<AdminUserRow>('/admin/users/', payload);
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

  async resetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  },
};
