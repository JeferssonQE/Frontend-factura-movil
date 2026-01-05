
export enum UnitOfMeasure {
  KILOGRAMO = 'KILOGRAMO',
  CAJA = 'CAJA',
  UNIDAD = 'UNIDAD',
  BOLSA = 'BOLSA'
}

export enum InvoiceType {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO'
}

export enum InvoiceStatus {
  BORRADOR = 'BORRADOR',
  PROCESANDO = 'PROCESANDO',
  ACEPTADO = 'ACEPTADO',
  RECHAZADO = 'RECHAZADO',
  ANULADO = 'ANULADO',
  FALLO = 'FALLO'
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  EMPRESA = 'EMPRESA'
}

export enum CreditNoteReason {
  ANULACION_OPERACION = '01',
  ANULACION_ERROR_RUC = '02',
  CORRECCION_ERROR_DESCRIPCION = '03',
  DEVOLUCION_TOTAL = '06'
}

export interface Sender {
  id: string;
  name: string;
  ruc: string;
  sunatUser: string;
  sunatPass: string;
}

export interface Product {
  id: string;
  senderId: string;
  description: string;
  unit: UnitOfMeasure;
  basePrice: number;
  hasIgv: boolean;
}

export interface Client {
  id: string;
  senderId: string;
  name: string;
  dni?: string;
  ruc?: string;
  phone?: string;
}

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPrice: number;
  hasIgv: boolean;
  total: number;
}

export interface Invoice {
  id: string;
  senderId: string;
  clientId: string;
  clientName: string;
  type: InvoiceType;
  series: string;
  number: string;
  date: string;
  subtotal: number;
  igv: number;
  total: number;
  items: InvoiceItem[];
  status: InvoiceStatus;
  externalId?: string;
  pdfBase64?: string;
  xmlUrl?: string;
  sunatResponse?: string;
  referencedInvoiceId?: string;
  creditNoteReason?: CreditNoteReason;
}

export interface IAExtractionResult {
  cliente: {
    fecha: string;
    cliente: string; 
    dni: string;
    ruc: string;
    telefono: string;
  };
  productos: {
    productId?: string; 
    cantidad: number;
    unidad_medida: string;
    descripcion: string;
    precio_base: number;
    igv: number; 
    precio_total: number;
  }[];
  total: number;
}
