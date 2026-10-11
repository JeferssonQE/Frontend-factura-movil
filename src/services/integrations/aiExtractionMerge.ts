// services/integrations/aiExtractionMerge.ts
// Politica de merge de lo que extrae la IA sobre el formulario de emision.
//
// Regla unica: un valor vacio o invalido NUNCA pisa lo que el formulario ya tiene
// (la fecha de hoy, la unidad por defecto, lo que el usuario escribio). Cada campo
// descartado se acumula en `ignored` para avisarlo en pantalla, porque degradar en
// silencio es lo que hacia que el error apareciera recien al emitir.

import { isWithinEmissionWindow } from '../../schemas/business';
import {
  type BillingClientData,
  type ExtractedClient,
  type ExtractedProduct,
  type IAExtractionResult,
  type IgvType,
  type InvoiceItem,
  InvoiceType,
  type Product,
  type UnitOfMeasure,
} from '../../types';
import { lineAmount } from '../utils/invoiceMath';

const DNI_LENGTH = 8;
const RUC_LENGTH = 11;

export interface FormSnapshot {
  invoiceType: InvoiceType;
  clientData: BillingClientData;
}

export interface MergeResult {
  invoiceType: InvoiceType;
  clientData: BillingClientData;
  items: InvoiceItem[];
  ignored: string[];
}

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const isValidDocument = (value: string): boolean =>
  value.length === DNI_LENGTH || value.length === RUC_LENGTH;

const toIsoDate = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes('/')) return trimmed;

  const [day, month, year] = trimmed.split('/');
  if (!day || !month || !year) return trimmed;

  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isRealDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
};

const isEmittableDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isRealDate(value) && isWithinEmissionWindow(value);

const mergeClient = (
  extracted: ExtractedClient,
  current: BillingClientData,
  ignored: string[],
): BillingClientData => {
  const name = extracted.nombre.trim();
  const document = onlyDigits(extracted.documento);
  const phone = onlyDigits(extracted.telefono);
  const date = toIsoDate(extracted.fecha_emision);

  if (extracted.documento.trim() && !isValidDocument(document)) {
    ignored.push('documento del cliente');
  }
  if (extracted.fecha_emision.trim() && !isEmittableDate(date)) {
    ignored.push('fecha de emisión');
  }

  return {
    name: name || current.name,
    document: isValidDocument(document) ? document : current.document,
    phone: phone || current.phone,
    // La IA lee un ticket o un audio, no el domicilio del comprador: se conserva el que
    // ya habia, que solo puede venir de la busqueda por RUC.
    address: current.address,
    invoice_date: isEmittableDate(date) ? date : current.invoice_date,
  };
};

const resolveInvoiceType = (
  document: string,
  extractedType: IAExtractionResult['tipo_documento'],
  current: InvoiceType,
): InvoiceType => {
  if (document.length === RUC_LENGTH) return InvoiceType.FACTURA;
  if (document.length === DNI_LENGTH) return InvoiceType.BOLETA;
  if (document) return current;
  return extractedType === 'FACTURA' ? InvoiceType.FACTURA : InvoiceType.BOLETA;
};

const resolveUnit = (
  matched: Product | undefined,
  extracted: ExtractedProduct,
  description: string,
  ignored: string[],
  units: string[],
): UnitOfMeasure => {
  if (matched) return matched.unit;

  // La lista valida llega del backend. Si todavia no llego, nada se acepta y queda UNIDAD:
  // preferible a dejar pasar una unidad que la emision va a rechazar.
  const unit = extracted.unidad_medida.trim().toUpperCase();
  if (unit && units.includes(unit)) return unit;

  if (unit) ignored.push(`unidad de "${description}"`);
  return 'UNIDAD';
};

const toInvoiceItem = (
  extracted: ExtractedProduct,
  catalog: Product[],
  ignored: string[],
  units: string[],
): InvoiceItem | null => {
  const matched = catalog.find((product) => String(product.id) === extracted.product_id);
  const description = (matched?.description ?? extracted.descripcion).trim();
  if (!description) {
    ignored.push('un producto sin descripción');
    return null;
  }

  const quantity = extracted.cantidad > 0 ? extracted.cantidad : 1;
  if (extracted.cantidad <= 0) ignored.push(`cantidad de "${description}"`);

  // La IA sigue devolviendo un si/no de IGV; la afectacion de tres valores se decide aqui,
  // en el borde. Si el producto esta en el catalogo manda el catalogo, que es dato del
  // dueno y no una lectura de una foto.
  const igvType: IgvType = matched ? matched.igv_type : extracted.has_igv ? 'GRAVADO' : 'EXONERADO';
  const salePrice =
    extracted.precio_unitario > 0 ? extracted.precio_unitario : (matched?.sale_price ?? 0);
  if (salePrice <= 0) ignored.push(`precio de "${description}"`);

  return {
    product_id: matched?.id ?? null,
    description,
    quantity,
    unit: resolveUnit(matched, extracted, description, ignored, units),
    sale_price: salePrice,
    igv_type: igvType,
    unit_value: null,
    igv: null,
    total: lineAmount({ quantity, sale_price: salePrice }),
  };
};

export const mergeExtraction = (
  extraction: IAExtractionResult,
  current: FormSnapshot,
  catalog: Product[],
  units: string[],
): MergeResult => {
  const ignored: string[] = [];
  const clientData = mergeClient(extraction.cliente, current.clientData, ignored);
  const items = extraction.productos
    .map((product) => toInvoiceItem(product, catalog, ignored, units))
    .filter((item): item is InvoiceItem => item !== null);

  return {
    invoiceType: resolveInvoiceType(
      clientData.document,
      extraction.tipo_documento,
      current.invoiceType,
    ),
    clientData,
    items,
    ignored: [...new Set(ignored)],
  };
};
