// schemas/business.ts
import { z } from 'zod';
import {
  InvoiceType,
  CreditNoteReason,
} from '../types';
import { SUNAT_UNITS } from '../config/sunatUnits';

// ==================== HELPERS ====================
const optionalText = z.string().trim().optional().or(z.literal(''));

const unitEnum = z.enum(SUNAT_UNITS);

const creditNoteReasonEnum = z.enum(
  Object.values(CreditNoteReason) as [CreditNoteReason, ...CreditNoteReason[]]
);

const MAX_BACKDATED_DAYS = 2;

// SUNAT permite emitir con fecha desde hoy hasta MAX_BACKDATED_DAYS atras.
const isWithinEmissionWindow = (dateStr: string): boolean => {
  const today = new Date().toLocaleDateString('en-CA');
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - MAX_BACKDATED_DAYS);
  return dateStr >= minDate.toLocaleDateString('en-CA') && dateStr <= today;
};

// ==================== SENDERS ====================
export const senderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .transform((value) => value.toUpperCase()),
  ruc: z
    .string()
    .trim()
    .length(11, 'RUC debe tener exactamente 11 dígitos')
    .regex(/^\d+$/, 'RUC solo debe contener números'),
  sunat_user: optionalText,
  sunat_pass: optionalText,
});

export type SenderInput = z.infer<typeof senderSchema>;

// ==================== CLIENTS ====================
export const clientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nombre debe tener al menos 2 caracteres')
      .max(150, 'Máximo 150 caracteres')
      .transform((value) => value.toUpperCase()),
    dni: optionalText.refine(
      (value) => !value || /^\d{8}$/.test(value),
      'DNI debe tener exactamente 8 dígitos'
    ),
    ruc: optionalText.refine(
      (value) => !value || /^\d{11}$/.test(value),
      'RUC debe tener exactamente 11 dígitos'
    ),
    phone: optionalText.refine(
      (value) => !value || /^[0-9\s\-+()]+$/.test(value),
      'Teléfono inválido'
    ).refine(
      (value) => !value || value.length <= 20,
      'Máximo 20 caracteres'
    ),
  })
  .refine(
    (data) => !(data.dni && data.ruc),
    {
      message: 'Ingresa DNI o RUC, no ambos',
      path: ['dni'],
    }
  );

export type ClientInput = z.infer<typeof clientSchema>;

// ==================== PRODUCTS ====================
export const productSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Descripción debe tener al menos 2 caracteres')
    .max(200, 'Máximo 200 caracteres')
    .transform((value) => value.toUpperCase()),
  unit: unitEnum,
  base_price: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto'),
  has_igv: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ==================== INVENTARIO ====================
export const inventoryProductSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(255, 'Máximo 255 caracteres')
    .transform((value) => value.toUpperCase()),
  categoria: optionalText,
  unidad_medida: unitEnum,
  precio_venta: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto'),
  cantidad_inicial: z
    .number()
    .min(0.001, 'La cantidad debe ser mayor a 0')
    .max(999999.999, 'Cantidad muy alta'),
  precio_compra: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto')
    .optional(),
  fecha_vencimiento: optionalText.refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Fecha inválida (YYYY-MM-DD)'
  ),
});

export type InventoryProductInput = z.infer<typeof inventoryProductSchema>;

// ==================== INVOICE ITEMS ====================
export const invoiceItemSchema = z.object({
  product_id: z.number().int().positive().nullable().optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Descripción es requerida')
    .max(200, 'Máximo 200 caracteres'),
  quantity: z
    .number()
    .min(0.001, 'Cantidad debe ser mayor a 0')
    .max(999999, 'Cantidad muy alta'),
  unit: unitEnum,
  unit_price: z
    .number()
    .min(0, 'Precio no puede ser negativo')
    .max(999999.99, 'Precio muy alto'),
  has_igv: z.boolean(),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

// ==================== INVOICE FORM CLIENT DATA ====================
export const invoiceClientDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nombre del cliente es requerido')
    .max(150, 'Máximo 150 caracteres')
    .transform((value) => value.toUpperCase()),
  document: optionalText.refine(
    (value) => !value || /^\d+$/.test(value),
    'Documento solo debe contener números'
  ),
  phone: optionalText.refine(
    (value) => !value || /^[0-9\s\-+()]+$/.test(value),
    'Teléfono inválido'
  ).refine(
    (value) => !value || value.length <= 20,
    'Máximo 20 caracteres'
  ),
  invoice_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .refine(isWithinEmissionWindow, 'La fecha debe estar entre hoy y 2 días atrás'),
});

export type InvoiceClientData = z.infer<typeof invoiceClientDataSchema>;

// ==================== INVOICES ====================
export const invoiceEmissionSchema = z
  .object({
    invoice_type: z.enum([InvoiceType.BOLETA, InvoiceType.FACTURA]),
    clientData: invoiceClientDataSchema,
    items: z
      .array(invoiceItemSchema)
      .min(1, 'Debe agregar al menos un producto'),
  })
  .refine(
    (data) => {
      const document = data.clientData.document;

      if (data.invoice_type === InvoiceType.FACTURA) {
        return !!document && /^\d{11}$/.test(document);
      }

      return true;
    },
    {
      message: 'Para FACTURA el cliente debe tener RUC de 11 dígitos',
      path: ['clientData.document'],
    }
  )
  .refine(
    (data) => {
      const document = data.clientData.document;

      if (data.invoice_type === InvoiceType.BOLETA && document) {
        return /^\d{8}$/.test(document) || /^\d{11}$/.test(document);
      }

      return true;
    },
    {
      message: 'Para BOLETA el documento debe ser DNI de 8 dígitos o RUC de 11 dígitos',
      path: ['clientData.document'],
    }
  );

export type InvoiceEmissionInput = z.infer<typeof invoiceEmissionSchema>;

// ==================== CREDIT NOTES ====================
export const creditNoteSchema = z.object({
  reason: creditNoteReasonEnum,
  sustento: z
    .string()
    .trim()
    .min(5, 'Sustento debe tener al menos 5 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, 'Fecha inválida'),
});

export type CreditNoteInput = z.infer<typeof creditNoteSchema>;