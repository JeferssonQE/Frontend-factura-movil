import type React from 'react';

interface SaleSummaryProps {
  clientName: string;
  itemCount: number;
  gravada: number;
  exonerada: number;
  inafecta: number;
  igv: number;
  total: number;
}

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong = false,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="shrink-0 text-sm text-slate-500">{label}</span>
    <span
      className={`truncate text-sm ${strong ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}
    >
      {value}
    </span>
  </div>
);

const money = (amount: number): string => `S/ ${amount.toFixed(2)}`;

// Lo comparten los dos dialogos de confirmacion de Billing (emitir y guardar borrador).
// Las operaciones exoneradas e inafectas solo aparecen si la venta las tiene.
const SaleSummary: React.FC<SaleSummaryProps> = ({
  clientName,
  itemCount,
  gravada,
  exonerada,
  inafecta,
  igv,
  total,
}) => (
  <div className="mb-6 space-y-2 rounded-card bg-slate-50 p-4 text-left">
    <Row label="Cliente" value={clientName || '—'} />
    <Row label="Productos" value={String(itemCount)} />
    <Row label="Op. Gravadas" value={money(gravada)} />
    {exonerada > 0 && <Row label="Op. Exoneradas" value={money(exonerada)} />}
    {inafecta > 0 && <Row label="Op. Inafectas" value={money(inafecta)} />}
    <Row label="IGV (18%)" value={money(igv)} />
    <Row label="Total" value={money(total)} strong />
  </div>
);

export default SaleSummary;
