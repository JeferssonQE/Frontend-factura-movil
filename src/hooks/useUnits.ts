// hooks/useUnits.ts
import { useEffect, useState } from 'react';
import { unitsService } from '../services/business/unitsService';

/**
 * El catalogo de unidades, pedido al backend en vez de copiado.
 *
 * Estaba escrito tres veces -Factu API, el backend y aqui- y las copias ya se habian
 * separado: al frontend le faltaban SERVICIO, QUINTAL y SACO, y le sobraba PIE TABLAR, que
 * no se puede emitir. Una lista copiada no se nota mal hasta que alguien emite.
 *
 * Se guarda en memoria del modulo, no por componente: es el mismo catalogo para todos, no
 * depende de la empresa y cambia una vez al ano. Se pide una sola vez por sesion.
 */
let cache: string[] | null = null;
let inFlight: Promise<string[]> | null = null;

const load = (): Promise<string[]> => {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = unitsService
      .getUnits()
      .then((units) => {
        cache = units;
        return units;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

export type UnitsState = {
  units: string[];
  isLoading: boolean;
  /** No hay lista de repuesto a proposito: una copia local es justo lo que esto elimina. */
  failed: boolean;
};

export const useUnits = (): UnitsState => {
  const [units, setUnits] = useState<string[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(cache === null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cache) return;

    let alive = true;
    load()
      .then((fetched) => {
        if (alive) setUnits(fetched);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { units, isLoading, failed };
};

/** Para quien necesita la lista fuera de un componente (la fusion de lo que extrae la IA). */
export const cachedUnits = (): string[] => cache ?? [];
