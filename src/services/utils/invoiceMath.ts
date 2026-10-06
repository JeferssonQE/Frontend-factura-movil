// services/utils/invoiceMath.ts
// Ya no calcula impuestos. El IGV, la base de cada linea y los montos declarados los
// calcula Factu API y llegan por /invoices/preview: aqui no hay ningun 1.18, y no debe
// volver a haberlo. El frontend solo pinta.
//
// Lo que queda son los numeros que escribe el cajero, que son precios de estante:
// multiplicar y dividir por la cantidad no toca ninguna regla de SUNAT.
import type { IgvType, InvoiceItem, UnitOfMeasure } from '../../types';

// El precio del estante se guarda con 2 decimales, como el dinero.
const PRICE_DECIMALS = 2;

const roundTo = (value: number, decimals: number = PRICE_DECIMALS): number => {
  const factor = 10 ** decimals;
  return Math.round(Number((value * factor).toPrecision(12))) / factor;
};

export const unitLabel = (unit: UnitOfMeasure): string => (unit === 'KILOGRAMO' ? 'KILOG.' : unit);

export const igvTypeLabel = (igvType: IgvType): string =>
  igvType === 'GRAVADO' ? 'IGV 18%' : igvType === 'EXONERADO' ? 'Exonerado' : 'Inafecto';

export const createEmptyItem = (): InvoiceItem => ({
  product_id: null,
  description: '',
  quantity: 1,
  unit: 'KILOGRAMO',
  sale_price: 0,
  igv_type: 'GRAVADO',
  unit_value: null,
  igv: null,
  total: 0,
});

/** Lo que cobra una linea: cantidad por precio de estante. No es el monto declarado. */
export const lineAmount = (item: Pick<InvoiceItem, 'quantity' | 'sale_price'>): number =>
  roundTo(item.quantity * item.sale_price);

/**
 * Mantiene de acuerdo el precio y el importe de la linea mientras el cajero escribe.
 *
 * Escribir el importe es la forma de cobrar un numero redondo ("3 kilos por 10 soles"), y
 * de ahi sale el precio. Como el precio se queda en 2 decimales, el importe se recalcula
 * despues de redondear: el cajero escribe 10, ve 9.99 y decide. Antes esa diferencia se
 * guardaba callada y el comprobante salia por un monto que nadie cobro.
 */
export const recalcItem = (item: InvoiceItem, updates: Partial<InvoiceItem>): InvoiceItem => {
  const next = { ...item, ...updates };
  next.quantity = Number(next.quantity) || 0;
  next.sale_price = Number(next.sale_price) || 0;
  next.total = Number(next.total) || 0;
  const quantity = next.quantity || 1;

  if ('total' in updates && updates.total !== undefined) {
    next.sale_price = roundTo(next.total / quantity);
    next.total = lineAmount({ quantity, sale_price: next.sale_price });
  } else if (
    ('sale_price' in updates && updates.sale_price !== undefined) ||
    ('quantity' in updates && updates.quantity !== undefined)
  ) {
    next.total = lineAmount({ quantity, sale_price: next.sale_price });
  }

  return next;
};
