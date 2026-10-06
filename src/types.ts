// types.ts

/**
 * La unidad de medida de un item (catalogo 03 de SUNAT).
 *
 * Es `string` y no una union de literales a proposito: la lista ya no vive aqui, la sirve
 * el backend en GET /units. Se pierde el chequeo en tiempo de compilacion, y se gana que no
 * haya una copia del catalogo que se separe de la de Factu API -que es justo lo que habia
 * pasado-. La unidad se valida en el backend, que es quien emite.
 */
export type UnitOfMeasure = string;

// La afectacion del IGV, con las mismas palabras que Factu API y SUNAT. Reemplaza al
// has_igv (si/no), que no podia expresar INAFECTO.
export type IgvType = 'GRAVADO' | 'EXONERADO' | 'INAFECTO';

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

/**
 * PENDIENTE: guardadas pero sin verificar (no bloquea emitir).
 * VALIDA: login confirmado contra el portal SUNAT.
 * INVALIDA: SUNAT rechazo usuario o clave (bloquea emitir).
 */
export type SunatCredentialsStatus = 'PENDIENTE' | 'VALIDA' | 'INVALIDA';

export type BillingEnvironment = 'dev' | 'prod';

/**
 * Cuanto lleva emitido la empresa este mes contra el limite de su plan.
 *
 * Lo cuenta el backend; el frontend lo pinta. `enforced` es false en dev, donde las pruebas
 * no gastan el plan: ahi no hay nada que mostrar.
 */
export interface EmissionUsage {
  period: string;
  environment: BillingEnvironment;
  limit: number;
  used: number;
  remaining: number;
  enforced: boolean;
}

export interface Sender {
  id: number;
  user_id: string;
  name: string;
  ruc: string;
  // De solo lectura: los cambia el administrador, no la empresa desde la app.
  billing_environment?: BillingEnvironment;
  monthly_emission_limit?: number;
  has_sunat_credentials: boolean;
  sunat_credentials_invalid?: boolean;
  sunat_credentials_status?: SunatCredentialsStatus;
  sunat_credentials_checked_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SunatCredentialsValidation {
  task_id: string;
  finished: boolean;
  credentials_status: SunatCredentialsStatus;
  message: string;
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
  // El precio del estante, con IGV si el producto lo lleva. Nadie lo divide entre 1.18.
  sale_price: number;
  igv_type: IgvType;
  created_at?: string;
  updated_at?: string;
}

export interface ProductUpsertInput {
  description: string;
  unit: UnitOfMeasure;
  sale_price: number;
  igv_type: IgvType;
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
  // Lo que se vendio: lo decide el cajero.
  sale_price: number;
  igv_type: IgvType;
  // Lo que calculo Factu API. Vacio mientras es borrador.
  unit_value: number | null;
  igv: number | null;
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
  // Los calcula Factu API, partidos por afectacion: son las lineas "Op. Gravadas" y
  // "Op. Exoneradas" del comprobante. Vacios en los emitidos antes del cambio.
  taxed_amount: number | null;
  exempt_amount: number | null;
  unaffected_amount: number | null;
  igv: number;
  total: number;
  status: InvoiceStatus;
  task_id: string | null;
  // Los dos formatos, como link: el archivo ya no viaja dentro de la factura.
  pdf_url: string | null;
  pdf_a4_url: string | null;
  sunat_message: string | null;
  sunat_failed_step: string | null;
  sunat_current_step: string | null;
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
    sale_price: number;
    igv_type: IgvType;
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

export type { ExtractedClient, ExtractedProduct, IAExtractionResult } from './schemas/ai';

export interface BillingClientData {
  name: string;
  document: string;
  phone: string;
  invoice_date: string;
}
