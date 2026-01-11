// services/invoiceService.ts - Lógica de negocio para facturas
import { SupabaseDB } from './supabase';
import { decrypt } from './crypto';
import { Invoice, InvoiceItem, Sender, Client, Product, InvoiceStatus, CreditNoteReason, InvoiceType } from '../types';
import { clientSchema, invoiceItemSchema } from '../schemas/business';

export class InvoiceService {
  /**
   * Procesar y guardar una factura
   */
  static async processInvoice(
    invoice: Invoice,
    senders: Sender[],
    clients: Client[],
    products: Product[]
  ): Promise<void> {
    const senderId = parseInt(invoice.senderId);
    if (isNaN(senderId)) {
      throw new Error('Sender ID inválido');
    }

    // Procesar cliente
    const clientId = await this.processClient(invoice, senderId, clients);
    
    // Procesar items y productos
    const itemsData = await this.processItems(invoice.items, invoice.senderId, products);

    // Preparar datos para Supabase
    const invoiceData = {
      sender_id: senderId,
      client_id: clientId,
      client_name: invoice.clientName,
      client_document: invoice.clientId || null,
      type: invoice.type,
      series: invoice.series,
      number: invoice.number,
      date: invoice.date,
      subtotal: invoice.subtotal,
      igv: invoice.igv,
      total: invoice.total,
      status: invoice.status,
      pdf_base64: invoice.pdfBase64 || null
    };

    // Guardar en Supabase
    await SupabaseDB.createInvoice(invoiceData, itemsData);
  }

  /**
   * Procesar cliente - crear si no existe
   */
  private static async processClient(
    invoice: Invoice,
    senderId: number,
    clients: Client[]
  ): Promise<number | null> {
    const clientDocument = invoice.clientId;
    const isNumericId = (id: string) => /^\d+$/.test(id);

    // Si el clientId ya es un ID numérico de la BD, usarlo
    if (clientDocument && isNumericId(clientDocument) && clientDocument !== '000') {
      const existingById = clients.find((c: Client) => c.id === clientDocument);
      if (existingById) {
        return parseInt(clientDocument);
      }
    }
    
    // Si hay documento válido (DNI 8 dígitos o RUC 11 dígitos)
    if (clientDocument && (clientDocument.length === 8 || clientDocument.length === 11)) {
      const existingClient = clients.find(
        (c: Client) => c.dni === clientDocument || c.ruc === clientDocument
      );

      if (existingClient) {
        return parseInt(existingClient.id);
      } else {
        // ✅ Validar antes de crear
        const validation = clientSchema.safeParse({
          name: invoice.clientName,
          dni: clientDocument.length === 8 ? clientDocument : '',
          ruc: clientDocument.length === 11 ? clientDocument : '',
        });

        if (!validation.success) {
          throw new Error(validation.error.issues[0].message);
        }

        const newClient = await SupabaseDB.createClient({
          sender_id: senderId,
          ...validation.data
        });
        return newClient.id;
      }
    }

    // Si hay nombre pero no documento, crear cliente sin documento
    if (invoice.clientName && invoice.clientName.trim()) {
      const validation = clientSchema.safeParse({
        name: invoice.clientName,
        dni: '',
        ruc: '',
      });

      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }

      const newClient = await SupabaseDB.createClient({
        sender_id: senderId,
        ...validation.data
      });
      return newClient.id;
    }

    return null;
  }

  /**
   * Procesar items - crear productos si no existen
   */
  private static async processItems(
    items: InvoiceItem[],
    senderId: string,
    products: Product[]
  ): Promise<any[]> {
    const isNumericId = (id: string) => /^\d+$/.test(id);
    const senderIdNum = parseInt(senderId);

    return Promise.all(
      items.map(async (item) => {
        // ✅ Validar item
        const validation = invoiceItemSchema.safeParse(item);
        if (!validation.success) {
          throw new Error(`Item inválido: ${validation.error.issues[0].message}`);
        }

        let productId: number | null = null;

        // Si ya es ID numérico de la BD, usarlo
        if (item.productId && isNumericId(item.productId)) {
          productId = parseInt(item.productId);
        }
        // Si tiene descripción, buscar o crear producto
        else if (item.description && item.description.trim()) {
          const existingProduct = products.find(
            (p: Product) =>
              p.description.toUpperCase() === item.description.toUpperCase() &&
              p.senderId === senderId
          );

          if (existingProduct) {
            productId = parseInt(existingProduct.id);
          } else {
            // Crear producto nuevo
            const newProduct = await SupabaseDB.createProduct({
              sender_id: senderIdNum,
              description: item.description,
              unit: item.unit,
              base_price: item.unitPrice,
              has_igv: item.hasIgv
            });
            productId = newProduct.id;
          }
        }

        return {
          product_id: productId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          has_igv: item.hasIgv,
          total: item.total
        };
      })
    );
  }

  /**
   * Procesar nota de crédito
   */
  static async processCreditNote(
    baseInvoice: Invoice,
    reason: CreditNoteReason,
    activeSenderId: string,
    senders: Sender[],
    clients: Client[]
  ): Promise<{ creditNote: Invoice; sender: Sender; client: Client; credentials: any }> {
    const sender = senders.find(s => s.id === activeSenderId);
    if (!sender) {
      throw new Error("Empresa no encontrada");
    }

    // Crear objeto de Nota de Crédito
    const series = 'NC01';
    const nextNumber = await SupabaseDB.getNextInvoiceNumber(activeSenderId, series);
    
    const creditNote: Invoice = {
      ...baseInvoice,
      id: Date.now().toString(),
      type: InvoiceType.NOTA_CREDITO,
      series,
      number: nextNumber,
      date: new Date().toISOString().split('T')[0],
      status: InvoiceStatus.PROCESANDO,
      referencedInvoiceId: `${baseInvoice.series}-${baseInvoice.number}`,
      creditNoteReason: reason,
      // Montos negativos para nota de crédito
      subtotal: -baseInvoice.subtotal,
      igv: -baseInvoice.igv,
      total: -baseInvoice.total,
      items: baseInvoice.items.map(item => ({
        ...item,
        quantity: -item.quantity,
        total: -item.total
      }))
    };

    // Buscar cliente
    const client = clients.find(c => c.id === baseInvoice.clientId) || {
      id: 'temp',
      senderId: activeSenderId,
      name: baseInvoice.clientName,
      dni: baseInvoice.clientDocument?.length === 8 ? baseInvoice.clientDocument : undefined,
      ruc: baseInvoice.clientDocument?.length === 11 ? baseInvoice.clientDocument : undefined
    };

    // Desencriptar credenciales SUNAT
    const sunatUser = sender.sunatUser ? await decrypt(sender.sunatUser) : '';
    const sunatPass = sender.sunatPass ? await decrypt(sender.sunatPass) : '';

    if (!sunatUser || !sunatPass) {
      throw new Error("Configura las credenciales SUNAT en tu perfil");
    }

    const credentials = {
      ruc: sender.ruc,
      usuario: sunatUser,
      password: sunatPass
    };

    return { creditNote, sender, client, credentials };
  }

  /**
   * Guardar nota de crédito en base de datos
   */
  static async saveCreditNote(creditNote: Invoice): Promise<any> {
    return await SupabaseDB.createInvoice(creditNote, creditNote.items);
  }

  /**
   * Actualizar estado de factura
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
    extra?: { pdf_base64?: string; sunat_message?: string }
  ): Promise<void> {
    await SupabaseDB.updateInvoiceStatus(invoiceId, status, extra);
  }
}