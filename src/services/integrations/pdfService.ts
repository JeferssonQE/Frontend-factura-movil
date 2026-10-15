// services/pdfService.ts - Manejo de PDFs para compartir
import { normalizePeruMobile, PERU_COUNTRY_CODE } from '../utils/peruMobile';

export class PDFService {
  /**
   * Convierte base64 a blob y crea URL temporal
   */
  static createPDFUrl(base64: string): string {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    return URL.createObjectURL(blob);
  }

  /**
   * Descarga PDF directamente
   */
  static downloadPDF(base64: string, filename: string): void {
    const url = this.createPDFUrl(base64);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre PDF en nueva pestaña
   */
  static viewPDF(base64: string): void {
    const url = this.createPDFUrl(base64);
    window.open(url, '_blank');
  }

  /**
   * Convierte base64 a Blob
   */
  static base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mimeType });
  }

  /**
   * Convierte Blob a base64, sin el prefijo data:
   */
  static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Abre un link de terceros (proveedor del PDF, WhatsApp) sin darle acceso a esta
   * pestaña: sin `noopener`, la pagina abierta podria redirigir la app via `window.opener`.
   */
  static openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Arma el link de WhatsApp con el comprobante ya dentro del mensaje.
   * Sin celular, `wa.me/?text=` deja elegir el contacto en la propia app.
   */
  static buildWhatsAppUrl(
    invoice: {
      client_name?: string | null;
      series: string;
      number: string;
      total: number | string;
    },
    clientPhone: string,
    pdfUrl: string,
  ): string {
    const saludo = invoice.client_name ? `Hola ${invoice.client_name}, ` : 'Hola, ';
    const message =
      `${saludo}te envío tu comprobante ${invoice.series}-${invoice.number} ` +
      `por S/ ${Number(invoice.total).toFixed(2)}:\n${pdfUrl}`;

    const mobile = clientPhone ? normalizePeruMobile(clientPhone) : null;
    const recipient = mobile ? `${PERU_COUNTRY_CODE}${mobile}` : '';
    return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
  }
}
