// services/sunatApi.ts - Cliente para API SUNAT en Digital Ocean
import { z } from 'zod';
import { Invoice, InvoiceItem, Sender, Client, InvoiceType } from '../types';

// Configuración de tu API en Digital Ocean
const DIGITAL_OCEAN_API_URL = import.meta.env.VITE_DIGITAL_OCEAN_API_URL || 'https://tu-api.digitalocean.com';
const IS_MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
const POLL_INTERVAL = 3000; // 3 segundos
const MAX_TIMEOUT = 300000; // 5 minutos

export interface SunatCredentials {
  ruc: string;
  usuario: string;
  password: string;
}

interface SunatProducto {
  cantidad: number;
  unidad_medida: string;
  descripcion: string;
  precio_base: number;
  igv: number;
  precio_total: number;
}

interface TaskResult {
  success: boolean;
  message?: string;
  error?: string;
  serie?: string;
  numero?: string;
  total?: number;
  pdf?: {
    filename: string;
    content: string; // Base64
    size: number;
    mime_type: string;
    numero_comprobante: string;
  };
}

interface TaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: TaskResult;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}

// Códigos de tipo de nota de crédito
export const TIPOS_NOTA_CREDITO = [
  { codigo: '01', descripcion: 'Anulación de la Operación', uso: 'Anular comprobante completo' },
  { codigo: '02', descripcion: 'Anulación por Error en el RUC', uso: 'RUC incorrecto en factura' },
  { codigo: '03', descripcion: 'Devolución Total', uso: 'Cliente devuelve todo' },
  { codigo: '04', descripcion: 'Corrección por error en descripción', uso: 'Error en descripción de producto' },
  { codigo: '05', descripcion: 'Devolución por ítem', uso: 'Cliente devuelve algunos productos' }
];

// ✅ Esquema de validación para requests SUNAT
const sunatRequestSchema = z.object({
  tipo_documento: z.enum(['FACTURA', 'BOLETA']),
  fecha: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato de fecha inválido'),
  cliente: z.object({
    dni: z.string().optional(),
    ruc: z.string().optional(),
    nombre: z.string().optional(),
  }),
  productos: z.array(z.object({
    cantidad: z.number().positive('Cantidad debe ser positiva'),
    unidad_medida: z.string(),
    descripcion: z.string(),
    precio_base: z.number().nonnegative('Precio no puede ser negativo'),
    igv: z.number(),
    precio_total: z.number(),
  })),
  resumen: z.object({
    serie: z.string(),
    numero: z.string(),
    sub_total: z.number().nonnegative(),
    igv_total: z.number().nonnegative(),
    total: z.number().nonnegative(),
  }),
  sender_id: z.string().or(z.number()),
});

/**
 * Genera el sustento automáticamente basado en el tipo de nota
 */
export function getSustentoByTipoNota(tipoNota: string): string {
  const sustentos: { [key: string]: string } = {
    '01': 'Anulación de la operación por solicitud del cliente',
    '02': 'Anulación por error en el RUC del comprobante',
    '03': 'Devolución total de productos por parte del cliente',
    '04': 'Corrección por error en la descripción de productos',
    '05': 'Devolución parcial de productos por parte del cliente'
  };
  
  return sustentos[tipoNota] || 'Nota de crédito por solicitud del cliente';
}

export const SunatApiService = {
  /**
   * Health check de tu API en Digital Ocean
   */
  async healthCheck(): Promise<{ status: string; selenium_ready: boolean }> {
    if (IS_MOCK_MODE) {
      return { status: 'healthy', selenium_ready: true };
    }
    
    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/health`);
    if (!response.ok) throw new Error('API no disponible');
    return response.json();
  },

  /**
   * Emitir comprobante usando tu API de Digital Ocean
   * El backend obtendrá las credenciales SUNAT desde Supabase usando sender_id
   */
  async emitir(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client
  ): Promise<{ taskId: string }> {
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      // Preparar los mismos datos que se enviarían en producción
      const fecha = new Date(invoice.date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const productos: SunatProducto[] = items.map(item => ({
        cantidad: item.quantity,
        unidad_medida: item.unit,
        descripcion: item.description,
        precio_base: item.unitPrice,
        igv: item.hasIgv ? 18 : 0,
        precio_total: item.total
      }));

      const clienteData: { dni?: string; ruc?: string; nombre?: string } = {};
      if (invoice.type === InvoiceType.FACTURA) {
        clienteData.ruc = client.ruc;
      } else {
        if (client.dni) clienteData.dni = client.dni;
        if (client.name) clienteData.nombre = client.name;
      }

      const mockRequest = {
        tipo_documento: invoice.type === InvoiceType.FACTURA ? 'FACTURA' : 'BOLETA',
        fecha,
        cliente: clienteData,
        productos,
        resumen: {
          serie: invoice.series,
          numero: invoice.number,
          sub_total: invoice.subtotal,
          igv_total: invoice.igv,
          total: invoice.total
        },
        sender_id: sender.id // Solo enviamos el ID del sender
      };

      console.log('🧪 MOCK MODE: Simulando emisión...');
      console.log('📤 DATOS QUE SE ENVIARÍAN EN PRODUCCIÓN:', {
        endpoint: `${DIGITAL_OCEAN_API_URL}/api/v1/emitir`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: mockRequest
      });
      
      console.log('📋 DETALLES DEL REQUEST (MOCK):');
      console.log('- Tipo:', mockRequest.tipo_documento);
      console.log('- Fecha:', mockRequest.fecha);
      console.log('- Cliente:', mockRequest.cliente);
      console.log('- Productos:', mockRequest.productos);
      console.log('- Resumen:', mockRequest.resumen);
      console.log('- Sender ID:', mockRequest.sender_id, '(Backend obtendrá credenciales desde Supabase)');
      
      // Mostrar diferencias específicas según el tipo
      if (invoice.type === InvoiceType.FACTURA) {
        console.log('🏢 FACTURA DETECTADA:');
        console.log('  - Cliente debe tener RUC:', client.ruc);
        console.log('  - Serie típica: F001, F002, etc.');
      } else {
        console.log('🧾 BOLETA DETECTADA:');
        console.log('  - Cliente puede tener DNI:', client.dni);
        console.log('  - Cliente nombre:', client.name);
        console.log('  - Serie típica: B001, B002, etc.');
      }
      
      return { taskId: 'mock-task-' + Date.now() };
    }

    // Preparar datos para tu API de Digital Ocean
    const fecha = new Date(invoice.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos: SunatProducto[] = items.map(item => ({
      cantidad: item.quantity,
      unidad_medida: item.unit,
      descripcion: item.description,
      precio_base: item.unitPrice,
      igv: item.hasIgv ? 18 : 0,
      precio_total: item.total
    }));

    const clienteData: { dni?: string; ruc?: string; nombre?: string } = {};
    if (invoice.type === InvoiceType.FACTURA) {
      clienteData.ruc = client.ruc;
    } else {
      if (client.dni) clienteData.dni = client.dni;
      if (client.name) clienteData.nombre = client.name;
    }

    const request = {
      tipo_documento: invoice.type === InvoiceType.FACTURA ? 'FACTURA' : 'BOLETA',
      fecha,
      cliente: clienteData,
      productos,
      resumen: {
        serie: invoice.series,
        numero: invoice.number,
        sub_total: invoice.subtotal,
        igv_total: invoice.igv,
        total: invoice.total
      },
      sender_id: sender.id // Solo enviamos el ID del sender, el backend obtiene las credenciales
    };

    // 📤 LOG: Mostrar exactamente qué se envía al endpoint
    console.log('📤 ENVIANDO A DIGITAL OCEAN API:', {
      endpoint: `${DIGITAL_OCEAN_API_URL}/api/v1/emitir`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request
    });
    
    console.log('📋 DETALLES DEL REQUEST:');
    console.log('- Tipo:', request.tipo_documento);
    console.log('- Fecha:', request.fecha);
    console.log('- Cliente:', request.cliente);
    console.log('- Productos:', request.productos);
    console.log('- Resumen:', request.resumen);
    console.log('- Sender ID:', request.sender_id, '(Backend obtendrá credenciales desde Supabase)');

    // ✅ Validar request antes de enviar
    const validation = sunatRequestSchema.safeParse(request);
    if (!validation.success) {
      throw new Error(`Request inválido: ${validation.error.issues[0].message}`);
    }

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/emitir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data)
    });

    if (response.status !== 202) {
      const error = await response.text();
      throw new Error(`Error al enviar: ${error}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
  },

  /**
   * Consultar estado de tarea en tu API de Digital Ocean
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // MODO MOCK
    if (IS_MOCK_MODE) {
      return {
        task_id: taskId,
        status: 'completed',
        result: {
          success: true,
          message: 'BOLETA emitida correctamente (MOCK)',
          serie: 'B001',
          numero: '00020',
          total: 100,
          pdf: {
            filename: 'mock-boleta.pdf',
            content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzAwIFRkCihNT0NLIC0gQm9sZXRhIGRlIFBydWViYSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNwolJUVPRgo=',
            size: 500,
            mime_type: 'application/pdf',
            numero_comprobante: 'B001-00020'
          }
        }
      };
    }

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/status/${taskId}`);
    if (!response.ok) throw new Error('Error consultando estado');
    return response.json();
  },

  /**
   * Esperar a que una tarea se complete (polling)
   */
  async waitForTask(
    taskId: string,
    onStatusChange?: (status: TaskStatus) => void
  ): Promise<TaskResult> {
    // MODO MOCK - Retorna inmediatamente
    if (IS_MOCK_MODE) {
      const mockStatus = await this.getTaskStatus(taskId);
      if (onStatusChange && typeof onStatusChange === 'function') {
        onStatusChange(mockStatus);
      }
      return mockStatus.result!;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < MAX_TIMEOUT) {
      const status = await this.getTaskStatus(taskId);
      
      if (onStatusChange && typeof onStatusChange === 'function') {
        onStatusChange(status);
      }

      if (status.status === 'completed') {
        return status.result!;
      }

      if (status.status === 'failed') {
        throw new Error(status.result?.error || 'Error desconocido');
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error('Timeout: La operación tardó demasiado');
  },

  /**
   * Emitir y esperar resultado (todo en uno)
   * El backend obtendrá las credenciales SUNAT desde Supabase usando sender_id
   */
  async emitirYEsperar(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    onStatusChange?: (status: TaskStatus) => void
  ): Promise<TaskResult> {
    const { taskId } = await this.emitir(invoice, items, sender, client);
    
    // Simular delay en modo mock
    if (IS_MOCK_MODE) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Emitir Nota de Crédito y esperar resultado (todo en uno)
   * El backend obtendrá las credenciales SUNAT desde Supabase usando sender_id
   */
  async emitirNotaCreditoYEsperar(
    originalInvoice: Invoice,
    creditNote: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    sustento: string = 'Nota de crédito por solicitud del cliente',
    onStatusChange?: (status: TaskStatus) => void
  ): Promise<TaskResult> {
    // MODO MOCK para nota de crédito
    if (IS_MOCK_MODE) {
      // Preparar los mismos datos que se enviarían en producción
      const tipoNota = creditNote.creditNoteReason || '01';
      const sustentoAutomatico = getSustentoByTipoNota(tipoNota);
      
      const mockRequest = {
        fecha_emision: new Date(creditNote.date).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        tipo_nota: tipoNota,
        numero_boleta: `${originalInvoice.series}-${originalInvoice.number}`,
        sustento: sustentoAutomatico,
        sender_id: sender.id
      };

      console.log('🧪 MOCK MODE: Simulando emisión de Nota de Crédito...');
      console.log('📤 DATOS QUE SE ENVIARÍAN A NOTA DE CRÉDITO EN PRODUCCIÓN:', {
        endpoint: `${DIGITAL_OCEAN_API_URL}/api/v1/nota-credito`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: mockRequest
      });
      
      console.log('📋 DETALLES DEL REQUEST NOTA DE CRÉDITO (MOCK):');
      console.log('- Fecha emisión:', mockRequest.fecha_emision);
      console.log('- Tipo nota:', mockRequest.tipo_nota);
      console.log('- Número boleta/factura:', mockRequest.numero_boleta);
      console.log('- Sustento:', mockRequest.sustento);
      console.log('- Sender ID:', mockRequest.sender_id);
      
      // Simular delay
      await new Promise(r => setTimeout(r, 2000));
      
      return {
        success: true,
        message: 'NOTA DE CRÉDITO emitida correctamente (MOCK)',
        serie: creditNote.series,
        numero: creditNote.number,
        total: creditNote.total,
        pdf: {
          filename: `mock-nc-${creditNote.series}-${creditNote.number}.pdf`,
          content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzAwIFRkCihNT0NLIC0gTm90YSBkZSBDcsOpZGl0bykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNwolJUVPRgo=',
          size: 500,
          mime_type: 'application/pdf',
          numero_comprobante: `${creditNote.series}-${creditNote.number}`
        }
      };
    }

    // Modo producción - usar la función real
    const { taskId } = await this.emitirNotaCredito(
      originalInvoice, 
      creditNote, 
      items, 
      sender, 
      client, 
      sustento
    );
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Emitir Nota de Crédito usando tu API de Digital Ocean
   */
  async emitirNotaCredito(
    originalInvoice: Invoice,
    creditNote: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    sustento: string = 'Nota de crédito por solicitud del cliente'
  ): Promise<{ taskId: string }> {
    
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      const tipoNota = creditNote.creditNoteReason || '01';
      const sustentoAutomatico = getSustentoByTipoNota(tipoNota);
      
      const mockRequest = {
        fecha_emision: new Date(creditNote.date).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        tipo_nota: tipoNota,
        numero_boleta: `${originalInvoice.series}-${originalInvoice.number}`,
        sustento: sustentoAutomatico,
        sender_id: sender.id
      };

      console.log('🧪 MOCK MODE: Simulando emisión de Nota de Crédito...');
      console.log('📤 DATOS QUE SE ENVIARÍAN A NOTA DE CRÉDITO EN PRODUCCIÓN:', {
        endpoint: `${DIGITAL_OCEAN_API_URL}/api/v1/nota-credito`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: mockRequest
      });
      
      console.log('📋 DETALLES DEL REQUEST NOTA DE CRÉDITO (MOCK):');
      console.log('- Fecha emisión:', mockRequest.fecha_emision);
      console.log('- Tipo nota:', mockRequest.tipo_nota);
      console.log('- Número boleta/factura:', mockRequest.numero_boleta);
      console.log('- Sustento:', mockRequest.sustento);
      console.log('- Sender ID:', mockRequest.sender_id);
      
      return { taskId: 'mock-nc-task-' + Date.now() };
    }

    // Preparar datos simplificados para tu API de Digital Ocean
    const tipoNota = creditNote.creditNoteReason || '01';
    const sustentoAutomatico = getSustentoByTipoNota(tipoNota);
    
    const request = {
      fecha_emision: new Date(creditNote.date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      tipo_nota: tipoNota,
      numero_boleta: `${originalInvoice.series}-${originalInvoice.number}`,
      sustento: sustentoAutomatico,
      sender_id: sender.id
    };

    // 📤 LOG: Mostrar exactamente qué se envía al endpoint de nota de crédito
    console.log('📤 ENVIANDO NOTA DE CRÉDITO A DIGITAL OCEAN API:', {
      endpoint: `${DIGITAL_OCEAN_API_URL}/api/v1/nota-credito`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request
    });
    
    console.log('📋 DETALLES DEL REQUEST NOTA DE CRÉDITO:');
    console.log('- Fecha emisión:', request.fecha_emision);
    console.log('- Tipo nota:', request.tipo_nota);
    console.log('- Número boleta/factura:', request.numero_boleta);
    console.log('- Sustento:', request.sustento);
    console.log('- Sender ID:', request.sender_id);

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/nota-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.status !== 202) {
      const error = await response.text();
      throw new Error(`Error al enviar Nota de Crédito: ${error}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
  },

  /**
   * Descargar PDF desde Base64
   */
  downloadPdf(pdfBase64: string, filename: string) {
    const byteCharacters = atob(pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Abrir PDF en nueva pestaña
   */
  openPdf(pdfBase64: string) {
    const byteCharacters = atob(pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};