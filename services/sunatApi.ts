// services/sunatApi.ts - Cliente para API SUNAT en Digital Ocean
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

interface NotaCreditoTipo {
  codigo: string;
  descripcion: string;
  uso: string;
}

// Códigos de tipo de nota de crédito
export const TIPOS_NOTA_CREDITO: NotaCreditoTipo[] = [
  { codigo: '01', descripcion: 'Anulación de la Operación', uso: 'Anular comprobante completo' },
  { codigo: '02', descripcion: 'Anulación por Error en el RUC', uso: 'RUC incorrecto en factura' },
  { codigo: '03', descripcion: 'Devolución Total', uso: 'Cliente devuelve todo' },
  { codigo: '04', descripcion: 'Corrección por error en descripción', uso: 'Error en descripción de producto' },
  { codigo: '05', descripcion: 'Devolución por ítem', uso: 'Cliente devuelve algunos productos' }
];

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
   */
  async emitir(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    credentials: SunatCredentials
  ): Promise<{ taskId: string }> {
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      console.log('🧪 MOCK MODE: Simulando emisión...', { 
        invoice: `${invoice.series}-${invoice.number}`, 
        items: items.length,
        credentials: { ...credentials, password: '***' }
      });
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
      id_remitente: invoice.id,
      credenciales: credentials
    };

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/emitir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.status !== 202) {
      const error = await response.text();
      throw new Error(`Error al enviar: ${error}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
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
    credentials: SunatCredentials,
    sustento: string = 'Nota de crédito por solicitud del cliente'
  ): Promise<{ taskId: string }> {
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      console.log('🧪 MOCK MODE: Simulando emisión de Nota de Crédito...', { 
        originalInvoice: `${originalInvoice.series}-${originalInvoice.number}`,
        creditNote: `${creditNote.series}-${creditNote.number}`,
        reason: creditNote.creditNoteReason,
        credentials: { ...credentials, password: '***' }
      });
      return { taskId: 'mock-nc-task-' + Date.now() };
    }

    const fecha = new Date(creditNote.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos: SunatProducto[] = items.map(item => ({
      cantidad: -item.quantity, // Negativo para nota de crédito
      unidad_medida: item.unit,
      descripcion: item.description,
      precio_base: item.unitPrice,
      igv: item.hasIgv ? 18 : 0,
      precio_total: -item.total // Negativo para nota de crédito
    }));

    const clienteData: { dni?: string; ruc?: string; nombre?: string } = {};
    if (originalInvoice.type === InvoiceType.FACTURA) {
      clienteData.ruc = client.ruc;
    } else {
      if (client.dni) clienteData.dni = client.dni;
      if (client.name) clienteData.nombre = client.name;
    }

    const request = {
      tipo_documento: 'NOTA_CREDITO',
      fecha_emision: fecha,
      tipo_nota: creditNote.creditNoteReason || '01',
      numero_documento_referencia: originalInvoice.number,
      serie_documento_referencia: originalInvoice.series,
      sustento: sustento,
      cliente: clienteData,
      productos,
      resumen: {
        serie: creditNote.series,
        numero: creditNote.number,
        sub_total: -creditNote.subtotal, // Negativo
        igv_total: -creditNote.igv, // Negativo
        total: -creditNote.total // Negativo
      },
      id_remitente: creditNote.id,
      credenciales: credentials
    };

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
          numero: '00001',
          total: 100,
          pdf: {
            filename: 'mock-boleta.pdf',
            content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzAwIFRkCihNT0NLIC0gQm9sZXRhIGRlIFBydWViYSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNwolJUVPRgo=',
            size: 500,
            mime_type: 'application/pdf',
            numero_comprobante: 'B001-00001'
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
      if (onStatusChange) onStatusChange(mockStatus);
      return mockStatus.result!;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < MAX_TIMEOUT) {
      const status = await this.getTaskStatus(taskId);
      
      if (onStatusChange) onStatusChange(status);

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
   * Emitir Nota de Crédito y esperar resultado (todo en uno)
   */
  async emitirNotaCreditoYEsperar(
    originalInvoice: Invoice,
    creditNote: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    credentials: SunatCredentials,
    sustento: string = 'Nota de crédito por solicitud del cliente',
    onStatusChange?: (status: TaskStatus) => void
  ): Promise<TaskResult> {
    const { taskId } = await this.emitirNotaCredito(
      originalInvoice, 
      creditNote, 
      items, 
      sender, 
      client, 
      credentials,
      sustento
    );
    
    // Simular delay en modo mock
    if (IS_MOCK_MODE) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Emitir y esperar resultado (todo en uno)
   */
  async emitirYEsperar(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    credentials: SunatCredentials,
    onStatusChange?: (status: TaskStatus) => void
  ): Promise<TaskResult> {
    const { taskId } = await this.emitir(invoice, items, sender, client, credentials);
    
    // Simular delay en modo mock
    if (IS_MOCK_MODE) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Validar datos sin emitir
   */
  async validate(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client,
    credentials: SunatCredentials
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const fecha = new Date(invoice.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos = items.map(item => ({
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
      id_remitente: invoice.id,
      credenciales: credentials
    };

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    return response.json();
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
   */
  async emitir(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client
  ): Promise<{ taskId: string }> {
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      console.log('🧪 MOCK MODE: Simulando emisión...', { invoice, items });
      return { taskId: 'mock-task-' + Date.now() };
    }

    // Obtener credenciales desencriptadas
    const credentials = await credentialsService.getCredentials(sender.ruc);
    if (!credentials) {
      throw new Error('Credenciales SUNAT no encontradas para RUC: ' + sender.ruc);
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
      id_remitente: invoice.id,
      credenciales: {
        ruc: credentials.ruc,
        usuario: credentials.usuario,
        password: credentials.password
      }
    };

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/emitir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.status !== 202) {
      const error = await response.text();
      throw new Error(`Error al enviar: ${error}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
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
      console.log('🧪 MOCK MODE: Simulando emisión de Nota de Crédito...', { 
        originalInvoice: `${originalInvoice.series}-${originalInvoice.number}`,
        creditNote: `${creditNote.series}-${creditNote.number}`,
        reason: creditNote.creditNoteReason
      });
      return { taskId: 'mock-nc-task-' + Date.now() };
    }

    // Obtener credenciales desencriptadas
    const credentials = await credentialsService.getCredentials(sender.ruc);
    if (!credentials) {
      throw new Error('Credenciales SUNAT no encontradas para RUC: ' + sender.ruc);
    }

    const fecha = new Date(creditNote.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos: SunatProducto[] = items.map(item => ({
      cantidad: -item.quantity, // Negativo para nota de crédito
      unidad_medida: item.unit,
      descripcion: item.description,
      precio_base: item.unitPrice,
      igv: item.hasIgv ? 18 : 0,
      precio_total: -item.total // Negativo para nota de crédito
    }));

    const clienteData: { dni?: string; ruc?: string; nombre?: string } = {};
    if (originalInvoice.type === InvoiceType.FACTURA) {
      clienteData.ruc = client.ruc;
    } else {
      if (client.dni) clienteData.dni = client.dni;
      if (client.name) clienteData.nombre = client.name;
    }

    const request = {
      tipo_documento: 'NOTA_CREDITO',
      fecha_emision: fecha,
      tipo_nota: creditNote.creditNoteReason || '01',
      numero_documento_referencia: originalInvoice.number,
      serie_documento_referencia: originalInvoice.series,
      sustento: sustento,
      cliente: clienteData,
      productos,
      resumen: {
        serie: creditNote.series,
        numero: creditNote.number,
        sub_total: -creditNote.subtotal, // Negativo
        igv_total: -creditNote.igv, // Negativo
        total: -creditNote.total // Negativo
      },
      id_remitente: creditNote.id,
      credenciales: {
        ruc: credentials.ruc,
        usuario: credentials.usuario,
        password: credentials.password
      }
    };

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
          numero: '00001',
          total: 100,
          pdf: {
            filename: 'mock-boleta.pdf',
            content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzAwIFRkCihNT0NLIC0gQm9sZXRhIGRlIFBydWViYSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNwolJUVPRgo=',
            size: 500,
            mime_type: 'application/pdf',
            numero_comprobante: 'B001-00001'
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
      if (onStatusChange) onStatusChange(mockStatus);
      return mockStatus.result!;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < MAX_TIMEOUT) {
      const status = await this.getTaskStatus(taskId);
      
      if (onStatusChange) onStatusChange(status);

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
   * Emitir Nota de Crédito y esperar resultado (todo en uno)
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
    const { taskId } = await this.emitirNotaCredito(
      originalInvoice, 
      creditNote, 
      items, 
      sender, 
      client, 
      sustento
    );
    
    // Simular delay en modo mock
    if (IS_MOCK_MODE) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Emitir y esperar resultado (todo en uno)
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
   * Validar datos sin emitir
   */
  async validate(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    // Obtener credenciales desencriptadas
    const credentials = await credentialsService.getCredentials(sender.ruc);
    if (!credentials) {
      return {
        valid: false,
        errors: ['Credenciales SUNAT no encontradas para RUC: ' + sender.ruc],
        warnings: []
      };
    }

    const fecha = new Date(invoice.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos = items.map(item => ({
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
      id_remitente: invoice.id,
      credenciales: {
        ruc: credentials.ruc,
        usuario: credentials.usuario,
        password: credentials.password
      }
    };

    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    return response.json();
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

export const SunatApiService = {
  /**
   * Health check de la API
   */
  async healthCheck(): Promise<{ status: string; selenium_ready: boolean }> {
    if (IS_MOCK_MODE) {
      return { status: 'healthy', selenium_ready: true };
    }
    
    const response = await authService.authenticatedRequest('/api/v1/health');
    if (!response.ok) throw new Error('API no disponible');
    return response.json();
  },

  /**
   * Emitir comprobante (usa autenticación del backend)
   */
  async emitir(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client
  ): Promise<{ taskId: string }> {
    // MODO MOCK - Simula sin emitir
    if (IS_MOCK_MODE) {
      console.log('🧪 MOCK MODE: Simulando emisión...', { invoice, items });
      return { taskId: 'mock-task-' + Date.now() };
    }

    // Preparar datos para el backend
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
      invoice_id: invoice.id
    };

    const response = await authService.authenticatedRequest('/api/v1/emitir', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    if (response.status !== 202) {
      const error = await response.text();
      throw new Error(`Error al enviar: ${error}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
  },

  /**
   * Emitir Nota de Crédito (usa autenticación del backend)
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
      console.log('🧪 MOCK MODE: Simulando emisión de Nota de Crédito...', { 
        originalInvoice: `${originalInvoice.series}-${originalInvoice.number}`,
        creditNote: `${creditNote.series}-${creditNote.number}`,
        reason: creditNote.creditNoteReason
      });
      return { taskId: 'mock-nc-task-' + Date.now() };
    }

    const fecha = new Date(creditNote.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos: SunatProducto[] = items.map(item => ({
      cantidad: -item.quantity, // Negativo para nota de crédito
      unidad_medida: item.unit,
      descripcion: item.description,
      precio_base: item.unitPrice,
      igv: item.hasIgv ? 18 : 0,
      precio_total: -item.total // Negativo para nota de crédito
    }));

    const clienteData: { dni?: string; ruc?: string; nombre?: string } = {};
    if (originalInvoice.type === InvoiceType.FACTURA) {
      clienteData.ruc = client.ruc;
    } else {
      if (client.dni) clienteData.dni = client.dni;
      if (client.name) clienteData.nombre = client.name;
    }

    const request = {
      tipo_documento: 'NOTA_CREDITO',
      fecha_emision: fecha,
      tipo_nota: creditNote.creditNoteReason || '01',
      numero_documento_referencia: originalInvoice.number,
      serie_documento_referencia: originalInvoice.series,
      sustento: sustento,
      cliente: clienteData,
      productos,
      resumen: {
        serie: creditNote.series,
        numero: creditNote.number,
        sub_total: -creditNote.subtotal, // Negativo
        igv_total: -creditNote.igv, // Negativo
        total: -creditNote.total // Negativo
      },
      credit_note_id: creditNote.id,
      original_invoice_id: originalInvoice.id
    };

    const response = await authService.authenticatedRequest('/api/v1/nota-credito', {
      method: 'POST',
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
   * Consultar estado de tarea
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
          numero: '00001',
          total: 100,
          pdf: {
            filename: 'mock-boleta.pdf',
            content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzAwIFRkCihNT0NLIC0gQm9sZXRhIGRlIFBydWViYSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNwolJUVPRgo=', // PDF mock válido
            size: 500,
            mime_type: 'application/pdf',
            numero_comprobante: 'B001-00001'
          }
        }
      };
    }

    const response = await authService.authenticatedRequest(`/api/v1/status/${taskId}`);
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
      if (onStatusChange) onStatusChange(mockStatus);
      return mockStatus.result!;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < MAX_TIMEOUT) {
      const status = await this.getTaskStatus(taskId);
      
      if (onStatusChange) onStatusChange(status);

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
   * Emitir Nota de Crédito y esperar resultado (todo en uno)
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
    const { taskId } = await this.emitirNotaCredito(
      originalInvoice, 
      creditNote, 
      items, 
      sender, 
      client, 
      sustento
    );
    
    // Simular delay en modo mock
    if (IS_MOCK_MODE) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return this.waitForTask(taskId, onStatusChange);
  },

  /**
   * Emitir y esperar resultado (todo en uno)
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
   * Validar datos sin emitir
   */
  async validate(
    invoice: Invoice,
    items: InvoiceItem[],
    sender: Sender,
    client: Client
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const fecha = new Date(invoice.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const productos = items.map(item => ({
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
      invoice_id: invoice.id
    };

    const response = await authService.authenticatedRequest('/api/v1/validate', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    return response.json();
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
