// services/business/lookupService.ts
import { apiClient } from '../core/apiClient';

export interface RucLookupResult {
  numero_documento: string;
  razon_social: string;
  estado?: string | null;
  condicion?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
}

export interface DniLookupResult {
  numero_documento: string;
  nombre_completo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
}

const lookupOrNull = async <T>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch {
    return null;
  }
};

export const lookupService = {
  lookupRuc(ruc: string): Promise<RucLookupResult | null> {
    return lookupOrNull(apiClient.get<RucLookupResult>(`/lookup/ruc/${ruc}`));
  },

  lookupDni(dni: string): Promise<DniLookupResult | null> {
    return lookupOrNull(apiClient.get<DniLookupResult>(`/lookup/dni/${dni}`));
  },
};
