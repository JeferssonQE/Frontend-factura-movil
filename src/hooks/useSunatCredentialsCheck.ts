// hooks/useSunatCredentialsCheck.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { contadorService } from '../services/business/contadorService';
import { senderService } from '../services/business/senderService';
import type { SunatCredentialsStatus, SunatCredentialsValidation } from '../types';

const POLL_INTERVAL_MS = 3000;

export type CheckPhase = 'idle' | 'checking' | 'done' | 'error';

export interface CredentialsCheckState {
  phase: CheckPhase;
  status: SunatCredentialsStatus | null;
  message: string;
}

const INITIAL_STATE: CredentialsCheckState = { phase: 'idle', status: null, message: '' };

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifica contra el portal SUNAT las credenciales ya guardadas de la empresa.
 *
 * El backend encola un login de prueba y este hook consulta el veredicto hasta que
 * llega. La verificacion comparte cola con las emisiones, asi que la espera no esta
 * acotada: quien lo use debe ofrecer siempre una salida al usuario.
 *
 * `empresaUserId` distingue quien esta verificando: un contador no tiene sender propio,
 * asi que su verificacion pasa por la ruta que opera sobre la empresa asignada.
 */
export function useSunatCredentialsCheck(
  onFinished?: (status: SunatCredentialsStatus) => void,
  empresaUserId?: string,
) {
  const [state, setState] = useState<CredentialsCheckState>(INITIAL_STATE);
  const cancelled = useRef(false);
  // Ref, no state: StrictMode invoca el efecto de montaje dos veces seguidas, antes de
  // que React re-renderice. Un guard sobre `phase` veria el valor viejo en ambas llamadas
  // (closure obsoleto) y no evitaria el segundo login de prueba contra SUNAT.
  const running = useRef(false);

  // Por ref para que `check` no cambie de identidad con un callback inline: el gate de
  // emision lo dispara desde un useEffect y eso seria un bucle de verificaciones.
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  useEffect(() => cancel, [cancel]);

  const waitForVerdict = useCallback(
    async (taskId: string): Promise<SunatCredentialsValidation | null> => {
      while (!cancelled.current) {
        await sleep(POLL_INTERVAL_MS);
        if (cancelled.current) return null;

        const validation = empresaUserId
          ? await contadorService.getSunatCredentialsValidation(empresaUserId, taskId)
          : await senderService.getSunatCredentialsValidation(taskId);
        if (validation.finished) return validation;
      }
      return null;
    },
    [empresaUserId],
  );

  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    cancelled.current = false;
    setState({ phase: 'checking', status: null, message: '' });

    try {
      const { task_id } = empresaUserId
        ? await contadorService.startSunatCredentialsValidation(empresaUserId)
        : await senderService.startSunatCredentialsValidation();
      const validation = await waitForVerdict(task_id);
      if (!validation) return;

      setState({
        phase: 'done',
        status: validation.credentials_status,
        message: validation.message,
      });
      onFinishedRef.current?.(validation.credentials_status);
    } catch (error: any) {
      if (cancelled.current) return;
      setState({
        phase: 'error',
        status: null,
        message: error?.message || 'No pudimos verificar tus credenciales ahora mismo.',
      });
    } finally {
      running.current = false;
    }
  }, [waitForVerdict, empresaUserId]);

  const reset = useCallback(() => {
    cancel();
    setState(INITIAL_STATE);
  }, [cancel]);

  return { ...state, check, cancel, reset };
}
