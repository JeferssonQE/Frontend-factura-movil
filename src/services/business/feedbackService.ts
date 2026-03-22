import { apiClient } from '../core/apiClient';

export type FeedbackPayload = {
  sender_id?: number | null;
  rating?: number | null;
  nombre?: string;
  mensaje: string;
};

export type FeedbackResponse = {
  id: string;
  user_id: string;
  sender_id?: string | null;
  rating?: number | null;
  nombre?: string | null;
  mensaje: string;
  created_at: string;
};

export const feedbackService = {
  async submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    return apiClient.post<FeedbackResponse>('/feedback', payload);
  },
};
