// services/pdfService.ts - Manejo de PDFs para compartir

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
   * Comparte el PDF usando la Web Share API nativa (móvil).
   * Retorna true si tuvo éxito, false si no está disponible (usar fallback).
   */
  static async shareNative(base64: string, filename: string, title?: string): Promise<boolean> {
    if (typeof navigator.share !== 'function') return false;
    try {
      const blob = this.base64ToBlob(base64);
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
      await navigator.share({ files: [file], title: title ?? filename });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Comparte por WhatsApp con instrucciones
   */
  static shareWhatsApp(invoice: any, clientPhone: string, pdfBase64?: string): void {
    const message = `Hola ${invoice.clientName},

📄 *Su comprobante electrónico está listo:*

• *Tipo:* ${invoice.type}
• *Número:* ${invoice.series}-${invoice.number}
• *Fecha:* ${invoice.date}
• *Monto Total:* S/ ${Number(invoice.total).toFixed(2)}

${pdfBase64 ? '💾 *El PDF se descargará automáticamente.* Por favor adjúntelo a este chat cuando se lo solicite.' : '📱 Puede solicitar el PDF si lo necesita.'}

✅ *Documento válido ante SUNAT*
🏢 Gracias por su preferencia.

_Mensaje automático de FactuMovil AI_`;

    // Descargar PDF si existe
    if (pdfBase64) {
      this.downloadPDF(pdfBase64, `${invoice.series}-${invoice.number}.pdf`);
    }
    
    // Abrir WhatsApp
    const phone = clientPhone?.replace(/\D/g, '') || '';
    let whatsappUrl;
    
    if (phone) {
      whatsappUrl = `https://wa.me/${phone.startsWith('51') ? phone : '51' + phone}?text=${encodeURIComponent(message)}`;
    } else {
      // Si no hay teléfono, abrir WhatsApp Web con el mensaje copiado
      whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 500); // Delay para que termine la descarga
  }
  
  /**
   * Copia enlace temporal del PDF (para compartir por otros medios)
   */
  static async copyPDFLink(base64: string): Promise<string> {
    // En producción, subirías a un servicio temporal como:
    // - Supabase Storage (público por 24h)
    // - Cloudinary
    // - AWS S3 con URL firmada
    
    // Por ahora, crear URL local temporal
    const url = this.createPDFUrl(base64);
    
    try {
      await navigator.clipboard.writeText(url);
      return url;
    } catch (error) {
      console.error('Error copiando enlace:', error);
      return url;
    }
  }
}