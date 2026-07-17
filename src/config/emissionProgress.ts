// config/emissionProgress.ts
export interface EmissionStepInfo {
  key: string;
  label: string;
  percent: number;
}

export const EMISSION_STEPS: EmissionStepInfo[] = [
  { key: 'recibido', label: 'Recibido', percent: 8 },
  { key: 'login', label: 'Conectando con SUNAT', percent: 22 },
  { key: 'cliente', label: 'Cargando cliente', percent: 42 },
  { key: 'productos', label: 'Cargando productos', percent: 68 },
  { key: 'validar_total', label: 'Validando total', percent: 85 },
  { key: 'completar_emision', label: 'Confirmando emisión', percent: 95 },
];

const DEFAULT_PROGRESS = { percent: 12, label: 'Procesando en SUNAT' };

export const emissionProgress = (
  currentStep?: string | null
): { percent: number; label: string } => {
  if (!currentStep) return DEFAULT_PROGRESS;
  const match = EMISSION_STEPS.find((step) => step.key === currentStep);
  return match ?? DEFAULT_PROGRESS;
};
