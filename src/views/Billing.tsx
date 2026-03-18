// views/Billing.tsx
import React, { useRef, useState } from 'react';
import {
  Sender,
  Product,
  Client,
  Invoice,
  InvoiceType,
  UnitOfMeasure,
  InvoiceItem,
  IAExtractionResult,
  InvoiceStatus,
} from '../types';
import { processInvoiceImage, processInvoiceAudio } from '../services/integrations/geminiService';
import { checkRateLimit, incrementUsage } from '../services/utils/rateLimiter';
import { PDFService } from '../services/integrations/pdfService';
import ProductSearchSelector from '../components/ProductSearchSelector';
import { invoiceEmissionSchema } from '../schemas/business';
import {
  Camera,
  Plus,
  Trash2,
  X,
  ShoppingCart,
  User,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Layers,
  Mic,
  Square,
  AlertTriangle,
  MessageCircle,
  Loader2,
} from 'lucide-react';

interface BillingProps {
  sender: Sender | null;
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  onEmit: (invoice: Invoice) => Promise<Invoice | null>;
  onSaveDraft: (invoice: Invoice) => Promise<Invoice | null>;
  onAddClient: (client: Client) => void;
  onSelectSender: () => void;
}

interface BillingClientData {
  name: string;
  document: string;
  phone: string;
  invoice_date: string;
}

const Billing: React.FC<BillingProps> = ({
  sender,
  products,
  clients,
  invoices,
  onEmit,
  onSaveDraft,
  onAddClient,
  onSelectSender,
}) => {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.BOLETA);
  const [clientData, setClientData] = useState<BillingClientData>({
    name: '',
    document: '',
    phone: '',
    invoice_date: new Date().toLocaleDateString('en-CA'),
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'image' | 'audio' | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [iaWarning, setIaWarning] = useState<string | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [emissionStep, setEmissionStep] = useState(0);
  const [emissionSuccess, setEmissionSuccess] = useState<Invoice | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const gravada = items
    .filter((item) => item.has_igv)
    .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const exonerada = items
    .filter((item) => !item.has_igv)
    .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const igvTotal = gravada * 0.18;
  const total = gravada + exonerada + igvTotal;

  const formatDateForInput = (dateStr: string): string => {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const mapUnit = (unit: string): UnitOfMeasure => {
    const normalized = unit?.toUpperCase();
    if (Object.values(UnitOfMeasure).includes(normalized as UnitOfMeasure)) {
      return normalized as UnitOfMeasure;
    }
    return UnitOfMeasure.UNIDAD;
  };

  const fillFormWithResult = (result: IAExtractionResult) => {
    setIaWarning(null);

    if (result.tipo_documento) {
      setInvoiceType(
        result.tipo_documento === 'FACTURA' ? InvoiceType.FACTURA : InvoiceType.BOLETA
      );
    }

    const hasClient = result.cliente?.cliente?.trim();
    if (hasClient) {
      setClientData((prev) => ({
        ...prev,
        name: result.cliente.cliente || '',
        document: result.cliente.dni || result.cliente.ruc || '',
        phone: result.cliente.telefono || '',
        invoice_date: result.cliente.fecha
          ? formatDateForInput(result.cliente.fecha)
          : prev.invoice_date,
      }));
    }

    if (!result.productos || result.productos.length === 0) {
      setIaWarning(
        hasClient
          ? `Cliente "${result.cliente.cliente}" detectado. No se identificaron productos — agrégalos manualmente.`
          : 'No se detectaron productos ni cliente. Intenta dictar más claro o agrega los datos manualmente.'
      );
      return;
    }

    setItems(
      result.productos.map((product) => {
        const quantity = product.cantidad || 1;
        const extractedHasIgv = product.igv !== 0;
        const matchedProduct = products.find(
          (candidate) => String(candidate.id) === String(product.productId)
        );

        const description = matchedProduct?.description || product.descripcion || '';
        const unitPrice =
          matchedProduct?.base_price ||
          product.precio_base ||
          product.precio_total / (extractedHasIgv ? 1.18 : 1) / quantity;

        const hasIgv = matchedProduct?.has_igv ?? extractedHasIgv;

        return {
          product_id: matchedProduct?.id ?? null,
          description,
          quantity,
          unit: mapUnit(product.unidad_medida),
          unit_price: unitPrice,
          has_igv: hasIgv,
          total: product.precio_total || unitPrice * quantity * (hasIgv ? 1.18 : 1),
        };
      })
    );
  };

  const startRecording = async () => {
    const userId = sender?.user_id || 'anonymous';
    const { allowed } = checkRateLimit(userId);

    if (!allowed) {
      alert(
        '⚠️ Has alcanzado el límite diario de 5 extracciones con IA. Intenta mañana o ingresa los datos manualmente.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          setProcessingType('audio');

          const result = await processInvoiceAudio(
            base64Audio,
            'audio/webm',
            products.filter((product) => product.sender_id === sender?.id)
          );

          if (result) {
            fillFormWithResult(result);
            incrementUsage(userId);
          }

          setIsProcessing(false);
          setProcessingType(null);
        };

        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIaWarning(null);
    } catch {
      alert('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userId = sender?.user_id || 'anonymous';
    const { allowed } = checkRateLimit(userId);

    if (!allowed) {
      alert(
        '⚠️ Has alcanzado el límite diario de 5 extracciones con IA. Intenta mañana o ingresa los datos manualmente.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);

      setTimeout(async () => {
        setIsProcessing(true);
        setProcessingType('image');

        const result = await processInvoiceImage(
          base64,
          products.filter((product) => product.sender_id === sender?.id)
        );

        if (result) {
          fillFormWithResult(result);
          incrementUsage(userId);
        }

        setIsProcessing(false);
        setProcessingType(null);
      }, 100);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const nextItems = [...prev];
      const currentItem = { ...nextItems[index], ...updates };
      const quantity = currentItem.quantity || 1;

      if ('total' in updates && updates.total !== undefined) {
        const totalWithoutIgv = currentItem.has_igv ? currentItem.total / 1.18 : currentItem.total;
        currentItem.unit_price = totalWithoutIgv / quantity;
      } else if ('unit_price' in updates && updates.unit_price !== undefined) {
        const base = quantity * currentItem.unit_price;
        currentItem.total = currentItem.has_igv ? base * 1.18 : base;
      } else if ('quantity' in updates && updates.quantity !== undefined) {
        const base = quantity * currentItem.unit_price;
        currentItem.total = currentItem.has_igv ? base * 1.18 : base;
      } else if ('has_igv' in updates && updates.has_igv !== undefined) {
        const totalWithoutIgv = currentItem.has_igv ? currentItem.total / 1.18 : currentItem.total;
        currentItem.unit_price = totalWithoutIgv / quantity;
      }

      nextItems[index] = currentItem;
      return nextItems;
    });
  };

  const clearAll = () => {
    if (!confirm('¿Deseas limpiar todo el formulario?')) return;

    setClientData({
      name: '',
      document: '',
      phone: '',
      invoice_date: new Date().toLocaleDateString('en-CA'),
    });
    setItems([]);
    setPreviewImage(null);
    setEmissionSuccess(null);
    setPdfBase64(null);
    setErrors([]);
    setEmissionStep(0);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        description: '',
        quantity: 1,
        unit: UnitOfMeasure.UNIDAD,
        unit_price: 0,
        has_igv: true,
        total: 0,
      },
    ]);
  };

  const getNextNumber = () => {
    if (!sender) return '00000001';

    const senderInvoices = invoices.filter(
      (invoice) => invoice.sender_id === sender.id && invoice.invoice_type === invoiceType
    );

    if (senderInvoices.length === 0) return '00000001';

    const lastNumber = Math.max(...senderInvoices.map((invoice) => parseInt(invoice.number, 10)));
    return String(lastNumber + 1).padStart(6, '0');
  };

  const handleOpenConfirm = () => {
    const result = invoiceEmissionSchema.safeParse({
      invoice_type: invoiceType,
      clientData,
      items: items.map((item) => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        has_igv: item.has_igv,
      })),
    });

    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors([]);
    setShowConfirmModal(true);
  };

  const handleSaveDraft = async () => {
    if (!sender || items.length === 0) return;

    setIsSavingDraft(true);
    try {
      const series = invoiceType === InvoiceType.BOLETA ? 'B001' : 'F001';
      const nextNumber = getNextNumber();

      const invoiceData: Invoice = {
        id: Date.now(),
        sender_id: sender.id,
        client_id: null,
        client_name: clientData.name,
        client_document: clientData.document || null,
        invoice_type: invoiceType,
        series,
        number: nextNumber,
        numero_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        subtotal: gravada + exonerada,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_base64: null,
        sunat_message: null,
        referenced_invoice_id: null,
        credit_note_reason: null,
        credit_note_sustento: null,
        items,
      };

      await onSaveDraft(invoiceData);
      setClientData({ name: '', document: '', phone: '', invoice_date: new Date().toLocaleDateString('en-CA') });
      setItems([]);
      setPreviewImage(null);
      setErrors([]);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalEmit = async () => {
    if (!sender) return;

    setShowConfirmModal(false);
    setIsEmitting(true);
    setEmissionStep(1);

    try {
      const series = invoiceType === InvoiceType.BOLETA ? 'B001' : 'F001';
      const nextNumber = getNextNumber();

      const invoiceData: Invoice = {
        id: Date.now(),
        sender_id: sender.id,
        client_id: null,
        client_name: clientData.name,
        client_document: clientData.document || null,
        invoice_type: invoiceType,
        series,
        number: nextNumber,
        numero_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        subtotal: gravada + exonerada,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_base64: null,
        sunat_message: null,
        referenced_invoice_id: null,
        credit_note_reason: null,
        credit_note_sustento: null,
        items,
      };

      setEmissionStep(2);
      const createdInvoice = await onEmit(invoiceData);
      setEmissionStep(3);

      const finalInvoice: Invoice = createdInvoice
        ? { ...createdInvoice, status: InvoiceStatus.PROCESANDO }
        : { ...invoiceData, status: InvoiceStatus.PROCESANDO };

      setEmissionSuccess(finalInvoice);
    } catch (error: any) {
      setErrors([error.message || 'Error al emitir documento']);
      setEmissionStep(0);
    } finally {
      setIsEmitting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!emissionSuccess) return;
    PDFService.shareWhatsApp(emissionSuccess as any, clientData.phone, pdfBase64 || undefined);
  };

  const handleViewPdf = () => {
    if (!pdfBase64) return;
    PDFService.viewPDF(pdfBase64);
  };

  if (emissionSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-50">
          <CheckCircle2 size={56} strokeWidth={2.5} />
        </div>

        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2 uppercase tracking-tighter text-emerald-600">
          ¡Documento Enviado!
        </h2>

        <p className="text-slate-500 font-medium mb-12 text-sm leading-relaxed">
          Documento{' '}
          <span className="font-black text-slate-900">
            {emissionSuccess.series}-{emissionSuccess.number}
          </span>{' '}
          enviado correctamente. Revisa el historial para ver el estado final.
        </p>

        <div className="w-full space-y-4 mb-10 max-w-xs">
          <button
            onClick={handleWhatsAppShare}
            className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
          >
            <MessageCircle size={20} /> Compartir WhatsApp
          </button>

          <button
            onClick={clearAll}
            className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-200 transition-all"
          >
            <RotateCcw size={18} /> Nueva Venta
          </button>
        </div>

        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          FactuMovil AI • Validado SUNAT
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-md mx-auto relative px-2">
      {isEmitting && (
        <div className="fixed inset-0 z-[250] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-8" />
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 uppercase tracking-tighter">
            Preparando Documento
          </h3>

          <div className="w-full max-w-xs space-y-6">
            {['Validando datos', 'Creando comprobante', 'Encolando emisión'].map((label, index) => {
              const isActive = emissionStep === index + 1;
              const isDone = emissionStep > index + 1;

              return (
                <div
                  key={`${index}-${label}`}
                  className={`flex items-center gap-4 transition-all duration-500 ${
                    isActive ? 'scale-110' : isDone ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Loader2 size={20} className="animate-spin" />
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isActive
                        ? 'text-blue-600'
                        : isDone
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 pointer-events-none">
          <div className="bg-red-600 text-white p-5 rounded-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h4 className="text-[11px] font-black uppercase tracking-widest">
                  Completa estos campos
                </h4>
              </div>
              <button onClick={() => setErrors([])} className="p-1 hover:bg-white/20 rounded-full">
                <X size={18} />
              </button>
            </div>

            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={`${index}-${error}`} className="text-[11px] font-bold flex items-start gap-2">
                  <span className="text-red-200">•</span> {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {iaWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-amber-800 text-[11px] font-black uppercase tracking-wide leading-relaxed">
              {iaWarning}
            </p>
          </div>
          <button onClick={() => setIaWarning(null)} className="text-amber-400 hover:text-amber-600">
            <X size={14} />
          </button>
        </div>
      )}

      <section className="bg-white p-5 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div
          className="w-full h-44 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden mb-4"
        >
          {previewImage ? (
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-full object-contain bg-slate-900 rounded-[28px]"
              />
              {!isProcessing && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewImage(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors z-20"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white animate-pulse mb-3 shadow-lg shadow-red-200">
                <Mic size={32} />
              </div>
              <p className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em]">
                Escuchando...
              </p>
            </div>
          ) : (
            <>
              {/* Circuit grid background */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="ai-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#2563eb" strokeWidth="0.6"/>
                    <circle cx="0" cy="0" r="1.4" fill="#2563eb"/>
                    <circle cx="28" cy="0" r="1.4" fill="#2563eb"/>
                    <circle cx="0" cy="28" r="1.4" fill="#2563eb"/>
                    <circle cx="28" cy="28" r="1.4" fill="#2563eb"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ai-grid)"/>
              </svg>

              {/* Pulsing rings */}
              <span className="absolute w-32 h-32 rounded-full border border-blue-400/25" style={{animation: 'aiRing 2.2s ease-out infinite'}} />
              <span className="absolute w-24 h-24 rounded-full border border-blue-500/30" style={{animation: 'aiRing 2.2s ease-out infinite 0.55s'}} />
              <span className="absolute w-16 h-16 rounded-full border border-blue-600/35" style={{animation: 'aiRing 2.2s ease-out infinite 1.1s'}} />

              {/* Robot */}
              <div
                className="z-10 mb-3"
                style={{animation: 'aiFloat 3.5s ease-in-out infinite'}}
              >
                <svg viewBox="0 0 56 64" className="w-14 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Antenna */}
                  <rect x="26.5" y="1" width="3" height="7" rx="1.5" fill="#1e40af" opacity="0.9"/>
                  <circle cx="28" cy="1.5" r="3" fill="#3b82f6"/>
                  <circle cx="28" cy="1.5" r="1.5" fill="#93c5fd" style={{animation: 'antBlink 2s ease-in-out infinite'}}/>

                  {/* Head */}
                  <rect x="8" y="8" width="40" height="26" rx="10" fill="#0f172a"/>
                  <rect x="9.5" y="9.5" width="37" height="23" rx="9" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.4"/>

                  {/* Eyes */}
                  <circle cx="20" cy="22" r="6" fill="#1d4ed8"/>
                  <circle cx="36" cy="22" r="6" fill="#1d4ed8"/>
                  <circle cx="20" cy="22" r="3.5" fill="#60a5fa" style={{animation: 'eyeBlink 3.5s ease-in-out infinite'}}/>
                  <circle cx="36" cy="22" r="3.5" fill="#60a5fa" style={{animation: 'eyeBlink 3.5s ease-in-out infinite'}}/>
                  <circle cx="21" cy="21" r="1.2" fill="white" opacity="0.9"/>
                  <circle cx="37" cy="21" r="1.2" fill="white" opacity="0.9"/>

                  {/* Mouth bar */}
                  <rect x="17" y="29" width="22" height="3" rx="1.5" fill="#334155"/>
                  <rect x="19" y="29.5" width="4" height="2" rx="1" fill="#3b82f6" style={{animation: 'mouthLight 1.4s ease-in-out infinite'}}/>
                  <rect x="25" y="29.5" width="4" height="2" rx="1" fill="#3b82f6" style={{animation: 'mouthLight 1.4s ease-in-out infinite 0.35s'}}/>
                  <rect x="31" y="29.5" width="4" height="2" rx="1" fill="#3b82f6" style={{animation: 'mouthLight 1.4s ease-in-out infinite 0.7s'}}/>

                  {/* Body */}
                  <rect x="12" y="36" width="32" height="22" rx="8" fill="#0f172a"/>
                  <rect x="13.5" y="37.5" width="29" height="19" rx="7" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.35"/>

                  {/* Chest light */}
                  <circle cx="28" cy="47" r="5" fill="#1d4ed8"/>
                  <circle cx="28" cy="47" r="3" fill="#3b82f6" style={{animation: 'chestPulse 2s ease-in-out infinite'}}/>
                  <circle cx="28" cy="47" r="1.5" fill="#93c5fd"/>

                  {/* Side vents */}
                  <rect x="15" y="42" width="6" height="1.5" rx="0.75" fill="#334155"/>
                  <rect x="15" y="45" width="6" height="1.5" rx="0.75" fill="#334155"/>
                  <rect x="35" y="42" width="6" height="1.5" rx="0.75" fill="#334155"/>
                  <rect x="35" y="45" width="6" height="1.5" rx="0.75" fill="#334155"/>

                  {/* Arms */}
                  <rect x="2" y="37" width="9" height="16" rx="4.5" fill="#0f172a" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.3"/>
                  <rect x="45" y="37" width="9" height="16" rx="4.5" fill="#0f172a" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.3"/>
                  <circle cx="6.5" cy="55" r="3" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.5"/>
                  <circle cx="49.5" cy="55" r="3" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.5"/>
                </svg>
              </div>

              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] z-10">
                Asistente IA
              </p>
              <p className="text-slate-400 text-[9px] font-semibold text-center leading-relaxed z-10 mt-1 px-4">
                Toma foto o grábate y emite una factura en segundos
              </p>

              <style>{`
                @keyframes aiRing {
                  0%   { transform: scale(1);   opacity: 0.55; }
                  100% { transform: scale(1.9);  opacity: 0;    }
                }
                @keyframes aiFloat {
                  0%,100% { transform: translateY(0px); }
                  50%     { transform: translateY(-6px); }
                }
                @keyframes eyeBlink {
                  0%,90%,100% { transform: scaleY(1); }
                  95%         { transform: scaleY(0.15); }
                }
                @keyframes antBlink {
                  0%,40%,100% { opacity: 1; }
                  70%         { opacity: 0.2; }
                }
                @keyframes mouthLight {
                  0%,100% { opacity: 0.35; }
                  50%     { opacity: 1; }
                }
                @keyframes chestPulse {
                  0%,100% { r: 3; opacity: 0.8; }
                  50%     { r: 4; opacity: 1;   }
                }
              `}</style>
            </>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 px-8 text-center text-white transition-all">
              <div className="w-10 h-10 border-[4px] border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <h4 className="font-black text-[11px] uppercase tracking-widest mb-1">
                {processingType === 'audio' ? 'Procesando Voz' : 'Procesando Imagen'}
              </h4>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
                Extrayendo datos con IA...
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <Square size={18} fill="white" /> Parar
            </button>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                <Camera size={18} /> Cámara
              </button>

              <button
                onClick={startRecording}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                <Mic size={18} /> Voz
              </button>
            </>
          )}

          <button
            onClick={clearAll}
            className="w-14 bg-slate-50 text-slate-400 py-4 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-slate-100"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScan}
        />
      </section>

      <section className="bg-white p-6 rounded-[36px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-blue-600" />
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
            Documento
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setInvoiceType(InvoiceType.BOLETA)}
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${
                invoiceType === InvoiceType.BOLETA
                  ? 'bg-white shadow-md text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              BOLETA
            </button>
            <button
              onClick={() => setInvoiceType(InvoiceType.FACTURA)}
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${
                invoiceType === InvoiceType.FACTURA
                  ? 'bg-white shadow-md text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              FACTURA
            </button>
          </div>

          {sender ? (
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                Emisor
              </p>
              <p className="text-sm font-black text-slate-800 truncate">{sender.name}</p>
            </div>
          ) : (
            <button
              onClick={onSelectSender}
              className="w-full bg-amber-50 p-4 rounded-2xl text-left flex justify-between items-center border border-amber-200"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">
                  ⚠️ Sin Empresa
                </p>
                <p className="text-sm font-bold text-amber-700">Configura tu empresa en Perfil</p>
              </div>
              <ChevronDown size={20} className="text-amber-400 shrink-0" />
            </button>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-[36px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-600" />
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
            Cliente
          </h3>
        </div>

        <div className="space-y-4">
          <input
            value={clientData.name}
            onChange={(event) =>
              setClientData((prev) => ({ ...prev, name: event.target.value.toUpperCase() }))
            }
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase placeholder:text-slate-300"
            placeholder="Nombre / Razón Social"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={clientData.document}
              onChange={(event) =>
                setClientData((prev) => ({ ...prev, document: event.target.value }))
              }
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 placeholder:text-slate-300"
              placeholder="DNI / RUC"
            />

            <input
              type="date"
              value={clientData.invoice_date}
              onChange={(event) =>
                setClientData((prev) => ({ ...prev, invoice_date: event.target.value }))
              }
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800"
            />
          </div>

          <input
            value={clientData.phone}
            onChange={(event) =>
              setClientData((prev) => ({ ...prev, phone: event.target.value }))
            }
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 placeholder:text-slate-300"
            placeholder="Celular para envío WhatsApp"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
              Detalle
            </h3>
          </div>

          <button
            onClick={addItem}
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus size={14} /> Producto
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`item-${index}-${item.product_id ?? 'new'}`}
              className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-4 animate-in slide-in-from-left duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <ProductSearchSelector
                    products={products.filter(
                      (product) => String(product.sender_id) === String(sender?.id)
                    )}
                    value={item.description}
                    onChange={(value) => updateItem(index, { description: value.toUpperCase() })}
                    onSelectProduct={(selectedProduct) => {
                      updateItem(index, {
                        product_id: selectedProduct.id,
                        description: selectedProduct.description,
                        unit: selectedProduct.unit,
                        unit_price: selectedProduct.base_price,
                        has_igv: selectedProduct.has_igv,
                        total:
                          selectedProduct.base_price *
                          (item.quantity || 1) *
                          (selectedProduct.has_igv ? 1.18 : 1),
                      });
                    }}
                    placeholder="NOMBRE DEL PRODUCTO"
                    showDropdownButton
                  />
                </div>

                <button
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                    Cant.
                  </label>
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(event) =>
                      updateItem(index, { quantity: parseFloat(event.target.value) || 0 })
                    }
                    placeholder="1"
                    className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                    Unidad
                  </label>
                  <select
                    value={item.unit}
                    onChange={(event) =>
                      updateItem(index, { unit: event.target.value as UnitOfMeasure })
                    }
                    className="w-full bg-slate-50 rounded-xl px-2 py-3 text-[11px] font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    {Object.values(UnitOfMeasure).map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                    P.Unit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price ? item.unit_price.toFixed(2) : ''}
                    onChange={(event) =>
                      updateItem(index, { unit_price: parseFloat(event.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-blue-600 uppercase mb-1 block px-1">
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.total ? item.total.toFixed(2) : ''}
                    onChange={(event) =>
                      updateItem(index, { total: parseFloat(event.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-2 py-2.5 text-sm font-black text-blue-600 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateItem(index, { has_igv: true })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    item.has_igv ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Con IGV 18%
                </button>

                <button
                  onClick={() => updateItem(index, { has_igv: false })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    !item.has_igv ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Exonerado
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-[40px] shadow-xl shadow-slate-200/30 border border-slate-100 mx-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-16 translate-x-16 opacity-50" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50 rounded-full translate-y-12 -translate-x-12 opacity-30" />

        <div className="relative z-10">
          <div className="text-center mb-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
              Resumen de Venta
            </h3>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-600">Subtotal</span>
              <span className="text-sm font-black text-slate-800">
                S/ {(gravada + exonerada).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-600">IGV (18%)</span>
              <span className="text-sm font-black text-blue-600">S/ {igvTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-[28px] text-white mb-6 shadow-lg shadow-blue-200/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Total a Pagar
                </p>
                <p className="text-3xl font-black tracking-tight">S/ {total.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isEmitting || items.length === 0}
              className="w-full bg-slate-200 text-slate-600 h-12 rounded-[20px] font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSavingDraft ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Layers size={18} />
              )}
              Guardar como Borrador
            </button>

            <button
              onClick={handleOpenConfirm}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white h-16 rounded-[24px] shadow-xl shadow-emerald-200/50 font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 hover:from-emerald-600 hover:to-emerald-700"
            >
              <CheckCircle2 size={22} /> Emitir Documento
            </button>
          </div>
        </div>
      </section>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
          <div className="bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>

            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase tracking-tighter">
              ¿Confirmar Venta?
            </h3>

            <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">
              Está por emitir una <span className="text-blue-600 font-black">{invoiceType}</span>{' '}
              oficial por un monto total de{' '}
              <span className="font-black text-slate-900">S/ {total.toFixed(2)}</span>.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleFinalEmit}
                className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
              >
                Confirmar Emisión
              </button>

              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full bg-white border border-slate-100 text-slate-400 py-5 rounded-[22px] font-black text-xs uppercase tracking-widest active:bg-slate-50 transition-all"
              >
                Revisar Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;