// services/business/senderService.ts

import type { Sender, SenderUpsertInput, SunatCredentialsValidation } from '../../types';
import { apiClient } from '../core/apiClient';

export const senderService = {
  async getSender(): Promise<Sender | null> {
    try {
      return await apiClient.get<Sender>('/sender');
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createSender(payload: SenderUpsertInput): Promise<Sender> {
    return apiClient.post<Sender>('/sender', payload);
  },

  async updateSender(payload: SenderUpsertInput): Promise<Sender> {
    return apiClient.put<Sender>('/sender', payload);
  },

  async deleteSender(): Promise<void> {
    await apiClient.delete<void>('/sender');
  },

  async startSunatCredentialsValidation(): Promise<{ task_id: string }> {
    return apiClient.post<{ task_id: string }>('/sender/sunat-credentials/validate', {});
  },

  async getSunatCredentialsValidation(taskId: string): Promise<SunatCredentialsValidation> {
    return apiClient.get<SunatCredentialsValidation>(
      `/sender/sunat-credentials/validation/${taskId}`,
    );
  },
};
