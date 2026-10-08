// hooks/useEmissionUsage.ts
import { useCallback, useEffect, useState } from 'react';
import { senderService } from '../services/business/senderService';
import type { EmissionUsage } from '../types';

/**
 * Cuanto lleva emitido la empresa este mes contra el limite de su plan.
 *
 * Lo cuenta el backend con la misma funcion de la base que aplica el bloqueo, asi que la
 * pantalla y el bloqueo no pueden decir cosas distintas. Aqui no se resta nada ni se lleva
 * un contador propio: se pide y se pinta.
 *
 * Se vuelve a pedir despues de emitir, que es lo unico que lo mueve.
 */
export const useEmissionUsage = (
  senderId?: number,
): {
  usage: EmissionUsage | null;
  refresh: () => Promise<void>;
} => {
  const [usage, setUsage] = useState<EmissionUsage | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUsage(await senderService.getEmissionUsage(senderId));
    } catch {
      // Es informativo: si no se puede leer, no se muestra. Lo que no se puede fallar es el
      // bloqueo, y ese lo decide el backend al emitir.
      setUsage(null);
    }
  }, [senderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { usage, refresh };
};
