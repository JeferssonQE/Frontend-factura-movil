// services/utils/invoiceMath.ts
import type { InvoiceItem, UnitOfMeasure } from '../../types';

const IGV_RATE = 1.18;
const CALC_DECIMALS = 4;

const ceilTo = (value: number, decimals: number = CALC_DECIMALS): number => {
  const factor = 10 ** decimals;
  return Math.ceil(Number((value * factor).toPrecision(12))) / factor;
};

export const unitLabel = (unit: UnitOfMeasure): string => (unit === 'KILOGRAMO' ? 'KILOG.' : unit);

export const createEmptyItem = (): InvoiceItem => ({
  product_id: null,
  description: '',
  quantity: 1,
  unit: 'KILOGRAMO',
  unit_price: 0,
  has_igv: false,
  total: 0,
});

export const recalcItem = (item: InvoiceItem, updates: Partial<InvoiceItem>): InvoiceItem => {
  const next = { ...item, ...updates };
  next.quantity = Number(next.quantity) || 0;
  next.unit_price = Number(next.unit_price) || 0;
  next.total = Number(next.total) || 0;
  const quantity = next.quantity || 1;

  if ('total' in updates && updates.total !== undefined) {
    const totalWithoutIgv = next.has_igv ? next.total / IGV_RATE : next.total;
    next.unit_price = ceilTo(totalWithoutIgv / quantity);
  } else if ('unit_price' in updates && updates.unit_price !== undefined) {
    const base = quantity * next.unit_price;
    next.total = ceilTo(next.has_igv ? base * IGV_RATE : base);
  } else if ('quantity' in updates && updates.quantity !== undefined) {
    const base = quantity * next.unit_price;
    next.total = ceilTo(next.has_igv ? base * IGV_RATE : base);
  } else if ('has_igv' in updates && updates.has_igv !== undefined) {
    const totalWithoutIgv = next.has_igv ? next.total / IGV_RATE : next.total;
    next.unit_price = ceilTo(totalWithoutIgv / quantity);
  }

  return next;
};
