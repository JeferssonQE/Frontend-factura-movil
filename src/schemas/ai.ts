// schemas/ai.ts
// Contrato de la respuesta de POST /ai/extract. Espejo de backend app/models/ai_extraction.py.
// Se valida en el borde y con `.catch()` por campo: un dato raro de la IA degrada a un valor
// seguro aqui, en vez de viajar hasta la validacion de la emision y romperla.
// El tipo del dominio se deriva de este schema (z.infer), no se escribe a mano.
import { z } from 'zod';

const text = z.string().catch('');
const amount = z.coerce.number().finite().catch(0);

export const extractedClientSchema = z.object({
  nombre: text,
  documento: text,
  telefono: text,
  fecha_emision: text,
});

export const extractedProductSchema = z.object({
  product_id: text,
  descripcion: text,
  cantidad: amount,
  unidad_medida: text,
  precio_unitario: amount,
  has_igv: z.boolean().catch(false),
});

export const aiExtractionSchema = z.object({
  tipo_documento: z.enum(['BOLETA', 'FACTURA']).catch('BOLETA'),
  cliente: extractedClientSchema.catch({
    nombre: '',
    documento: '',
    telefono: '',
    fecha_emision: '',
  }),
  productos: z.array(extractedProductSchema).catch([]),
});

export type ExtractedClient = z.infer<typeof extractedClientSchema>;
export type ExtractedProduct = z.infer<typeof extractedProductSchema>;
export type IAExtractionResult = z.infer<typeof aiExtractionSchema>;
