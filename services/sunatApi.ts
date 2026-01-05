// services/sunatApi.ts - Cliente para API SUNAT (Selenium Backend)
import { Invoice, InvoiceItem, Sender, Client, InvoiceType } from '../types';

// URL de producción (cambiar cuando esté listo para emitir real)
// const API_BASE_URL = 'https://goldfish-app-7uiin.ondigitalocean.app';

// URL de prueba (mock) - NO emite documentos reales
const API_BASE_URL = 'https://mock-sunat-api.example.com';
const IS_MOCK_MODE = true; // Cambiar a false para producción
const POLL_INTERVAL = 5000; // 5 segundos
const MAX_TIMEOUT = 300000; // 5 minutos

interface SunatCredentials {
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

interface SunatEmitirRequest {
  tipo_documento: 'BOLETA' | 'FACTURA';
  fecha: string;
  cliente: { dni?: string; ruc?: string; nombre?: string };
  productos: SunatProducto[];
  resumen: {
    serie: string;
    numero: string;
    sub_total: number;
    igv_total: number;
    total: number;
  };
  id_remitente: string;
  credenciales: SunatCredentials;
}

interface SunatNotaCreditoRequest {
  fecha_emision: string;
  tipo_nota: string;
  numero_boleta: string;
  sustento: string;
  credenciales: SunatCredentials;
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

export const SunatApiService = {
  /**
   * Health check de la API
   */
  async healthCheck(): Promise<{ status: string; selenium_ready: boolean }> {
    if (IS_MOCK_MODE) {
      return { status: 'healthy', selenium_ready: true };
    }
    const response = await fetch(`${API_BASE_URL}/api/v1/health`);
    if (!response.ok) throw new Error('API no disponible');
    return response.json();
  },

  /**
   * Emitir Boleta o Factura (MOCK o REAL)
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
      console.log('🧪 MOCK MODE: Simulando emisión...', { invoice, items, credentials: { ...credentials, password: '***' } });
      return { taskId: 'mock-task-' + Date.now() };
    }

    // MODO REAL - Llama a la API
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

    const request: SunatEmitirRequest = {
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

    const response = await fetch(`${API_BASE_URL}/api/v1/emitir`, {
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

    const response = await fetch(`${API_BASE_URL}/api/v1/status/${taskId}`);
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
    // Construir request igual que emitir
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

    const response = await fetch(`${API_BASE_URL}/api/v1/validate`, {
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
