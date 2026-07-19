// config/sunatErrors.ts
export interface SunatErrorInfo {
  title: string;
  message: string;
}

const SUNAT_ERRORS: Record<string, SunatErrorInfo> = {
  login: {
    title: 'Credenciales SUNAT incorrectas',
    message: 'Tu usuario o clave SOL no funcionaron. Revísalos e intenta de nuevo.',
  },
  cliente: {
    title: 'No se pudo cargar el cliente',
    message: 'Revisa el DNI o RUC del cliente e intenta de nuevo.',
  },
  fecha: {
    title: 'Error con la fecha',
    message: 'SUNAT no aceptó la fecha del comprobante. Intenta de nuevo.',
  },
  productos: {
    title: 'Error al cargar los productos',
    message: 'Uno o más productos no se pudieron cargar en SUNAT. Intenta de nuevo.',
  },
  agregar_producto: {
    title: 'Error al cargar los productos',
    message: 'Uno o más productos no se pudieron cargar en SUNAT. Intenta de nuevo.',
  },
  validar_total: {
    title: 'El total no coincide',
    message: 'El monto no coincide con SUNAT. Revisa los importes e intenta de nuevo.',
  },
  completar_emision: {
    title: 'No se pudo confirmar en SUNAT',
    message: 'SUNAT no respondió al confirmar. Intenta de nuevo en unos segundos.',
  },
  obtener_numero: {
    title: 'Emitido, número no recibido',
    message: 'El comprobante pudo emitirse en SUNAT. Verifícalo en el portal antes de reintentar.',
  },
  descargar_pdf: {
    title: 'Emitido, PDF no disponible',
    message: 'El comprobante pudo emitirse en SUNAT. Verifícalo en el portal antes de reintentar.',
  },
};

const DEFAULT_ERROR: SunatErrorInfo = {
  title: 'No se pudo emitir',
  message: 'Ocurrió un problema al emitir en SUNAT. Intenta de nuevo en unos segundos.',
};

const normalizeStep = (step?: string | null): string =>
  (step ?? '').replace(/^(boleta|factura)_/, '');

export const getSunatError = (step?: string | null): SunatErrorInfo =>
  SUNAT_ERRORS[normalizeStep(step)] ?? DEFAULT_ERROR;
