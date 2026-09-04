// config/sunatCredentials.ts
import type { SunatCredentialsStatus } from '../types';

export interface CredentialsVerdictCopy {
  title: string;
  message: string;
}

/**
 * Textos del veredicto de la verificacion de credenciales.
 *
 * Viven aqui porque los muestran tres pantallas distintas (onboarding, modal de
 * credenciales y el paso previo a emitir) y deben decir exactamente lo mismo.
 */
export const CREDENTIALS_VERDICT: Record<SunatCredentialsStatus, CredentialsVerdictCopy> = {
  VALIDA: {
    title: 'Conectado con SUNAT',
    message: 'Probamos tu acceso y funciona. Ya puedes emitir comprobantes.',
  },
  INVALIDA: {
    title: 'SUNAT rechazó el acceso',
    message:
      'Revisa tu usuario y clave SOL. Tras varios intentos fallidos SUNAT puede bloquear tu usuario, así que verifícalos en el portal antes de reintentar.',
  },
  PENDIENTE: {
    title: 'Guardadas sin verificar',
    message:
      'No pudimos comunicarnos con SUNAT ahora mismo. Puedes emitir: si SUNAT rechaza el acceso, el comprobante queda como fallido y lo reintentas.',
  },
};

export const CHECKING_CREDENTIALS_MESSAGE =
  'Estamos iniciando sesión en SUNAT con tus credenciales. Puede tomar unos segundos.';
