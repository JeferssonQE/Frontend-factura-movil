// services/utils/peruMobile.ts
// Espejo de normalize_peru_mobile (backend app/utils/validators.py): las dos capas
// tienen que aceptar y rechazar lo mismo, o el formulario deja pasar lo que la API rebota.

export const PERU_COUNTRY_CODE = '51';

export const PERU_MOBILE_ERROR = 'Celular inválido: deben ser 9 dígitos y empezar con 9';

/** 9 dígitos que empiezan con 9, o null si no es un celular peruano. */
export const normalizePeruMobile = (raw: string): string | null => {
  let digits = raw.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (digits.length === 11 && digits.startsWith(PERU_COUNTRY_CODE)) {
    digits = digits.slice(PERU_COUNTRY_CODE.length);
  }
  return /^9\d{8}$/.test(digits) ? digits : null;
};
