// types.ts
export enum UnitOfMeasure {
  UNIDAD = 'UNIDAD',
  KILOGRAMO = 'KILOGRAMO',
  CAJA = 'CAJA',
  BOLSA = 'BOLSA',
  LITRO = 'LITRO',
  DOCENA = 'DOCENA',
}

export enum InvoiceType {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO',
}

export enum InvoiceStatus {
  BORRADOR = 'BORRADOR',
  PROCESANDO = 'PROCESANDO',
  EMITIDO = 'EMITIDO',
  ANULADO = 'ANULADO',
  FALLO = 'FALLO',
  ELIMINADO = 'ELIMINADO',
}

export enum UserRole {
  ADMIN = 'admin',
  EMPRESA = 'empresa',
  CONTADOR = 'contador',
}

export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum CreditNoteReason {
  ANULACION_OPERACION = '01',
  ANULACION_ERROR_RUC = '02',
  DEVOLUCION_TOTAL = '03',
  CORRECCION_ERROR_DESCRIPCION = '04',
  DEVOLUCION_POR_ITEM = '05',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  plan: UserPlan | string;
  must_change_password?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active?: boolean;
  plan?: UserPlan | string;
  trial_ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sender {
  id: number;
  user_id: string;
  name: string;
  ruc: string;
  has_sunat_credentials: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SenderUpsertInput {
  name: string;
  ruc: string;
  sunat_user?: string;
  sunat_pass?: string;
}

export interface Product {
  id: number;
  sender_id: number;
  description: string;
  unit: UnitOfMeasure;
  base_price: number;
  has_igv: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductUpsertInput {
  description: string;
  unit: UnitOfMeasure;
  base_price: number;
  has_igv: boolean;
}

export interface Client {
  id: number;
  sender_id: number;
  name: string;
  dni: string | null;
  ruc: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientUpsertInput {
  name: string;
  dni?: string;
  ruc?: string;
  phone?: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit: UnitOfMeasure;
  unit_price: number;
  has_igv: boolean;
  total: number;
  created_at?: string;
}

export interface Invoice {
  id: number;
  sender_id: number;
  client_id: number | null;
  client_name: string;
  client_document: string | null;
  invoice_type: InvoiceType;
  series: string;
  number: string;
  nro_comprobante_sunat: string | null;
  invoice_date: string;
  subtotal: number;
  igv: number;
  total: number;
  status: InvoiceStatus;
  task_id: string | null;
  pdf_base64: string | null;
  sunat_message: string | null;
  sunat_failed_step: string | null;
  referenced_invoice_id: number | null;
  credit_note_reason: CreditNoteReason | null;
  credit_note_sustento: string | null;
  created_at?: string;
  updated_at?: string;
  items: InvoiceItem[];
}

export interface CreateInvoiceInput {
  client_id?: number;
  client_name?: string;
  client_document?: string;
  invoice_type: InvoiceType;
  invoice_date: string;
  items: Array<{
    product_id?: number | null;
    description: string;
    quantity: number;
    unit: UnitOfMeasure;
    unit_price: number;
    has_igv: boolean;
  }>;
}

export interface CreateCreditNoteInput {
  date: string;
  reason: CreditNoteReason;
  sustento: string;
}

export interface DashboardSummary {
  total_invoices: number;
  total_sales: number;
  total_clients: number;
  total_products: number;
  status_counts: Record<string, number>;
  emitted_invoices: number;
  pending_invoices: number;
  failed_invoices: number;
  annulled_invoices: number;
}

export interface SalesByMonthItem {
  month: string;
  total_invoices: number;
  total_sales: number;
  total_igv: number;
}

export interface TopProductItem {
  description: string;
  total_quantity: number;
  total_sales: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  plan: UserPlan | string;
  trial_ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IAExtractionResult {
  tipo_documento: 'BOLETA' | 'FACTURA';
  cliente: {
    fecha: string;
    cliente: string;
    dni: string;
    ruc: string;
    telefono: string;
  };
  productos: Array<{
    productId?: number | string;
    cantidad: number;
    unidad_medida: string;
    descripcion: string;
    precio_base: number;
    igv: number;
    precio_total: number;
  }>;
  total: number;
}