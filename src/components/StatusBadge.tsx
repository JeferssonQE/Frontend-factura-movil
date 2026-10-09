import { CheckCircle2, Loader2 } from 'lucide-react';
import type React from 'react';
import { InvoiceStatus } from '../types';
import Badge, { type BadgeTone } from './ui/Badge';

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  [InvoiceStatus.EMITIDO]: 'success',
  [InvoiceStatus.PROCESANDO]: 'warning',
  [InvoiceStatus.FALLO]: 'danger',
  [InvoiceStatus.ELIMINADO]: 'danger',
  [InvoiceStatus.ANULADO]: 'neutral',
  [InvoiceStatus.BORRADOR]: 'neutral',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  [InvoiceStatus.EMITIDO]: 'Emitido',
  [InvoiceStatus.PROCESANDO]: 'Procesando',
  [InvoiceStatus.FALLO]: 'Fallo',
  [InvoiceStatus.ELIMINADO]: 'Eliminado',
  [InvoiceStatus.ANULADO]: 'Anulado',
  [InvoiceStatus.BORRADOR]: 'Borrador',
};

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => (
  <Badge tone={STATUS_TONE[status]}>
    {status === InvoiceStatus.EMITIDO && <CheckCircle2 size={12} />}
    {status === InvoiceStatus.PROCESANDO && <Loader2 size={12} className="animate-spin" />}
    <span className={status === InvoiceStatus.ELIMINADO ? 'line-through' : undefined}>
      {STATUS_LABEL[status]}
    </span>
  </Badge>
);

export default StatusBadge;
