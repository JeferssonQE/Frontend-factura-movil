// views/Dashboard.tsx

import { FileText, type LucideIcon, ShoppingBag, Target, TrendingUp, Zap } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type {
  DashboardSummary,
  IgvSummary,
  SalesByMonthItem,
} from '../services/business/reportsService';
import { type Invoice, InvoiceType, type Sender } from '../types';

interface DashboardProps {
  invoices: Invoice[];
  activeSender: Sender | null;
  summary: DashboardSummary | null;
  salesByMonth: SalesByMonthItem[];
  igvSummary: IgvSummary | null;
  onEmit: () => void;
  onHistory: () => void;
}

type ActiveCard = 'igv' | 'total' | null;

// Recharts pinta SVG con valores literales, no clases: estos hex son los tokens accent y
// slate de index.css.
const CHART_HIGHLIGHT = '#2b7fff';
const CHART_MUTED = '#e2e8f0';
const CHART_GRID = '#f1f5f9';
const CHART_AXIS_TEXT = '#64748b';

interface StatTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}

const StatTile: React.FC<StatTileProps> = ({
  icon: Icon,
  iconClassName,
  label,
  value,
  active = false,
  onClick,
}) => {
  const content = (
    <>
      <div
        className={`mb-3 flex size-10 items-center justify-center rounded-control ${iconClassName}`}
      >
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <p className="mb-1 text-xs leading-tight text-slate-500">{label}</p>
      <p className="break-words text-sm font-bold text-slate-900">{value}</p>
    </>
  );
  const baseClasses = 'flex flex-col items-center rounded-card border p-3 text-center';

  if (!onClick) {
    return <div className={`${baseClasses} border-slate-200 bg-white`}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${baseClasses} bg-white transition ${
        active ? 'border-accent' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {content}
    </button>
  );
};

const DetailRow: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong = false,
}) => (
  <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
    <span className={`text-sm ${strong ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
      {label}
    </span>
    <span
      className={`text-sm ${strong ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}
    >
      {value}
    </span>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  activeSender,
  summary,
  salesByMonth,
  igvSummary,
  onEmit,
  onHistory,
}) => {
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);

  const handleCardClick = (card: ActiveCard) => {
    setActiveCard((prev) => (prev === card ? null : card));
  };

  const formatMonthLabel = (monthIso: string): string =>
    new Date(`${monthIso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', {
      month: 'short',
      year: '2-digit',
    });

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // Datos para el gráfico: preferir API (orden cronológico), caer en local
  const chartData =
    salesByMonth.length > 0
      ? [...salesByMonth]
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-7)
          .map((item) => ({
            name: formatMonthLabel(item.month),
            total: Number(item.total_sales),
            isCurrent: item.month.slice(0, 7) === currentMonthKey,
          }))
      : invoices.slice(-7).map((inv) => ({
          name: new Date(inv.invoice_date).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
          }),
          total: Number(inv.total),
          isCurrent: false,
        }));

  const currentBarIndex = chartData.findIndex((point) => point.isCurrent);
  const highlightIndex = currentBarIndex === -1 ? chartData.length - 1 : currentBarIndex;

  const statusSummary = summary
    ? [
        {
          label: 'Emitidos',
          value: summary.emitted_invoices,
          classes: 'bg-success/10 text-success',
        },
        {
          label: 'Procesando',
          value: summary.pending_invoices,
          classes: 'bg-warning/10 text-warning',
        },
        { label: 'Fallidos', value: summary.failed_invoices, classes: 'bg-danger/10 text-danger' },
      ]
    : [];

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-card bg-primary p-6 text-white">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-white/70">Emisor activo</p>
            <h2 className="text-2xl font-bold leading-tight">
              {activeSender?.name || 'Configura tu empresa'}
            </h2>
            <p className="mt-1 text-sm text-white/70">RUC: {activeSender?.ruc || '-'}</p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-white/10">
            <Target className="text-white" size={24} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={onEmit}>
            Nueva venta
          </Button>
          <Button variant="outline" className="flex-1" onClick={onHistory}>
            Historial
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={FileText}
          iconClassName="bg-accent/10 text-accent"
          label="Tickets del mes"
          value={String(igvSummary?.invoice_count ?? 0)}
        />
        <StatTile
          icon={Zap}
          iconClassName="bg-primary/10 text-primary"
          label="IGV del mes"
          value={igvSummary ? `S/ ${igvSummary.total_igv.toFixed(2)}` : '—'}
          active={activeCard === 'igv'}
          onClick={() => handleCardClick('igv')}
        />
        <StatTile
          icon={Target}
          iconClassName="bg-success/10 text-success"
          label="Total ventas"
          value={igvSummary ? `S/ ${igvSummary.total_ventas.toFixed(2)}` : '—'}
          active={activeCard === 'total'}
          onClick={() => handleCardClick('total')}
        />
      </div>

      {activeCard === 'igv' && igvSummary && (
        <Card className="px-5 py-3">
          <DetailRow label="Base imponible" value={`S/ ${igvSummary.total_sin_igv.toFixed(2)}`} />
          <DetailRow label="IGV 18%" value={`S/ ${igvSummary.total_igv.toFixed(2)}`} />
          <DetailRow
            label="Total facturado"
            value={`S/ ${igvSummary.total_ventas.toFixed(2)}`}
            strong
          />
        </Card>
      )}

      {activeCard === 'total' && salesByMonth.length > 0 && (
        <Card className="px-5 py-3">
          {salesByMonth.slice(-4).map((item) => (
            <DetailRow
              key={item.month}
              label={new Date(item.month).toLocaleDateString('es-PE', {
                month: 'long',
                year: 'numeric',
              })}
              value={`S/ ${Number(item.total_sales).toFixed(2)}`}
            />
          ))}
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {statusSummary.map((status) => (
            <div key={status.label} className={`rounded-card p-3 text-center ${status.classes}`}>
              <p className="text-xl font-bold">{status.value}</p>
              <p className="mt-0.5 text-xs font-medium">{status.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-900">Actividad reciente</h3>
          <p className="mt-0.5 text-sm text-slate-500">Ventas por período</p>
        </div>

        <div className="w-full min-w-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={CHART_GRID} />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_AXIS_TEXT, fontWeight: 600 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value) => [`S/ ${Number(value).toFixed(2)}`, 'Ventas']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={32}>
                  {chartData.map((point, index) => (
                    <Cell
                      key={`cell-${point.name}`}
                      fill={index === highlightIndex ? CHART_HIGHLIGHT : CHART_MUTED}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <ShoppingBag size={40} className="mb-3 text-slate-300" />
              <p className="text-sm">Aún no hay ventas que mostrar.</p>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-slate-900">Últimas operaciones</h3>
          <button
            type="button"
            onClick={onHistory}
            className="flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-primary"
          >
            Ver todo <TrendingUp size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {invoices.length > 0 ? (
            invoices
              .slice()
              .reverse()
              .slice(0, 5)
              .map((inv) => (
                <Card key={inv.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-control ${
                        inv.invoice_type === InvoiceType.BOLETA
                          ? 'bg-accent/10 text-accent'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {inv.client_name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={inv.status} />
                        <span className="text-xs text-slate-500">{inv.invoice_date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      S/ {Number(inv.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {inv.series}-{inv.number}
                    </p>
                  </div>
                </Card>
              ))
          ) : (
            <Card dashed className="p-10 text-center">
              <p className="text-sm text-slate-500">Comienza a vender para ver tu historial.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
