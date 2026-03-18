// services/integrations/agentService.ts
import { GoogleGenAI, Type } from '@google/genai';
import { Invoice, InvoiceType, UnitOfMeasure } from '../../types';
import { invoiceService, CreateInvoicePayload } from '../business/invoiceService';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: Date;
  audioBlob?: Blob;
  action?: AgentAction;
  isLoading?: boolean;
}

export interface AgentAction {
  type: 'draft_created';
  invoice: Invoice;
}

// ---------------------------------------------------------------------------
// Internal Gemini response shape
// ---------------------------------------------------------------------------

interface DraftItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  has_igv: boolean;
}

interface AgentDraft {
  client_name?: string;
  client_document?: string;
  invoice_type: 'BOLETA' | 'FACTURA';
  invoice_date: string;
  items: DraftItem[];
}

interface AgentResponse {
  message: string;
  action: 'none' | 'create_draft';
  draft?: AgentDraft;
}

// ---------------------------------------------------------------------------
// Gemini response schema
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: {
      type: Type.STRING,
      description: 'Respuesta al usuario en español',
    },
    action: {
      type: Type.STRING,
      enum: ['none', 'create_draft'],
    },
    draft: {
      type: Type.OBJECT,
      properties: {
        client_name: { type: Type.STRING },
        client_document: { type: Type.STRING },
        invoice_type: {
          type: Type.STRING,
          enum: ['BOLETA', 'FACTURA'],
        },
        invoice_date: {
          type: Type.STRING,
          description: 'YYYY-MM-DD',
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: {
                type: Type.STRING,
                enum: ['UNIDAD', 'KILOGRAMO', 'CAJA', 'BOLSA', 'LITRO', 'DOCENA'],
              },
              unit_price: { type: Type.NUMBER },
              has_igv: { type: Type.BOOLEAN },
            },
            required: ['description', 'quantity', 'unit', 'unit_price', 'has_igv'],
          },
        },
      },
    },
  },
  required: ['message', 'action'],
};

// ---------------------------------------------------------------------------
// System instruction builder (injects today's date at call time)
// ---------------------------------------------------------------------------

function buildSystemInstruction(): string {
  const today = new Date().toISOString().split('T')[0];
  return `Eres un asistente experto en facturación electrónica peruana (SUNAT).
Ayudas a los usuarios a:
- Responder consultas sobre IGV, RUC, tipos de comprobantes, plazos SUNAT
- Crear borradores de facturas/boletas (NO las emites, solo las creas en borrador)
- Validar datos de clientes y productos

REGLAS:
- Responde siempre en español, de forma concisa y clara
- Para BOLETA: cliente puede tener DNI (8 dígitos) o ser anónimo
- Para FACTURA: cliente DEBE tener RUC (11 dígitos)
- El IGV en Perú es 18%
- Las series son: BOLETA=B001, FACTURA=F001
- Fecha de hoy: ${today}
- Si el usuario quiere crear un comprobante, extrae los datos y usa action="create_draft"
- Si es una consulta informativa, usa action="none" y responde en message
- La emisión automática a SUNAT está DESHABILITADA, solo puedes crear borradores
- Si no tienes suficientes datos para crear el borrador, pide los que falten en message con action="none"`;
}

// ---------------------------------------------------------------------------
// Gemini client factory — validates API key at call time
// ---------------------------------------------------------------------------

function createGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY no está configurada.');
  }
  return new GoogleGenAI({ apiKey });
}

// ---------------------------------------------------------------------------
// History → Gemini contents builder
//
// Gemini requires strictly alternating user/model roles. If consecutive
// messages share the same role, we merge their text with a newline.
// ---------------------------------------------------------------------------

type HistoryItem = { role: ChatRole; text: string };

function buildContentsFromHistory(history: HistoryItem[]) {
  const merged: HistoryItem[] = [];

  for (const item of history) {
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) {
      last.text += `\n${item.text}`;
    } else {
      merged.push({ role: item.role, text: item.text });
    }
  }

  return merged.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));
}

// ---------------------------------------------------------------------------
// Parse Gemini text → AgentResponse
// ---------------------------------------------------------------------------

function parseGeminiText(raw: string | null | undefined): AgentResponse {
  try {
    return JSON.parse(raw ?? '') as AgentResponse;
  } catch {
    return {
      message: raw ?? 'Error al procesar la respuesta.',
      action: 'none',
    };
  }
}

// ---------------------------------------------------------------------------
// Exported API functions
// ---------------------------------------------------------------------------

/**
 * Sends a plain-text message to the agent and returns its structured response.
 * @param userText  The user's message.
 * @param history   Prior conversation turns (excluding the new user message).
 */
export async function sendTextToAgent(
  userText: string,
  history: HistoryItem[]
): Promise<AgentResponse> {
  const ai = createGeminiClient();
  const systemInstruction = buildSystemInstruction();

  const contents = [
    ...buildContentsFromHistory(history),
    { role: 'user' as const, parts: [{ text: userText }] },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return parseGeminiText(response.text);
}

/**
 * Sends an audio message (base64-encoded) to the agent.
 * @param base64Audio  Raw base64 audio data (no data-URI prefix).
 * @param mimeType     MIME type of the audio (e.g. "audio/webm;codecs=opus").
 * @param history      Prior conversation turns.
 */
export async function sendAudioToAgent(
  base64Audio: string,
  mimeType: string,
  history: HistoryItem[]
): Promise<AgentResponse> {
  const ai = createGeminiClient();
  const systemInstruction = buildSystemInstruction();

  const contents = [
    ...buildContentsFromHistory(history),
    {
      role: 'user' as const,
      parts: [
        { text: 'Audio del usuario:' },
        { inlineData: { mimeType, data: base64Audio } },
      ],
    },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return parseGeminiText(response.text);
}

// ---------------------------------------------------------------------------
// Unit string → UnitOfMeasure mapping
// ---------------------------------------------------------------------------

const UNIT_MAP: Record<string, UnitOfMeasure> = {
  UNIDAD: UnitOfMeasure.UNIDAD,
  KILOGRAMO: UnitOfMeasure.KILOGRAMO,
  CAJA: UnitOfMeasure.CAJA,
  BOLSA: UnitOfMeasure.BOLSA,
  LITRO: UnitOfMeasure.LITRO,
  DOCENA: UnitOfMeasure.DOCENA,
};

function toUnitOfMeasure(unit: string): UnitOfMeasure {
  return UNIT_MAP[unit?.toUpperCase()] ?? UnitOfMeasure.UNIDAD;
}

/**
 * Persists a draft invoice from an agent-extracted draft payload.
 * Maps the agent's draft shape to CreateInvoicePayload and calls invoiceService.
 */
export async function createDraftFromAgentResponse(
  draft: AgentResponse['draft']
): Promise<Invoice> {
  if (!draft) {
    throw new Error('No se recibió un borrador válido del agente.');
  }

  const today = new Date().toISOString().split('T')[0];

  const payload: CreateInvoicePayload = {
    client_name: draft.client_name ?? 'Cliente',
    client_document: draft.client_document,
    invoice_type:
      draft.invoice_type === 'FACTURA' ? InvoiceType.FACTURA : InvoiceType.BOLETA,
    invoice_date: draft.invoice_date ?? today,
    items: draft.items.map((item) => ({
      product_id: null,
      description: item.description,
      quantity: item.quantity,
      unit: toUnitOfMeasure(item.unit),
      unit_price: item.unit_price,
      has_igv: item.has_igv,
    })),
  };

  return invoiceService.createInvoice(payload);
}
