// services/business/unitsService.ts
import { apiClient } from '../core/apiClient';

type UnitsResponse = {
  units: Array<{ name: string }>;
};

export const unitsService = {
  /** Las unidades validas, en el orden en que se muestran. */
  async getUnits(): Promise<string[]> {
    const response = await apiClient.get<UnitsResponse>('/units');
    return response.units.map((unit) => unit.name);
  },
};
