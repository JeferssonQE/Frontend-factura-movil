// views/History.tsx

import {
  ArrowDownLeft,
  ArrowLeftRight,
  CornerUpLeft,
  Download,
  FileCode,
  FileText,
  FileX,
  Loader2,
  type LucideIcon,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Notice from '../components/ui/Notice';
import SegmentedControl from '../components/ui/SegmentedControl';
import { pdfCache } from '../services/business/pdfCache';
import { PDFService } from '../services/integrations/pdfService';
import { CreditNoteReason, type Invoice, InvoiceStatus, InvoiceType } from '../types';

// Lo que dice el comprobante cuando nadie se identifico. Es el relleno que SUNAT
// admite en boletas de menos de S/ 700, asi que es la verdad y no un placeholder.
const SIN_COMPRADOR = 'CLIENTE VARIOS';

// Encendido el 2026-10-12. El flujo de anulación ya está completo de punta a punta:
// baja dentro de los 7 días de SUNAT, nota de crédito pasado ese plazo, y la pantalla
// avisa cuál se usará antes de confirmar. El camino de WhatsApp de abajo se queda como
// escape por si hay que apagarlo.
const NOTA_CREDITO_ENABLED = true;

const SOPORTE_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP ?? '51963376546';

const buildSoporteWhatsappUrl = (invoice: Invoice): string => {
  const mensaje = [
    'Hola, necesito anular un comprobante:',
    `• Documento: ${invoice.series}-${invoice.number} (ID ${invoice.id})`,
    `• Cliente: ${invoice.client_name ?? SIN_COMPRADOR}`,
    `• Total: S/ ${Number(invoice.total).toFixed(2)}`,
    `• Fecha: ${invoice.invoice_date}`,
  ].join('\n');
  return `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
};

interface HistoryProps {
  invoices: Invoice[];
  activeSenderId?: number | null;
  onEmitCreditNote: (baseInvoice: Invoice, reason: CreditNoteReason) => void;
  onVoidInvoice: (invoice: Invoice, reason: string) => void;
  onEmitDraft: (invoiceId: number) => Promise<void>;
  onDeleteInvoice: (invoiceId: number) => Promise<void>;
  onRefresh: () => void;
}

// Un FALLO solo puede significar una cosa: el comprobante no llego a SUNAT. El porque lo
// dice `sunat_message`, que el backend redacta para que el usuario lo lea.
//
// Aqui vivia un mapa con un caso por cada paso del scraper -login, cargar cliente, validar
// total, descargar PDF-. Con el scraper retirado el proveedor dejo de reportar pasos, el
// mapa caia siempre en "Error inesperado", y el mensaje de verdad quedaba escondido abajo
// como "detalle tecnico".
const FALLO_TITULO = 'No se emitió';
const FALLO_AYUDA = 'El comprobante no llegó a SUNAT. Puedes volver a intentarlo.';

type TypeFilter = 'ALL' | InvoiceType;

const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  [InvoiceType.BOLETA]: 'Boleta',
  [InvoiceType.FACTURA]: 'Factura',
  [InvoiceType.NOTA_CREDITO]: 'Nota de crédito',
};

const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: InvoiceType.BOLETA, label: 'Boletas' },
  { value: InvoiceType.FACTURA, label: 'Facturas' },
  ...(NOTA_CREDITO_ENABLED ? [{ value: InvoiceType.NOTA_CREDITO, label: 'Notas de crédito' }] : []),
];

const CREDIT_NOTE_REASONS = [
  { id: CreditNoteReason.ANULACION_OPERACION, label: 'Anulación de operación' },
  { id: CreditNoteReason.ANULACION_ERROR_RUC, label: 'Error en el RUC' },
  { id: CreditNoteReason.CORRECCION_ERROR_DESCRIPCION, label: 'Error en descripción' },
  { id: CreditNoteReason.DEVOLUCION_TOTAL, label: 'Devolución total' },
];

const TYPE_ICON_CLASSES: Record<InvoiceType, string> = {
  [InvoiceType.BOLETA]: 'bg-accent/10 text-accent',
  [InvoiceType.FACTURA]: 'bg-primary/10 text-primary',
  [InvoiceType.NOTA_CREDITO]: 'bg-warning/10 text-warning',
};

/** Gira mientras el proveedor responde.
 *
 * Antes marcaba un porcentaje, que salia del paso que reportaba el scraper mientras
 * navegaba el portal. Factu API responde de una vez: no hay avance que medir, y un
 * porcentaje inventado dice algo que nadie sabe.
 */
const ProcessingRing: React.FC = () => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative size-12 shrink-0">
      <svg className="size-12 animate-spin" viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          className="stroke-slate-200"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          className="stroke-accent"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference}`}
        />
      </svg>
    </div>
  );
};

type TileTone = 'primary' | 'neutral' | 'success';

const TILE_TONE_CLASSES: Record<TileTone, string> = {
  primary: 'bg-accent text-white',
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-success/10 text-success',
};

interface ActionTileProps {
  icon: LucideIcon;
  label: string;
  tone: TileTone;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

const ActionTile: React.FC<ActionTileProps> = ({
  icon: Icon,
  label,
  tone,
  loading,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-control text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${TILE_TONE_CLASSES[tone]} ${
      loading ? 'cursor-wait' : ''
    }`}
  >
    {loading ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
    {label}
  </button>
);

const AmountRow: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between text-sm text-white/70">
    <span>{label}</span>
    <span>S/ {amount.toFixed(2)}</span>
  </div>
);

const History: React.FC<HistoryProps> = ({
  invoices,
  activeSenderId,
  onEmitCreditNote,
  onVoidInvoice,
  onEmitDraft,
  onDeleteInvoice,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoicePdf, setSelectedInvoicePdf] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showReasonSelect, setShowReasonSelect] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState('');
  const [isEmittingDraft, setIsEmittingDraft] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  useEffect(() => {
    if (!selectedInvoice) {
      setSelectedInvoicePdf(null);
      return;
    }
    const id = selectedInvoice.id;
    if (pdfCache.has(id)) {
      setSelectedInvoicePdf(pdfCache.get(id));
      setIsPdfLoading(false);
      return;
    }
    setSelectedInvoicePdf(null);
    setIsPdfLoading(true);
    let cancelled = false;
    pdfCache
      .load(id, activeSenderId ?? undefined)
      .then((base64) => {
        if (!cancelled) setSelectedInvoicePdf(base64);
      })
      .catch(() => {
        if (!cancelled) setSelectedInvoicePdf(null);
      })
      .finally(() => {
        if (!cancelled) setIsPdfLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedInvoice?.id, activeSenderId]);

  useEffect(() => {
    if (!selectedInvoice) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedInvoice(null);
      setShowReasonSelect(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedInvoice]);

  const filtered = invoices.filter((invoice) => {
    // Sin el `?? ''` esto reventaba la pantalla entera: una boleta sin comprador guarda
    // client_name en null -SUNAT no obliga a identificarlo- y el filtro asumia texto.
    // El numero tampoco esta hasta que el proveedor lo asigna.
    const termino = search.toLowerCase();
    const matchesSearch =
      (invoice.client_name ?? '').toLowerCase().includes(termino) ||
      (invoice.series ?? '').toLowerCase().includes(termino) ||
      (invoice.number ?? '').includes(search);

    const matchesType = filterType === 'ALL' || invoice.invoice_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateCreditNote = (reason: CreditNoteReason) => {
    if (!selectedInvoice) return;
    onEmitCreditNote(selectedInvoice, reason);
    setShowReasonSelect(false);
    setMotivoBaja('');
    setSelectedInvoice(null);
  };

  const closeDetail = () => {
    setSelectedInvoice(null);
    setShowReasonSelect(false);
    setMotivoBaja('');
  };

  const handleVoid = () => {
    if (!selectedInvoice || motivoBaja.trim().length < 3) return;
    onVoidInvoice(selectedInvoice, motivoBaja.trim());
    setShowReasonSelect(false);
    setMotivoBaja('');
    setSelectedInvoice(null);
  };

  const canRetryOrEmit =
    selectedInvoice?.status === InvoiceStatus.BORRADOR ||
    selectedInvoice?.status === InvoiceStatus.FALLO;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por cliente o número"
              aria-label="Buscar comprobante por cliente o número"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<Search size={18} />}
            />
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={onRefresh}
            aria-label="Actualizar historial"
          >
            <RefreshCw size={17} />
          </Button>
        </div>

        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filterType}
          onChange={setFilterType}
          aria-label="Filtrar por tipo de comprobante"
        />
      </div>

      <div className="space-y-3 pb-24">
        {filtered.length === 0 ? (
          <Card dashed className="py-16 text-center">
            <Search size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No se encontraron comprobantes.</p>
          </Card>
        ) : (
          filtered.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              onClick={() => setSelectedInvoice(invoice)}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-slate-200 bg-white p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-4">
                {invoice.status === InvoiceStatus.PROCESANDO ? (
                  <ProcessingRing />
                ) : (
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-control ${TYPE_ICON_CLASSES[invoice.invoice_type]}`}
                  >
                    {invoice.invoice_type === InvoiceType.NOTA_CREDITO ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="truncate pr-2 text-sm font-semibold text-slate-900">
                    {invoice.client_name ?? SIN_COMPRADOR}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={invoice.status} />
                    <span className="text-xs text-slate-500">{invoice.invoice_date}</span>
                  </div>
                  {invoice.status === InvoiceStatus.FALLO && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
                      <FileX size={14} />
                      {FALLO_TITULO}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">
                  S/ {Number(invoice.total).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  {invoice.series}-{invoice.number}
                </p>
                {invoice.status === InvoiceStatus.EMITIDO && invoice.nro_comprobante_sunat && (
                  <p className="text-xs text-slate-500">
                    Nº SUNAT: {invoice.nro_comprobante_sunat}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-[200] flex items-end bg-slate-900/40 backdrop-blur-sm">
          <div
            id="ticket-print"
            role="dialog"
            aria-modal="true"
            aria-label={`${INVOICE_TYPE_LABEL[selectedInvoice.invoice_type]} ${selectedInvoice.series}-${selectedInvoice.number}`}
            className="mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-card bg-white p-6 pb-10 shadow-2xl"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 print:hidden" />

            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {INVOICE_TYPE_LABEL[selectedInvoice.invoice_type]}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {selectedInvoice.series}-{selectedInvoice.number}
                </p>
                <p className="mt-0.5 select-all text-xs text-slate-500">ID: {selectedInvoice.id}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={closeDetail}
                aria-label="Cerrar"
                className="print:hidden"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-6">
              <Card tone="muted" className="p-5">
                <p className="mb-1 text-xs text-slate-500">Cliente</p>
                <p className="text-base font-semibold text-slate-900">
                  {selectedInvoice.client_name ?? SIN_COMPRADOR}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Documento: {selectedInvoice.client_document || 'sin documento'}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm text-slate-500">Fecha de venta</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {selectedInvoice.invoice_date}
                  </span>
                </div>
                {selectedInvoice.status === InvoiceStatus.EMITIDO &&
                  selectedInvoice.nro_comprobante_sunat && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm text-slate-500">Nº SUNAT</span>
                      <span className="select-all text-sm font-semibold text-slate-700">
                        {selectedInvoice.nro_comprobante_sunat}
                      </span>
                    </div>
                  )}
              </Card>

              <div>
                <p className="mb-4 border-b border-dashed border-slate-200 pb-2 text-sm font-semibold text-slate-700">
                  Resumen del pedido
                </p>

                <div className="space-y-5">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {item.description}
                        </span>
                        <span className="text-xs text-slate-500">
                          Cant: {item.quantity} {item.unit} • S/{' '}
                          {Number(item.sale_price).toFixed(2)} c/u
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-900">
                        S/ {Number(item.total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-card bg-primary p-6 text-white">
                <AmountRow
                  label="Op. Gravadas"
                  amount={Number(selectedInvoice.taxed_amount ?? 0)}
                />
                {Number(selectedInvoice.exempt_amount ?? 0) > 0 && (
                  <AmountRow
                    label="Op. Exoneradas"
                    amount={Number(selectedInvoice.exempt_amount)}
                  />
                )}
                {Number(selectedInvoice.unaffected_amount ?? 0) > 0 && (
                  <AmountRow
                    label="Op. Inafectas"
                    amount={Number(selectedInvoice.unaffected_amount)}
                  />
                )}
                <AmountRow label="IGV (18%)" amount={Number(selectedInvoice.igv)} />

                <div className="border-t border-dashed border-white/20 pt-4">
                  <p className="mb-1 text-sm text-white/70">Total del documento</p>
                  <p className="text-4xl font-bold tracking-tight">
                    S/ {Number(selectedInvoice.total).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedInvoice.status === InvoiceStatus.FALLO && (
                <Notice tone="danger">
                  <p className="font-semibold">{FALLO_TITULO}</p>
                  <p className="mt-0.5 font-normal">
                    {selectedInvoice.sunat_message || FALLO_AYUDA}
                  </p>
                  <p className="mt-1 select-all text-xs font-normal opacity-70">
                    #{selectedInvoice.id}
                  </p>
                </Notice>
              )}

              {showReasonSelect ? (
                selectedInvoice.can_be_voided ? (
                  // Dentro del plazo: se da de baja y el comprobante deja de existir.
                  <div className="space-y-3 print:hidden">
                    <Notice tone="info">
                      <p className="font-semibold">Se dará de baja ante SUNAT</p>
                      <p className="mt-0.5 font-normal">
                        El comprobante dejará de existir. No se puede deshacer.
                      </p>
                    </Notice>

                    <label
                      className="block text-sm font-semibold text-slate-700"
                      htmlFor="motivo-baja"
                    >
                      ¿Por qué se anula?
                    </label>
                    <input
                      id="motivo-baja"
                      type="text"
                      value={motivoBaja}
                      onChange={(evento) => setMotivoBaja(evento.target.value)}
                      maxLength={100}
                      placeholder="Ej: el cliente se arrepintió"
                      className="min-h-11 w-full rounded-control border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none"
                    />

                    <Button
                      variant="danger"
                      fullWidth
                      disabled={motivoBaja.trim().length < 3}
                      onClick={handleVoid}
                    >
                      Confirmar anulación
                    </Button>
                  </div>
                ) : (
                  // Fuera de plazo: SUNAT ya no admite la baja y la via es la nota de
                  // credito. Se le dice al cajero ANTES de elegir, no despues de que el
                  // proveedor lo rechace.
                  <div className="space-y-3 print:hidden">
                    <Notice tone="info">
                      <p className="font-semibold">Ya pasó el plazo para dar de baja</p>
                      <p className="mt-0.5 font-normal">
                        SUNAT solo lo admite durante 7 días. Se emitirá una nota de crédito, que
                        revierte la venta con un comprobante nuevo.
                      </p>
                    </Notice>

                    <p className="text-center text-sm font-semibold text-slate-700">
                      Motivo de la nota de crédito
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {CREDIT_NOTE_REASONS.map((reason) => (
                        <Button
                          key={reason.id}
                          variant="outline"
                          fullWidth
                          className="justify-between"
                          onClick={() => handleCreateCreditNote(reason.id)}
                        >
                          {reason.label}
                          <ArrowLeftRight size={16} className="text-slate-400" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-3 pt-2 print:hidden">
                  <div className="flex justify-between gap-2">
                    <ActionTile
                      icon={FileText}
                      label={isPdfLoading ? 'Cargando' : 'Ver PDF'}
                      tone="primary"
                      loading={isPdfLoading}
                      disabled={isPdfLoading || !selectedInvoicePdf}
                      onClick={() => {
                        if (selectedInvoicePdf) PDFService.viewPDF(selectedInvoicePdf);
                      }}
                    />
                    <ActionTile
                      icon={Printer}
                      label="Imprimir"
                      tone="neutral"
                      loading={isPdfLoading}
                      disabled={isPdfLoading}
                      onClick={() => window.print()}
                    />
                    <ActionTile
                      icon={Download}
                      label="Descargar"
                      tone="neutral"
                      loading={isPdfLoading}
                      disabled={isPdfLoading || !selectedInvoicePdf}
                      onClick={() => {
                        if (selectedInvoicePdf) {
                          PDFService.downloadPDF(
                            selectedInvoicePdf,
                            `${selectedInvoice.series}-${selectedInvoice.number}.pdf`,
                          );
                        }
                      }}
                    />
                    <ActionTile
                      icon={Share2}
                      label="Compartir"
                      tone="success"
                      loading={isPdfLoading}
                      disabled={isPdfLoading || !selectedInvoicePdf}
                      onClick={async () => {
                        if (!selectedInvoicePdf) return;
                        const filename = `${selectedInvoice.series}-${selectedInvoice.number}.pdf`;
                        const shared = await PDFService.shareNative(
                          selectedInvoicePdf,
                          filename,
                          `Comprobante ${filename}`,
                        );
                        if (shared) return;
                        PDFService.shareWhatsApp(selectedInvoice as any, '', selectedInvoicePdf);
                      }}
                    />
                  </div>

                  {/* La prueba ante SUNAT, aparte de los PDF a proposito: un PDF no
                      prueba nada -cualquiera fabrica uno-. El XML firmado es el
                      comprobante, y el CDR es la constancia que SUNAT firma al aceptarlo.
                      Es lo que se le ensena a un cliente que duda de su validez. */}
                  {(selectedInvoice.xml_url || selectedInvoice.cdr_url) && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs text-slate-500">Prueba ante SUNAT</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedInvoice.cdr_url && (
                          <a
                            href={selectedInvoice.cdr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ShieldCheck size={14} />
                            Constancia de SUNAT
                          </a>
                        )}
                        {selectedInvoice.xml_url && (
                          <a
                            href={selectedInvoice.xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileCode size={14} />
                            XML firmado
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {canRetryOrEmit && (
                    <Button
                      variant={
                        selectedInvoice.status === InvoiceStatus.FALLO ? 'primary' : 'success'
                      }
                      size="lg"
                      fullWidth
                      loading={isEmittingDraft}
                      onClick={async () => {
                        setIsEmittingDraft(true);
                        await onEmitDraft(selectedInvoice.id);
                        setIsEmittingDraft(false);
                        setSelectedInvoice(null);
                      }}
                    >
                      {!isEmittingDraft &&
                        (selectedInvoice.status === InvoiceStatus.FALLO ? (
                          <RefreshCw size={18} />
                        ) : (
                          <Zap size={18} />
                        ))}
                      {isEmittingDraft
                        ? 'Enviando a SUNAT…'
                        : selectedInvoice.status === InvoiceStatus.FALLO
                          ? 'Reintentar en SUNAT'
                          : 'Emitir a SUNAT'}
                    </Button>
                  )}

                  {canRetryOrEmit && (
                    <Button
                      variant="danger-soft"
                      fullWidth
                      loading={isDeletingInvoice}
                      onClick={async () => {
                        setIsDeletingInvoice(true);
                        await onDeleteInvoice(selectedInvoice.id);
                        setIsDeletingInvoice(false);
                        setSelectedInvoice(null);
                      }}
                    >
                      {!isDeletingInvoice && <Trash2 size={16} />}
                      {isDeletingInvoice ? 'Eliminando…' : 'Eliminar documento'}
                    </Button>
                  )}

                  {selectedInvoice.invoice_type !== InvoiceType.NOTA_CREDITO &&
                    selectedInvoice.status === InvoiceStatus.EMITIDO &&
                    (NOTA_CREDITO_ENABLED ? (
                      <Button variant="outline" fullWidth onClick={() => setShowReasonSelect(true)}>
                        <CornerUpLeft size={18} /> Anular comprobante
                      </Button>
                    ) : (
                      <a
                        href={buildSoporteWhatsappUrl(selectedInvoice)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-success/10 px-5 text-sm font-semibold text-success transition hover:bg-success/20 active:scale-[0.98]"
                      >
                        <MessageCircle size={18} /> Solicitar anulación
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
