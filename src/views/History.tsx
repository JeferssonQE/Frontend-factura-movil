// views/History.tsx
import React, { useState } from 'react';
import {
  Search,
  FileText,
  X,
  Download,
  CheckCircle2,
  Printer,
  ArrowLeftRight,
  FileCheck,
  ArrowDownLeft,
  ShieldCheck,
  CornerUpLeft,
  Share2,
  Zap,
  Loader2,
} from 'lucide-react';
import { Invoice, InvoiceStatus, InvoiceType, CreditNoteReason } from '../types';
import { PDFService } from '../services/integrations/pdfService';

interface HistoryProps {
  invoices: Invoice[];
  onEmitCreditNote: (baseInvoice: Invoice, reason: CreditNoteReason) => void;
  onEmitDraft: (invoiceId: number) => Promise<void>;
}

export const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const styles: Record<InvoiceStatus, string> = {
    [InvoiceStatus.EMITIDO]: 'text-emerald-700 bg-emerald-100/60 border-emerald-200',
    [InvoiceStatus.ANULADO]: 'text-slate-500 bg-slate-100 border-slate-200',
    [InvoiceStatus.FALLO]: 'text-red-700 bg-red-100/60 border-red-200',
    [InvoiceStatus.PROCESANDO]: 'text-amber-700 bg-amber-100/60 border-amber-200',
    [InvoiceStatus.BORRADOR]: 'text-slate-400 bg-slate-50 border-slate-100',
  };

  return (
    <div
      className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tighter ${styles[status]}`}
    >
      {status === InvoiceStatus.EMITIDO && <CheckCircle2 size={10} />}
      {status}
    </div>
  );
};

const History: React.FC<HistoryProps> = ({ invoices, onEmitCreditNote, onEmitDraft }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showReasonSelect, setShowReasonSelect] = useState(false);
  const [isEmittingDraft, setIsEmittingDraft] = useState(false);

  const filtered = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.client_name.toLowerCase().includes(search.toLowerCase()) ||
      invoice.series.toLowerCase().includes(search.toLowerCase()) ||
      invoice.number.includes(search);

    const matchesType = filterType === 'ALL' || invoice.invoice_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateCreditNote = (reason: CreditNoteReason) => {
    if (!selectedInvoice) return;
    onEmitCreditNote(selectedInvoice, reason);
    setShowReasonSelect(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por cliente o número..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white border border-slate-100 rounded-[22px] py-4 pl-12 pr-4 shadow-sm text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
          />
        </div>

        <div className="overflow-x-auto hide-scrollbar -mx-2 px-2">
          <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-[24px] min-w-max">
            {['ALL', 'BOLETA', 'FACTURA', 'NOTA_CREDITO'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as 'ALL' | InvoiceType)}
                className={`py-2.5 px-6 rounded-[18px] text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                  filterType === type
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type === 'ALL' ? 'Todos' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
              <Search size={24} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Sin registros encontrados
            </p>
          </div>
        ) : (
          filtered.map((invoice) => (
            <div
              key={invoice.id}
              onClick={() => setSelectedInvoice(invoice)}
              className={`bg-white p-5 rounded-[32px] border shadow-sm flex items-center justify-between hover:border-blue-100 active:scale-[0.98] transition-all cursor-pointer ${
                invoice.invoice_type === InvoiceType.NOTA_CREDITO
                  ? 'border-amber-100 bg-amber-50/20'
                  : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    invoice.invoice_type === InvoiceType.BOLETA
                      ? 'bg-blue-50 text-blue-600'
                      : invoice.invoice_type === InvoiceType.FACTURA
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {invoice.invoice_type === InvoiceType.NOTA_CREDITO ? (
                    <ArrowDownLeft size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-[13px] font-black text-slate-800 uppercase truncate pr-2 tracking-tight">
                    {invoice.client_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={invoice.status} />
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {invoice.invoice_date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-black tracking-tight ${
                    invoice.invoice_type === InvoiceType.NOTA_CREDITO
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}
                >
                  S/ {Number(invoice.total).toFixed(2)}
                </p>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">
                  {invoice.series}-{invoice.number}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 z-[200] backdrop-blur-sm flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-center mb-6 px-2">
              <div>
                <h3 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                  {selectedInvoice.invoice_type.replace('_', ' ')}
                </h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                  {selectedInvoice.series}-{selectedInvoice.number}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setShowReasonSelect(false);
                }}
                className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[36px] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                  <ShieldCheck size={96} />
                </div>

                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Cliente Receptor
                </p>
                <p className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {selectedInvoice.client_name}
                </p>
                <p className="text-[12px] font-bold text-slate-500 mt-1 uppercase">
                  DOC: {selectedInvoice.client_document || 'SIN DOCUMENTO'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Fecha de Venta
                  </span>
                  <span className="text-[11px] font-black text-slate-700">
                    {selectedInvoice.invoice_date}
                  </span>
                </div>
              </div>

              <div className="px-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 pb-2">
                  Resumen del Pedido
                </p>

                <div className="space-y-5 pr-2 custom-scrollbar">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start gap-4 text-xs group">
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-800 font-black uppercase block truncate text-sm">
                          {item.description}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          Cant: {item.quantity} {item.unit} • S/ {Number(item.unit_price).toFixed(2)} c/u
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900 text-sm">
                          S/ {Number(item.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-[36px] p-8 text-white space-y-3 relative overflow-hidden shadow-xl shadow-slate-200">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <FileCheck size={80} />
                </div>

                <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                  <span>Valor Gravado</span>
                  <span>S/ {Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                  <span>IGV (18%)</span>
                  <span className="text-blue-400">S/ {Number(selectedInvoice.igv).toFixed(2)}</span>
                </div>

                <div className="h-px bg-white/10 my-2 border-t border-dashed" />

                <div className="flex justify-between items-end pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">
                      TOTAL DOCUMENTO
                    </span>
                    <span
                      className={`text-5xl font-black tracking-tighter ${
                        selectedInvoice.invoice_type === InvoiceType.NOTA_CREDITO
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      S/ {Number(selectedInvoice.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {showReasonSelect ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 px-2">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">
                    Motivo de Nota de Crédito
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: CreditNoteReason.ANULACION_OPERACION, label: 'Anulación de Operación' },
                      { id: CreditNoteReason.ANULACION_ERROR_RUC, label: 'Error en el RUC' },
                      {
                        id: CreditNoteReason.CORRECCION_ERROR_DESCRIPCION,
                        label: 'Error en Descripción',
                      },
                      { id: CreditNoteReason.DEVOLUCION_TOTAL, label: 'Devolución Total' },
                    ].map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => handleCreateCreditNote(reason.id)}
                        className="w-full py-5 px-6 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] font-black uppercase text-amber-700 hover:bg-amber-100 transition-all text-left flex items-center justify-between group shadow-sm active:scale-95"
                      >
                        {reason.label}
                        <ArrowLeftRight
                          size={16}
                          className="opacity-30 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2 px-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (selectedInvoice?.pdf_base64) {
                          PDFService.viewPDF(selectedInvoice.pdf_base64);
                        } else {
                          alert('PDF no disponible para visualizar');
                        }
                      }}
                      className={`flex-1 h-16 rounded-[22px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        selectedInvoice?.pdf_base64
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      disabled={!selectedInvoice?.pdf_base64}
                    >
                      <FileText size={18} /> Ver PDF Oficial
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-100 text-slate-700 h-16 rounded-[22px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-slate-200 active:scale-95 transition-all"
                    >
                      <Printer size={18} /> Imprimir
                    </button>

                    <button
                      onClick={() => {
                        if (selectedInvoice?.pdf_base64) {
                          PDFService.downloadPDF(
                            selectedInvoice.pdf_base64,
                            `${selectedInvoice.series}-${selectedInvoice.number}.pdf`
                          );
                        } else {
                          alert('PDF no disponible para este documento');
                        }
                      }}
                      className={`w-16 h-16 rounded-[22px] flex items-center justify-center shadow-sm active:scale-95 transition-all border ${
                        selectedInvoice?.pdf_base64
                          ? 'bg-blue-50 text-blue-600 border-blue-100/50 active:bg-blue-100'
                          : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      }`}
                    >
                      <Download size={20} />
                    </button>

                    <button
                      onClick={() => {
                        if (selectedInvoice?.pdf_base64) {
                          PDFService.shareWhatsApp(selectedInvoice as any, '', selectedInvoice.pdf_base64);
                        } else {
                          alert('PDF no disponible para compartir');
                        }
                      }}
                      className={`w-16 h-16 rounded-[22px] flex items-center justify-center shadow-sm active:scale-95 transition-all border ${
                        selectedInvoice?.pdf_base64
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      }`}
                      disabled={!selectedInvoice?.pdf_base64}
                    >
                      <Share2 size={20} />
                    </button>
                  </div>

                  {selectedInvoice.status === InvoiceStatus.BORRADOR && (
                    <button
                      onClick={async () => {
                        setIsEmittingDraft(true);
                        await onEmitDraft(selectedInvoice.id);
                        setIsEmittingDraft(false);
                        setSelectedInvoice(null);
                      }}
                      disabled={isEmittingDraft}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white h-16 rounded-[22px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-200/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isEmittingDraft ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Zap size={18} />
                      )}
                      {isEmittingDraft ? 'Enviando a SUNAT...' : 'Emitir a SUNAT'}
                    </button>
                  )}

                  {selectedInvoice.invoice_type !== InvoiceType.NOTA_CREDITO &&
                    selectedInvoice.status === InvoiceStatus.EMITIDO && (
                      <button
                        onClick={() => setShowReasonSelect(true)}
                        className="w-full bg-amber-50 text-amber-700 border border-amber-100 h-16 rounded-[22px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-amber-100 active:scale-95 transition-all shadow-sm"
                      >
                        <CornerUpLeft size={18} /> Emitir Nota de Crédito
                      </button>
                    )}
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