// services/geminiService.ts
// La extracción con Gemini vive en el backend (la API key nunca llega al navegador).
// Estas funciones solo hacen el POST; los errores se propagan para que la vista los muestre.

import { IAExtractionResult } from '../../types';
import { apiClient } from '../core/apiClient';

type ExtractionKind = 'image' | 'audio';

interface ExtractionPayload {
  kind: ExtractionKind;
  data: string;
  mime_type?: string;
}

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

const extractInvoice = (
  payload: ExtractionPayload,
  senderId?: number
): Promise<IAExtractionResult> =>
  apiClient.post<IAExtractionResult>(`/ai/extract${qs(senderId)}`, payload);

export const processInvoiceImage = (
  base64Image: string,
  senderId?: number
): Promise<IAExtractionResult> =>
  extractInvoice({ kind: 'image', data: base64Image }, senderId);

export const processInvoiceAudio = (
  base64Audio: string,
  mimeType: string,
  senderId?: number
): Promise<IAExtractionResult> =>
  extractInvoice({ kind: 'audio', data: base64Audio, mime_type: mimeType }, senderId);
