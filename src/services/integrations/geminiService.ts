// services/geminiService.ts
// La extracción con Gemini vive en el backend (la API key nunca llega al navegador).
// Estas funciones solo hacen el POST; los errores se propagan para que la vista los muestre.
// La respuesta se valida contra aiExtractionSchema antes de devolverla: la vista siempre
// recibe un objeto con la forma completa, nunca claves ausentes.

import { aiExtractionSchema, type IAExtractionResult } from '../../schemas/ai';
import { apiClient } from '../core/apiClient';

type ExtractionKind = 'image' | 'audio';

interface ExtractionPayload {
  kind: ExtractionKind;
  data: string;
  mime_type?: string;
}

const qs = (senderId?: number) => (senderId ? `?sender_id=${senderId}` : '');

const extractInvoice = async (
  payload: ExtractionPayload,
  senderId?: number,
): Promise<IAExtractionResult> => {
  const response = await apiClient.post<unknown>(`/ai/extract${qs(senderId)}`, payload);
  return aiExtractionSchema.parse(response);
};

export const processInvoiceImage = (
  base64Image: string,
  mimeType: string,
  senderId?: number,
): Promise<IAExtractionResult> =>
  extractInvoice({ kind: 'image', data: base64Image, mime_type: mimeType }, senderId);

export const processInvoiceAudio = (
  base64Audio: string,
  mimeType: string,
  senderId?: number,
): Promise<IAExtractionResult> =>
  extractInvoice({ kind: 'audio', data: base64Audio, mime_type: mimeType }, senderId);
