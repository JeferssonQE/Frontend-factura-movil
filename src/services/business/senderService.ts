// services/business/senderService.ts
import { apiClient } from '../core/apiClient';
import { Sender, SenderUpsertInput } from '../../types';

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
};