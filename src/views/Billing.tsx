// views/Billing.tsx
import React, { useCallback, useRef, useState } from 'react';
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
import { isSunatUnit } from '../config/sunatUnits';
import { processInvoiceImage, processInvoiceAudio } from '../services/integrations/geminiService';
import { ApiError, getUserMessage } from '../services/core/apiClient';
import { PDFService } from '../services/integrations/pdfService';
import { invoiceService } from '../services/business/invoiceService';
import { lookupService } from '../services/business/lookupService';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import ProductFormModal from '../components/ProductFormModal';
import SunatCredentialsModal from '../components/SunatCredentialsModal';
import { unitLabel } from '../services/utils/invoiceMath';
import { invoiceEmissionSchema } from '../schemas/business';
import { emissionProgress } from '../config/emissionProgress';
import { getSunatError } from '../config/sunatErrors';
import {
  Camera,
  Images,
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
  Download,
  XCircle,
  RefreshCw,
  ArrowRight,
  Search,
  Pencil,
  KeyRound,
} from 'lucide-react';

const DNI_LENGTH = 8;
const RUC_LENGTH = 11;
const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const iaErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return 'Límite diario de extracciones con IA alcanzado. Intenta mañana o ingresa los datos manualmente.';
    if (error.status === 400) return 'Selecciona una empresa antes de usar la IA.';
    if (error.status === 502)
      return 'La IA no pudo procesar el documento. Intenta de nuevo o ingresa los datos manualmente.';
    return error.userMessage;
  }
  return 'Ocurrió un error al procesar con IA. Intenta de nuevo.';
};

interface BillingProps {
  sender: Sender | null;
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  onEmit: (invoice: Invoice) => Promise<Invoice | null>;
  onSaveDraft: (invoice: Invoice) => Promise<Invoice | null>;
  onAddClient: (client: Client) => void;
  onSelectSender: () => void;
  onKeepEmitting?: () => void;
  onRefresh?: () => Promise<void> | void;
  onSaveProduct?: (data: { description: string; unit: UnitOfMeasure; base_price: number; has_igv: boolean }) => Promise<void>;
  onSaveCredentials?: (sunatUser: string, sunatPass: string) => Promise<void>;
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
  onSaveProduct,
  onKeepEmitting,
  onRefresh,
  onSaveCredentials,
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
  const [showDraftConfirmModal, setShowDraftConfirmModal] = useState(false);
  const [productModal, setProductModal] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [iaWarning, setIaWarning] = useState<string | null>(null);
  const [iaSuccess, setIaSuccess] = useState<string | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [emissionStep, setEmissionStep] = useState(0);
  const [emissionSuccess, setEmissionSuccess] = useState<Invoice | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [emissionState, setEmissionState] = useState<'processing' | 'emitido' | 'fallo' | 'timeout' | null>(null);
  const [emissionCurrentStep, setEmissionCurrentStep] = useState<string | null>(null);
  const [emissionFailedStep, setEmissionFailedStep] = useState<string | null>(null);
  const [sunatMessage, setSunatMessage] = useState<string | null>(null);
  const [numeroComprobante, setNumeroComprobante] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const productsSectionRef = useRef<HTMLElement | null>(null);

  const [documentLookup, setDocumentLookup] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle');

  const handleDniMatch = useCallback(async (value: string) => {
    setDocumentLookup('searching');
    const result = await lookupService.lookupDni(value);
    if (result?.nombre_completo) {
      setClientData((prev) => ({ ...prev, name: result.nombre_completo }));
      setDocumentLookup('found');
    } else {
      setDocumentLookup('notfound');
    }
  }, []);

  const handleRucMatch = useCallback(async (value: string) => {
    setDocumentLookup('searching');
    const result = await lookupService.lookupRuc(value);
    if (result?.razon_social) {
      setClientData((prev) => ({ ...prev, name: result.razon_social }));
      setDocumentLookup('found');
    } else {
      setDocumentLookup('notfound');
    }
  }, []);

  useDebouncedLookup(clientData.document, DNI_LENGTH, handleDniMatch);
  useDebouncedLookup(clientData.document, RUC_LENGTH, handleRucMatch);

  const gravada = items
    .filter((item) => item.has_igv)
    .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const exoneratedItems = items.filter((item) => !item.has_igv);
  const exonerada = exoneratedItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

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

  const maxInvoiceDate = new Date().toLocaleDateString('en-CA');
  const minInvoiceDate = (() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - 2);
    return limit.toLocaleDateString('en-CA');
  })();

  const mapUnit = (unit: string): UnitOfMeasure => {
    const normalized = unit?.toUpperCase();
    return isSunatUnit(normalized) ? normalized : 'UNIDAD';
  };

  const scrollToProducts = () => {
    requestAnimationFrame(() =>
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const fillFormWithResult = (result: IAExtractionResult) => {
    setIaWarning(null);
    setIaSuccess(null);

    if (result.tipo_documento) {
      setInvoiceType(
        result.tipo_documento === 'FACTURA' ? InvoiceType.FACTURA : InvoiceType.BOLETA
      );
    }

    const client = result.cliente;
    const hasClientData = Boolean(
      client &&
        (client.cliente?.trim() ||
          client.dni?.trim() ||
          client.ruc?.trim() ||
          client.telefono?.trim())
    );
    if (hasClientData) {
      setClientData((prev) => ({
        ...prev,
        name: client.cliente || prev.name,
        document: client.dni || client.ruc || prev.document,
        phone: client.telefono || prev.phone,
        invoice_date: client.fecha
          ? formatDateForInput(client.fecha)
          : prev.invoice_date,
      }));
    }

    if (!result.productos || result.productos.length === 0) {
      const clientName = client?.cliente?.trim();
      setIaWarning(
        hasClientData
          ? clientName
            ? `Cliente "${clientName}" detectado. No se identificaron productos — agrégalos manualmente.`
            : 'Datos del cliente detectados. No se identificaron productos — agrégalos manualmente.'
          : 'No se detectaron productos ni cliente. Intenta dictar más claro o agrega los datos manualmente.'
      );
      return;
    }

    setItems(
      result.productos.map((product) => {
        const quantity = product.cantidad || 1;
        const matchedProduct = products.find(
          (candidate) => String(candidate.id) === String(product.productId)
        );

        const hasIgv = matchedProduct ? matchedProduct.has_igv : false;
        const description = matchedProduct?.description || product.descripcion || '';
        const unitPrice =
          matchedProduct?.base_price ||
          product.precio_base ||
          product.precio_total / (hasIgv ? 1.18 : 1) / quantity;

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

    const count = result.productos.length;
    setIaSuccess(
      `Listo — ${count} ${count === 1 ? 'producto detectado' : 'productos detectados'}. Revisa los datos antes de emitir.`
    );
    scrollToProducts();
  };

  const startRecording = async () => {
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

          try {
            const result = await processInvoiceAudio(base64Audio, 'audio/webm', sender?.id);
            if (result) fillFormWithResult(result);
          } catch (error) {
            setIaWarning(iaErrorMessage(error));
          } finally {
            setIsProcessing(false);
            setProcessingType(null);
          }
        };

        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIaWarning(null);
      setIaSuccess(null);
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

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setIaWarning(null);
      setIaSuccess(null);

      setTimeout(async () => {
        setIsProcessing(true);
        setProcessingType('image');

        try {
          const result = await processInvoiceImage(base64, sender?.id);
          if (result) fillFormWithResult(result);
        } catch (error) {
          setIaWarning(iaErrorMessage(error));
        } finally {
          setIsProcessing(false);
          setProcessingType(null);
        }
      }, 100);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const openCamera = () => {
    setPhotoMenuOpen(false);
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    setPhotoMenuOpen(false);
    galleryInputRef.current?.click();
  };

  const openNewProduct = () => setProductModal({ open: true, index: null });
  const openEditProduct = (index: number) => setProductModal({ open: true, index });
  const closeProductModal = () => setProductModal({ open: false, index: null });

  const handleProductSubmit = (item: InvoiceItem, saveToCatalog: boolean) => {
    setItems((prev) => {
      if (productModal.index === null) return [...prev, item];
      const next = [...prev];
      next[productModal.index] = item;
      return next;
    });
    if (saveToCatalog && onSaveProduct) {
      onSaveProduct({
        description: item.description,
        unit: item.unit,
        base_price: item.unit_price,
        has_igv: item.has_igv,
      });
    }
    closeProductModal();
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const POLL_INTERVAL_MS = 4_000;
  const POLL_TIMEOUT_MS = 90_000;

  const startPolling = (invoiceId: number) => {
    stopPolling();
    const startedAt = Date.now();
    pollingRef.current = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        setEmissionState('timeout');
        return;
      }
      try {
        const statusData = await invoiceService.getInvoiceStatus(invoiceId, sender?.id);
        if (statusData.status === InvoiceStatus.EMITIDO) {
          stopPolling();
          setNumeroComprobante(statusData.nro_comprobante_sunat);
          setSunatMessage(statusData.sunat_message);
          setEmissionState('emitido');
          try {
            const updated = await invoiceService.getInvoice(invoiceId, sender?.id);
            if (updated.pdf_base64) setPdfBase64(updated.pdf_base64);
          } catch { /* PDF opcional */ }
        } else if (statusData.status === InvoiceStatus.FALLO) {
          stopPolling();
          setSunatMessage(statusData.sunat_message);
          setEmissionFailedStep(statusData.sunat_failed_step);
          if (onRefresh) await onRefresh();
          setEmissionState('fallo');
        } else {
          setEmissionCurrentStep(statusData.current_step);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          stopPolling();
          setSunatMessage('No encontramos el comprobante. Vuelve a intentarlo desde el historial.');
          setEmissionState('fallo');
        }
        /* otros errores transitorios: mantener polling */
      }
    }, POLL_INTERVAL_MS);
  };

  const handleKeepEmitting = () => {
    resetForm();
    onKeepEmitting?.();
  };

  const handleRetry = async () => {
    if (!emissionSuccess?.id) return;
    setEmissionState('processing');
    setEmissionCurrentStep(null);
    setEmissionFailedStep(null);
    setSunatMessage(null);
    setNumeroComprobante(null);
    try {
      await invoiceService.emitInvoice(emissionSuccess.id, sender?.id);
      startPolling(emissionSuccess.id);
    } catch (e: any) {
      setEmissionState('fallo');
      setSunatMessage(e.message || 'Error al reintentar');
    }
  };

  const resetForm = () => {
    stopPolling();
    setClientData({
      name: '',
      document: '',
      phone: '',
      invoice_date: new Date().toLocaleDateString('en-CA'),
    });
    setItems([]);
    setDocumentLookup('idle');
    setPreviewImage(null);
    setEmissionSuccess(null);
    setPdfBase64(null);
    setErrors([]);
    setEmissionStep(0);
    setEmissionState(null);
    setEmissionCurrentStep(null);
    setEmissionFailedStep(null);
    setSunatMessage(null);
    setNumeroComprobante(null);
    setIaWarning(null);
    setIaSuccess(null);
  };

  const clearAll = () => {
    if (!confirm('¿Deseas limpiar todo el formulario?')) return;
    resetForm();
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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

  const validateInvoiceForm = (): boolean => {
    const validItems = items.filter((item) => item.description.trim().length > 0);
    const result = invoiceEmissionSchema.safeParse({
      invoice_type: invoiceType,
      clientData,
      items: validItems.map((item) => ({
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
      return false;
    }

    setErrors([]);
    return true;
  };

  const handleOpenConfirm = () => {
    if (!validateInvoiceForm()) return;

    const hasItemWithoutPrice = items.some(
      (item) => item.description.trim().length > 0 && item.unit_price <= 0
    );
    if (hasItemWithoutPrice) {
      setErrors(['Hay productos sin precio (S/ 0.00). Asígnales un precio antes de emitir.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleOpenDraftConfirm = () => {
    if (validateInvoiceForm()) setShowDraftConfirmModal(true);
  };

  const handleSaveDraft = async () => {
    if (!sender) return;

    setShowDraftConfirmModal(false);
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
        nro_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        subtotal: gravada + exonerada,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_base64: null,
        sunat_message: null,
        sunat_failed_step: null,
        sunat_current_step: null,
        referenced_invoice_id: null,
        credit_note_reason: null,
        credit_note_sustento: null,
        items,
      };

      await onSaveDraft(invoiceData);
      setClientData({ name: '', document: '', phone: '', invoice_date: new Date().toLocaleDateString('en-CA') });
      setItems([]);
      setDocumentLookup('idle');
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
        nro_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        subtotal: gravada + exonerada,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_base64: null,
        sunat_message: null,
        sunat_failed_step: null,
        sunat_current_step: null,
        referenced_invoice_id: null,
        credit_note_reason: null,
        credit_note_sustento: null,
        items,
      };

      setEmissionStep(2);
      const createdInvoice = await onEmit(invoiceData);

      if (!createdInvoice) {
        setEmissionStep(0);
        return;
      }

      setEmissionStep(3);
      const finalInvoice: Invoice = { ...createdInvoice, status: InvoiceStatus.PROCESANDO };

      setEmissionSuccess(finalInvoice);
      setEmissionState('processing');
      startPolling(finalInvoice.id);
    } catch (error) {
      setErrors([getUserMessage(error, 'No se pudo emitir el documento.')]);
      setEmissionStep(0);
    } finally {
      setIsEmitting(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!emissionSuccess || emissionState !== 'emitido') return;
    if (pdfBase64) {
      const filename = `${emissionSuccess.series}-${emissionSuccess.number}.pdf`;
      const shared = await PDFService.shareNative(pdfBase64, filename, `Comprobante ${filename}`);
      if (shared) return;
    }
    PDFService.shareWhatsApp(emissionSuccess as any, clientData.phone, pdfBase64 || undefined);
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64 || !emissionSuccess) return;
    PDFService.downloadPDF(pdfBase64, `${emissionSuccess.series}-${emissionSuccess.number}.pdf`);
  };

  const handleViewPdf = () => {
    if (!pdfBase64) return;
    PDFService.viewPDF(pdfBase64);
  };

  if (emissionState !== null) {
    const progress = emissionProgress(emissionCurrentStep);
    const failInfo = getSunatError(emissionFailedStep);
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center animate-in fade-in duration-500">

        {/* ── PROCESANDO ── */}
        {emissionState === 'processing' && (
          <>
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-8">
              <Loader2 size={48} className="text-blue-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
              Validando en SUNAT
            </h2>
            {emissionSuccess && (
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">
                {emissionSuccess.series}-{emissionSuccess.number}
              </p>
            )}

            <div className="w-full max-w-xs mb-10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                  {progress.label}
                </span>
                <span className="text-[11px] font-black text-slate-400">{progress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <div className="w-full max-w-xs">
              <button
                onClick={handleKeepEmitting}
                className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                Seguir emitiendo <ArrowRight size={18} />
              </button>
              <p className="text-[10px] font-bold text-slate-400 mt-3 leading-snug">
                Se procesa solo en segundo plano. Mira el resultado en Historial.
              </p>
            </div>

            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-10">
              FactuMovil AI • Validado SUNAT
            </p>
          </>
        )}

        {/* ── EMITIDO ── */}
        {emissionState === 'emitido' && (
          <>
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-50">
              <CheckCircle2 size={56} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2 text-emerald-600">
              ¡Emitido!
            </h2>
            {emissionSuccess && (
              <p className="text-slate-500 font-medium text-sm mb-1">
                <span className="font-black text-slate-900">
                  {emissionSuccess.series}-{emissionSuccess.number}
                </span>
              </p>
            )}
            {numeroComprobante && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">
                Nº SUNAT: {numeroComprobante}
              </p>
            )}
            {!numeroComprobante && <div className="mb-10" />}

            <div className="w-full space-y-3 max-w-xs">
              <button
                onClick={handleWhatsAppShare}
                className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                <MessageCircle size={20} />
                {pdfBase64 ? 'Compartir PDF' : 'Compartir WhatsApp'}
              </button>

              {pdfBase64 && (
                <button
                  onClick={handleDownloadPdf}
                  className="w-full bg-blue-50 text-blue-600 border border-blue-100 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Download size={18} /> Descargar PDF
                </button>
              )}

              <button
                onClick={resetForm}
                className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-200 transition-all"
              >
                <RotateCcw size={18} /> Nueva Venta
              </button>
            </div>

            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-8">
              FactuMovil AI • Validado SUNAT
            </p>
          </>
        )}

        {/* ── FALLO ── */}
        {emissionState === 'fallo' && (
          <>
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
              <XCircle size={56} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3 text-red-600">
              {failInfo.title}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
              {failInfo.message}
            </p>

            <div className="w-full space-y-3 max-w-xs">
              {sender?.sunat_credentials_invalid ? (
                <button
                  onClick={onSelectSender}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-100 active:scale-95 transition-all"
                >
                  <KeyRound size={18} /> Actualizar usuario SUNAT
                </button>
              ) : (
                <button
                  onClick={handleRetry}
                  className="w-full bg-red-600 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-100 active:scale-95 transition-all"
                >
                  <RefreshCw size={18} /> Reintentar
                </button>
              )}
              <button
                onClick={resetForm}
                className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-200 transition-all"
              >
                <RotateCcw size={18} /> Nueva Venta
              </button>
            </div>
          </>
        )}

        {/* ── TIMEOUT ── */}
        {emissionState === 'timeout' && (
          <>
            <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-8">
              <AlertTriangle size={52} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3 text-amber-600">
              Procesando en SUNAT
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
              La emisión está tardando más de lo esperado. Revisa el historial para ver el resultado.
            </p>

            <div className="w-full space-y-3 max-w-xs">
              <button
                onClick={resetForm}
                className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-200 transition-all"
              >
                <RotateCcw size={18} /> Nueva Venta
              </button>
            </div>
          </>
        )}

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

      {iaSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2
            className="text-emerald-500 shrink-0 mt-0.5"
            size={16}
            style={{ animation: 'iaCheckPop 0.45s ease-out' }}
          />
          <div className="flex-1">
            <p className="text-emerald-800 text-[11px] font-black uppercase tracking-wide leading-relaxed">
              {iaSuccess}
            </p>
          </div>
          <button onClick={() => setIaSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
            <X size={14} />
          </button>
          <style>{`
            @keyframes iaCheckPop {
              0%   { transform: scale(0);    opacity: 0; }
              60%  { transform: scale(1.25); opacity: 1; }
              100% { transform: scale(1);    opacity: 1; }
            }
          `}</style>
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

              {/* AI Star — estilo Gemini con colores del sistema */}
              <div className="relative z-10 mb-1 flex items-center justify-center" style={{width:120, height:120}}>

                {/* Halo exterior pulsante */}
                <div style={{
                  position:'absolute', inset:0,
                  borderRadius:'50%',
                  background:'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)',
                  animation:'halo 3.5s ease-in-out infinite',
                }}/>

                {/* Estrella principal — 4 pétalos curvos */}
                <svg viewBox="0 0 120 120" width="100" height="100" style={{
                  position:'absolute',
                  animation:'starSpin 10s linear infinite',
                  filter:'drop-shadow(0 0 14px rgba(59,130,246,0.55)) drop-shadow(0 0 4px rgba(99,102,241,0.4))',
                }}>
                  <defs>
                    <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#93c5fd"/>
                      <stop offset="45%"  stopColor="#3b82f6"/>
                      <stop offset="100%" stopColor="#1d4ed8"/>
                    </linearGradient>
                    <linearGradient id="sg2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%"   stopColor="#a5b4fc"/>
                      <stop offset="45%"  stopColor="#6366f1"/>
                      <stop offset="100%" stopColor="#3b82f6"/>
                    </linearGradient>
                    <radialGradient id="sg3" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"   stopColor="#fff" stopOpacity="0.95"/>
                      <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0"/>
                    </radialGradient>
                  </defs>

                  {/* Pétalo vertical (arriba + abajo) */}
                  <path d="M60 8 C63 34 63 34 60 60 C57 34 57 34 60 8Z" fill="url(#sg1)"/>
                  <path d="M60 112 C63 86 63 86 60 60 C57 86 57 86 60 112Z" fill="url(#sg1)"/>

                  {/* Pétalo horizontal (izq + der) */}
                  <path d="M8 60 C34 63 34 63 60 60 C34 57 34 57 8 60Z" fill="url(#sg2)"/>
                  <path d="M112 60 C86 63 86 63 60 60 C86 57 86 57 112 60Z" fill="url(#sg2)"/>

                  {/* Núcleo brillante */}
                  <circle cx="60" cy="60" r="7" fill="url(#sg3)"/>
                </svg>

                {/* Estrella secundaria — 45° girada al revés, más pequeña */}
                <svg viewBox="0 0 120 120" width="58" height="58" style={{
                  position:'absolute',
                  animation:'starSpin 7s linear infinite reverse',
                  opacity:0.55,
                  filter:'drop-shadow(0 0 6px rgba(99,102,241,0.5))',
                }}>
                  <path d="M60 22 C62 42 62 42 60 60 C58 42 58 42 60 22Z" fill="#a5b4fc"/>
                  <path d="M60 98 C62 78 62 78 60 60 C58 78 58 78 60 98Z" fill="#a5b4fc"/>
                  <path d="M22 60 C42 62 42 62 60 60 C42 58 42 58 22 60Z" fill="#818cf8"/>
                  <path d="M98 60 C78 62 78 62 60 60 C78 58 78 58 98 60Z" fill="#818cf8"/>
                </svg>

                {/* Partículas flotantes */}
                {([
                  {size:7,  cx:18, cy:22, color:'#93c5fd', delay:'0s',    dur:'2.6s'},
                  {size:5,  cx:96, cy:18, color:'#a5b4fc', delay:'0.9s',  dur:'3.1s'},
                  {size:6,  cx:104,cy:80, color:'#60a5fa', delay:'1.7s',  dur:'2.3s'},
                  {size:4,  cx:14, cy:88, color:'#818cf8', delay:'0.4s',  dur:'3.8s'},
                  {size:5,  cx:58, cy:8,  color:'#bfdbfe', delay:'1.2s',  dur:'2.9s'},
                ] as {size:number,cx:number,cy:number,color:string,delay:string,dur:string}[]).map((p, i) => (
                  <svg key={i} viewBox="0 0 10 10" width={p.size} height={p.size} style={{
                    position:'absolute',
                    left: p.cx - p.size/2,
                    top:  p.cy - p.size/2,
                    animation:`particle ${p.dur} ease-in-out ${p.delay} infinite`,
                  }}>
                    <path d="M5 0 L5.5 4.5 L10 5 L5.5 5.5 L5 10 L4.5 5.5 L0 5 L4.5 4.5Z" fill={p.color}/>
                  </svg>
                ))}
              </div>

              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] z-10">
                Asistente IA
              </p>
              <p className="text-slate-400 text-[9px] font-semibold text-center leading-relaxed z-10 mt-1 px-4">
                Toma foto o grábate y emite una factura en segundos
              </p>

              <style>{`
                @keyframes starSpin {
                  from { transform: rotate(0deg); }
                  to   { transform: rotate(360deg); }
                }
                @keyframes halo {
                  0%,100% { transform: scale(0.9); opacity: 0.6; }
                  50%     { transform: scale(1.2); opacity: 1;   }
                }
                @keyframes particle {
                  0%,100% { opacity: 0;   transform: scale(0.3) rotate(0deg);   }
                  30%     { opacity: 1;   transform: scale(1.1) rotate(20deg);  }
                  65%     { opacity: 0.6; transform: scale(0.8) rotate(-10deg); }
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
                onClick={() => setPhotoMenuOpen(true)}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                <Camera size={18} /> Foto
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
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScan}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScan}
        />

        {photoMenuOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-[fm-backdrop-in_0.15s_ease-out]"
            onClick={() => setPhotoMenuOpen(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-t-[36px] p-4 pb-8 shadow-2xl animate-[fm-sheet-in_0.2s_ease-out]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              <button
                onClick={openCamera}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Camera size={20} />
                </span>
                <span className="font-bold text-sm text-slate-800">Tomar foto</span>
              </button>

              <button
                onClick={openGallery}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Images size={20} />
                </span>
                <span className="font-bold text-sm text-slate-800">Subir de galería</span>
              </button>

              <button
                onClick={() => setPhotoMenuOpen(false)}
                className="w-full mt-2 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-400 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
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
          <div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={clientData.document}
                onChange={(event) => {
                  const digits = onlyDigits(event.target.value);
                  setClientData((prev) => ({ ...prev, document: digits }));
                  if (digits.length !== DNI_LENGTH && digits.length !== RUC_LENGTH) {
                    setDocumentLookup('idle');
                  }
                }}
                inputMode="numeric"
                maxLength={RUC_LENGTH}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-11 pr-10 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
                placeholder="DNI o RUC"
              />
              {documentLookup === 'searching' && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                />
              )}
              {documentLookup === 'found' && (
                <CheckCircle2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                />
              )}
            </div>

            <p
              className={`text-[11px] font-bold mt-2 ml-1 ${
                documentLookup === 'notfound'
                  ? 'text-amber-500'
                  : documentLookup === 'found'
                    ? 'text-emerald-500'
                    : documentLookup === 'searching'
                      ? 'text-blue-500'
                      : 'text-slate-400'
              }`}
            >
              {documentLookup === 'searching' && 'Buscando datos…'}
              {documentLookup === 'found' && 'Cliente encontrado ✓'}
              {documentLookup === 'notfound' && 'No lo encontramos. Escribe el nombre abajo.'}
              {documentLookup === 'idle' && 'Escríbelo y traemos el nombre automáticamente'}
            </p>
          </div>

          <input
            value={clientData.name}
            onChange={(event) =>
              setClientData((prev) => ({ ...prev, name: event.target.value.toUpperCase() }))
            }
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase placeholder:text-slate-300"
            placeholder="Nombre / Razón Social"
          />

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Fecha de emisión
            </label>
            <input
              type="date"
              value={clientData.invoice_date}
              min={minInvoiceDate}
              max={maxInvoiceDate}
              onChange={(event) =>
                setClientData((prev) => ({ ...prev, invoice_date: event.target.value }))
              }
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            value={clientData.phone}
            onChange={(event) =>
              setClientData((prev) => ({ ...prev, phone: event.target.value }))
            }
            inputMode="tel"
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
            placeholder="Celular para envío WhatsApp"
          />
        </div>
      </section>

      <section ref={productsSectionRef} className="space-y-4 scroll-mt-4">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
              Detalle
            </h3>
          </div>

          <button
            onClick={openNewProduct}
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus size={14} /> Producto
          </button>
        </div>

        {items.length === 0 ? (
          <button
            onClick={openNewProduct}
            className="w-full bg-white rounded-[28px] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center gap-3 text-center active:scale-[0.99] transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-500 uppercase tracking-wide">
                Aún no agregaste productos
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1">Toca aquí para agregar el primero</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={`item-${index}-${item.product_id ?? 'new'}`}
                className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-4 flex items-center gap-3 animate-in slide-in-from-left duration-300"
              >
                <div className="shrink-0 w-14 text-center">
                  <p className="text-lg font-black text-slate-800 leading-none">{item.quantity}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1">
                    {unitLabel(item.unit)}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm uppercase truncate">
                    {item.description || 'Sin nombre'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    S/ {Number(item.unit_price).toFixed(2)} c/u · {item.has_igv ? 'IGV 18%' : 'Exonerado'}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-blue-600">S/ {Number(item.total).toFixed(2)}</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <button
                      onClick={() => openEditProduct(index)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={openNewProduct}
              className="w-full border-2 border-dashed border-blue-200 text-blue-600 rounded-[24px] py-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest active:scale-[0.99] transition-all"
            >
              <Plus size={16} /> Agregar otro producto
            </button>
          </div>
        )}
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
              onClick={handleOpenDraftConfirm}
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

            {sender?.sunat_credentials_invalid ? (
              <>
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-600 leading-snug">
                    Tus credenciales SUNAT son incorrectas. Actualízalas para poder emitir.
                  </p>
                </div>
                <button
                  onClick={onSelectSender}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white h-16 rounded-[24px] shadow-xl shadow-red-200/50 font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <KeyRound size={22} /> Corregir credenciales
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenConfirm}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white h-16 rounded-[24px] shadow-xl shadow-emerald-200/50 font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 hover:from-emerald-600 hover:to-emerald-700"
              >
                <CheckCircle2 size={22} /> Emitir Documento
              </button>
            )}
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

            <p className="text-slate-500 text-xs font-medium mb-6 leading-relaxed">
              Está por emitir una <span className="text-blue-600 font-black">{invoiceType}</span>{' '}
              oficial ante SUNAT. Revisa los datos antes de confirmar.
            </p>

            <div className="bg-slate-50 rounded-[24px] p-5 mb-8 space-y-2 text-left">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">Cliente</span>
                <span className="text-xs font-black text-slate-700 truncate">{clientData.name || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Productos</span>
                <span className="text-xs font-black text-slate-700">{items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total</span>
                <span className="text-sm font-black text-blue-600">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            {exoneratedItems.length > 0 && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-6 text-left">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-700 leading-snug">
                  {exoneratedItems.length === 1
                    ? '1 producto sin IGV (exonerado): '
                    : `${exoneratedItems.length} productos sin IGV (exonerado): `}
                  <span className="font-black">
                    {exoneratedItems.map((item) => item.description || 'Sin nombre').join(', ')}
                  </span>
                </p>
              </div>
            )}

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

      {showDraftConfirmModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
          <div className="bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-slate-100 text-slate-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <Layers size={40} />
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">
              ¿Guardar como borrador?
            </h3>

            <p className="text-slate-500 text-xs font-medium mb-6 leading-relaxed">
              Se guardará sin emitir a SUNAT. Podrás editarlo y emitirlo después.
            </p>

            <div className="bg-slate-50 rounded-[24px] p-5 mb-8 space-y-2 text-left">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">Cliente</span>
                <span className="text-xs font-black text-slate-700 truncate">{clientData.name || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Productos</span>
                <span className="text-xs font-black text-slate-700">{items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total</span>
                <span className="text-sm font-black text-blue-600">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-40"
              >
                Guardar borrador
              </button>

              <button
                onClick={() => setShowDraftConfirmModal(false)}
                className="w-full bg-white border border-slate-100 text-slate-400 py-5 rounded-[22px] font-black text-xs uppercase tracking-widest active:bg-slate-50 transition-all"
              >
                Revisar datos
              </button>
            </div>
          </div>
        </div>
      )}

      {sender?.sunat_credentials_invalid && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-6">
            <KeyRound size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">
            Credenciales SUNAT incorrectas
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">
            Debes corregir tu usuario y clave SOL antes de poder emitir.
          </p>
          <button
            onClick={() => (onSaveCredentials ? setShowCredentialsModal(true) : onSelectSender())}
            className="w-full max-w-xs bg-gradient-to-r from-orange-500 to-red-500 text-white h-16 rounded-[24px] shadow-xl shadow-red-200/50 font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <KeyRound size={22} /> Corregir credenciales
          </button>
        </div>
      )}

      {showCredentialsModal && sender && onSaveCredentials && (
        <SunatCredentialsModal
          hasCredentials={sender.has_sunat_credentials}
          empresaName={sender.name}
          onSaveCredentials={onSaveCredentials}
          onClose={() => setShowCredentialsModal(false)}
        />
      )}

      {productModal.open && (
        <ProductFormModal
          initialItem={productModal.index !== null ? items[productModal.index] : null}
          products={products.filter(
            (product) => String(product.sender_id) === String(sender?.id)
          )}
          canSaveToCatalog={!!onSaveProduct}
          onSubmit={handleProductSubmit}
          onClose={closeProductModal}
        />
      )}
    </div>
  );
};

export default Billing;