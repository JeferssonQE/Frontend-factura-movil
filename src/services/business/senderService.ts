// services/business/senderService.ts

import type { EmissionUsage, Sender, SenderUpsertInput } from '../../types';
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

  /** Cuanto lleva emitido este mes contra su limite. Lo cuenta el backend.
   *
   * El sender_id es obligatorio para un contador o un admin, que operan en nombre de otra
   * empresa; para el rol empresa se ignora. Sin el, el backend respondia 400 y la pantalla
   * se quedaba sin el consumo justo cuando alguien operaba por un cliente.
   */
  async getEmissionUsage(senderId?: number): Promise<EmissionUsage> {
    const query = senderId === undefined ? '' : `?sender_id=${senderId}`;
    return apiClient.get<EmissionUsage>(`/sender/usage${query}`);
  },

  async deleteSender(): Promise<void> {
    await apiClient.delete<void>('/sender');
  },
};
