import { z } from 'zod';
import { UnitOfMeasure, InvoiceType, CreditNoteReason } from '../types';

// ==================== SENDERS ====================
export const senderSchema = z.object({
  name: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .toUpperCase(),
  ruc: z
    .string()
    .length(11, 'RUC debe tener exactamente 11 dígitos')
    .regex(/^\d+$/, 'RUC solo debe contener números'),
  sunatUser: z
    .string()
    .min(1, 'Usuario SOL es requerido')
    .max(50, 'Máximo 50 caracteres'),
  sunatPass: z
    .string()
    .min(1, 'Clave SOL es requerida')
    .max(50, 'Máximo 50 caracteres'),
});

export type SenderInput = z.infer<typeof senderSchema>;

// ==================== CLIENTS ====================
export const clientSchema = z.object({
  name: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(150, 'Máximo 150 caracteres')
    .toUpperCase(),
  dni: z
    .string()
    .length(8, 'DNI debe tener exactamente 8 dígitos')
    .regex(/^\d+$/, 'DNI solo debe contener números')
    .optional()
    .or(z.literal('')),
  ruc: z
    .string()
    .length(11, 'RUC debe tener exactamente 11 dígitos')
    .regex(/^\d+$/, 'RUC solo debe contener números')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Teléfono inválido')
    .max(20, 'Máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => data.dni || data.ruc,
  { message: 'Debe ingresar al menos un DNI o un RUC', path: ['dni'] }
);

export type ClientInput = z.infer<typeof clientSchema>;

// ==================== PRODUCTS ====================
export const productSchema = z.object({
  description: z
    .string()
    .min(2, 'Descripción debe tener al menos 2 caracteres')
    .max(200, 'Máximo 200 caracteres')
    .toUpperCase(),
  unit: z.enum(Object.values(UnitOfMeasure) as [string, ...string[]]),
  basePrice: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto'),
  hasIgv: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ==================== INVOICE ITEMS ====================
export const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Descripción es requerida')
    .max(200, 'Máximo 200 caracteres'),
  quantity: z
    .number()
    .min(0.01, 'Cantidad debe ser mayor a 0')
    .max(999999, 'Cantidad muy alta'),
  unit: z.enum(Object.values(UnitOfMeasure) as [string, ...string[]]),
  unitPrice: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto'),
  hasIgv: z.boolean(),
  total: z
    .number()
    .min(0, 'Total no puede ser negativo'),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

// ==================== INVOICES ====================
export const invoiceClientDataSchema = z.object({
  name: z
    .string()
    .min(2, 'Nombre del cliente es requerido')
    .max(150, 'Máximo 150 caracteres')
    .toUpperCase(),
  idDoc: z
    .string()
    .regex(/^\d+$/, 'Documento solo debe contener números')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Teléfono inválido')
    .max(20, 'Máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
});

export type InvoiceClientData = z.infer<typeof invoiceClientDataSchema>;

export const invoiceEmissionSchema = z.object({
  type: z.enum([InvoiceType.BOLETA, InvoiceType.FACTURA]),
  clientData: invoiceClientDataSchema,
  items: z
    .array(invoiceItemSchema)
    .min(1, 'Debe agregar al menos un producto'),
}).refine(
  (data) => {
    // Si es FACTURA, el RUC debe tener 11 dígitos
    if (data.type === InvoiceType.FACTURA) {
      return data.clientData.idDoc && data.clientData.idDoc.length === 11;
    }
    return true;
  },
  {
    message: 'Para FACTURA el RUC debe tener 11 dígitos',
    path: ['clientData.idDoc'],
  }
);

export type InvoiceEmissionInput = z.infer<typeof invoiceEmissionSchema>;

// ==================== CREDIT NOTES ====================
export const creditNoteSchema = z.object({
  reason: z.enum(Object.values(CreditNoteReason) as [string, ...string[]]),
  sustento: z
    .string()
    .min(10, 'Sustento debe tener al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres')
    .optional(),
});

export type CreditNoteInput = z.infer<typeof creditNoteSchema>;
