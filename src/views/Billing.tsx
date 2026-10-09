// views/Billing.tsx

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FlaskConical,
  Images,
  Layers,
  Loader2,
  MessageCircle,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Square,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import ProductFormModal from '../components/ProductFormModal';
import SaleSummary from '../components/SaleSummary';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Notice from '../components/ui/Notice';
import SectionTitle from '../components/ui/SectionTitle';
import SegmentedControl from '../components/ui/SegmentedControl';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import { useEmissionUsage } from '../hooks/useEmissionUsage';
import { useInvoicePreview } from '../hooks/useInvoicePreview';
import { cachedUnits } from '../hooks/useUnits';
import { invoiceEmissionSchema } from '../schemas/business';
import { invoiceService } from '../services/business/invoiceService';
import { lookupService } from '../services/business/lookupService';
import { pdfCache } from '../services/business/pdfCache';
import { ApiError, getUserMessage } from '../services/core/apiClient';
import { type FormSnapshot, mergeExtraction } from '../services/integrations/aiExtractionMerge';
import { processInvoiceAudio, processInvoiceImage } from '../services/integrations/geminiService';
import { PDFService } from '../services/integrations/pdfService';
import { prepareImageForAI } from '../services/utils/imagePrep';
import { igvTypeLabel, unitLabel } from '../services/utils/invoiceMath';
import {
  type BillingClientData,
  type Client,
  type IAExtractionResult,
  type IgvType,
  type Invoice,
  type InvoiceItem,
  InvoiceStatus,
  InvoiceType,
  type Product,
  type Sender,
  type UnitOfMeasure,
} from '../types';

const DOCUMENT_TYPE_OPTIONS = [
  { value: InvoiceType.BOLETA, label: 'Boleta' },
  { value: InvoiceType.FACTURA, label: 'Factura' },
];

const DNI_LENGTH = 8;
const RUC_LENGTH = 11;
const onlyDigits = (value: string): string => value.replace(/\D/g, '');

type EmissionState = 'processing' | 'emitido' | 'fallo' | 'prueba' | 'sin_confirmar' | null;

// Desenlaces que no son ni exito ni error: nada se emitio, pero tampoco fallo nada. Comparten
// pantalla porque el usuario necesita lo mismo en ambos — saber que paso y adonde ir.
const NEUTRAL_OUTCOMES = {
  prueba: {
    title: 'Prueba completada',
    message:
      'El comprobante recorrió todo el flujo en SUNAT sin llegar a emitirse. Quedó como borrador en el historial.',
  },
  sin_confirmar: {
    title: 'Sigue procesando',
    message:
      'SUNAT está tardando más de lo normal. Revisa el estado del comprobante en el historial en unos minutos.',
  },
} as const;

// Borrador no guardado (cliente + productos a medio llenar): sobrevive a una navegacion
// accidental dentro de la misma pestana, pero no mas alla — para eso existe "Guardar
// borrador", que si persiste en la BD. Scoped por sender para que el de una empresa no
// se filtre a otra.
const billingDraftKey = (senderId: number): string => `fm_billing_draft_${senderId}`;

const AmountLine: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <div className="flex items-center justify-between border-b border-slate-100 py-2">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-semibold text-slate-900">S/ {amount.toFixed(2)}</span>
  </div>
);

interface BillingDraftCache {
  invoiceType: InvoiceType;
  clientData: BillingClientData;
  items: InvoiceItem[];
}

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

const AUDIO_BITS_PER_SECOND = 24_000;

// ~2.5 minutos de dictado a 24 kbps. Por encima de esto avisamos en vez de dejar que el
// proxy responda 413 sin CORS, que en el navegador se ve como un fallo de red opaco.
const MAX_AUDIO_BYTES = 450 * 1024;

// Cada error de formulario puede apuntar a un producto puntual (itemIndex = indice en
// `items`) para poder resaltar esa fila y hacer scroll hasta ella, no solo mostrar texto.
interface FormError {
  message: string;
  itemIndex?: number;
}

// Un mensaje de Zod suelto no dice donde mirar; el path si: ['items', 2, 'quantity'].
// Ese "2" es el indice dentro de `validItems` (los items con descripcion, ya filtrados),
// por eso se remapea con itemIndexByValidIndex antes de convertirlo en "Producto N".
const describeIssue = (
  issue: { path: PropertyKey[]; message: string },
  itemIndexByValidIndex: number[],
): FormError => {
  const [section, validIndex] = issue.path;
  if (section === 'items' && typeof validIndex === 'number') {
    const itemIndex = itemIndexByValidIndex[validIndex];
    return { message: `Producto ${itemIndex + 1}: ${issue.message}`, itemIndex };
  }
  return { message: issue.message };
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
  onSaveProduct?: (data: {
    description: string;
    unit: UnitOfMeasure;
    sale_price: number;
    igv_type: IgvType;
  }) => Promise<void>;
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
  const [errors, setErrors] = useState<FormError[]>([]);
  const [iaWarning, setIaWarning] = useState<string | null>(null);
  const [iaSuccess, setIaSuccess] = useState<string | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [emissionStep, setEmissionStep] = useState(0);
  const [emissionSuccess, setEmissionSuccess] = useState<Invoice | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [emissionState, setEmissionState] = useState<EmissionState>(null);
  const [sunatMessage, setSunatMessage] = useState<string | null>(null);
  const [numeroComprobante, setNumeroComprobante] = useState<string | null>(null);

  const draftRestoredRef = useRef(false);
  const skipNextDraftPersistRef = useRef(false);

  React.useEffect(() => {
    if (draftRestoredRef.current || !sender) return;
    draftRestoredRef.current = true;

    const cachedRaw = sessionStorage.getItem(billingDraftKey(sender.id));
    if (!cachedRaw) return;

    try {
      const cached: BillingDraftCache = JSON.parse(cachedRaw);
      skipNextDraftPersistRef.current = true;
      setInvoiceType(cached.invoiceType);
      setClientData(cached.clientData);
      setItems(cached.items);
    } catch {
      sessionStorage.removeItem(billingDraftKey(sender.id));
    }
  }, [sender]);

  React.useEffect(() => {
    if (!sender) return;
    // El render que aplica la restauracion de arriba todavia trae el estado vacio previo:
    // sin este guard, esta misma pasada lo tomaria como "formulario vacio" y borraria el
    // borrador que recien se encontro, antes de que llegue a pintarse.
    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }

    const key = billingDraftKey(sender.id);
    const hasContent =
      clientData.name.trim() !== '' || clientData.document.trim() !== '' || items.length > 0;

    if (!hasContent) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, JSON.stringify({ invoiceType, clientData, items }));
  }, [sender, invoiceType, clientData, items]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(
    () => () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    },
    [],
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const productsSectionRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // La respuesta de la IA llega segundos despues del disparo: el merge debe leer el
  // formulario tal como esta ahora, no el que capturo el closure al tomar la foto.
  const formSnapshotRef = useRef<FormSnapshot>({ invoiceType, clientData });
  React.useEffect(() => {
    formSnapshotRef.current = { invoiceType, clientData };
  }, [invoiceType, clientData]);

  const [documentLookup, setDocumentLookup] = useState<'idle' | 'searching' | 'found' | 'notfound'>(
    'idle',
  );

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

  // Unica fuente de verdad para "que filas resaltar en rojo": se deriva de errors en vez
  // de mantener un estado aparte, asi nunca puede desincronizarse del banner de errores.
  const invalidItemIndexes = React.useMemo(
    () =>
      new Set(
        errors
          .map((error) => error.itemIndex)
          .filter((index): index is number => index !== undefined),
      ),
    [errors],
  );

  // Los montos declarados los calcula Factu API: aca no hay ningun 0.18 ni ningun 1.18, y
  // no debe volver a haberlo. Mientras no llega la respuesta, la pantalla dice que esta
  // calculando en vez de mostrar un numero propio: que la caja y el comprobante dijeran
  // cosas distintas es exactamente el bug que esto cierra.
  const {
    preview,
    lineOf,
    isCalculating: isCalculatingTotals,
    failed: totalsFailed,
    errorMessage: totalsError,
  } = useInvoicePreview({
    senderId: sender?.id,
    invoiceType,
    invoiceDate: clientData.invoice_date,
    clientName: clientData.name,
    clientDocument: clientData.document,
    items,
  });

  // El cupo del mes. Solo informa: el bloqueo lo decide el backend al emitir, con la misma
  // cuenta. Aca no se resta nada.
  const { usage, refresh: refreshUsage } = useEmissionUsage(sender?.id);
  const showUsage = usage?.enforced === true;
  const lowOnQuota = showUsage && usage.remaining <= 10;

  const hasTotals = preview !== null;
  const gravada = Number(preview?.taxed_amount ?? 0);
  const exonerada = Number(preview?.exempt_amount ?? 0);
  const inafecta = Number(preview?.unaffected_amount ?? 0);
  const igvTotal = Number(preview?.igv ?? 0);
  const total = Number(preview?.total ?? 0);

  const exoneratedItems = items.filter((item) => item.igv_type !== 'GRAVADO');

  const maxInvoiceDate = new Date().toLocaleDateString('en-CA');
  const minInvoiceDate = (() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - 2);
    return limit.toLocaleDateString('en-CA');
  })();

  const scrollToProducts = () => {
    requestAnimationFrame(() =>
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const scrollToItem = (index: number) => {
    requestAnimationFrame(() =>
      itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };

  // Si algun error apunta a un producto, ese es el lugar mas util donde llevar al usuario;
  // si no (ej. falta el cliente), la unica opcion sensata sigue siendo subir al tope.
  const scrollToFirstIssue = (formErrors: FormError[]) => {
    const firstItemIndex = formErrors.find((error) => error.itemIndex !== undefined)?.itemIndex;
    if (firstItemIndex !== undefined) {
      scrollToItem(firstItemIndex);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fillFormWithResult = (result: IAExtractionResult) => {
    setIaWarning(null);
    setIaSuccess(null);

    const merged = mergeExtraction(result, formSnapshotRef.current, products, cachedUnits());
    const reviewNote = merged.ignored.length ? ` Revisa: ${merged.ignored.join(', ')}.` : '';

    setInvoiceType(merged.invoiceType);
    setClientData(merged.clientData);

    if (merged.items.length === 0) {
      const detectedName = merged.clientData.name.trim();
      setIaWarning(
        (detectedName
          ? `Cliente "${detectedName}" detectado. No se identificaron productos — agrégalos manualmente.`
          : 'No se identificaron productos. Intenta dictar más claro o agrégalos manualmente.') +
          reviewNote,
      );
      return;
    }

    setItems(merged.items);

    const count = merged.items.length;
    setIaSuccess(
      `Listo — ${count} ${count === 1 ? 'producto detectado' : 'productos detectados'}.` +
        `${reviewNote} Revisa los datos antes de emitir.`,
    );
    scrollToProducts();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Opus a 24 kbps transcribe voz sin perder inteligibilidad y pesa ~5 veces menos que
      // el bitrate por defecto (~128 kbps = 1 MB por minuto, que el proxy rechaza).
      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: AUDIO_BITS_PER_SECOND });

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // El contenedor real lo decide el navegador: Chrome da webm/opus, Safari mp4.
        const audioMime = recorder.mimeType?.split(';')[0] || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: audioMime });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > MAX_AUDIO_BYTES) {
          setIaWarning(
            'La grabación es muy larga. Dicta la venta en menos de un minuto e intenta de nuevo.',
          );
          return;
        }

        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          setProcessingType('audio');

          try {
            const result = await processInvoiceAudio(base64Audio, audioMime, sender?.id);
            if (result) fillFormWithResult(result);
          } catch (error) {
            setIaWarning(iaErrorMessage(error));
          } finally {
            setIsProcessing(false);
            setProcessingType(null);
          }
        };

        reader.readAsDataURL(audioBlob);
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
    event.target.value = '';
    if (!file) return;

    setIaWarning(null);
    setIaSuccess(null);
    setIsProcessing(true);
    setProcessingType('image');

    try {
      const { dataUrl, mimeType } = await prepareImageForAI(file);
      setPreviewImage(dataUrl);
      fillFormWithResult(await processInvoiceImage(dataUrl, mimeType, sender?.id));
    } catch (error) {
      setIaWarning(iaErrorMessage(error));
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
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
        sale_price: item.sale_price,
        igv_type: item.igv_type,
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
  const MAX_POLL_ATTEMPTS = 75; // ~5 minutos; una emisión normal tarda menos de uno

  const startPolling = (invoiceId: number) => {
    stopPolling();
    let attempts = 0;

    pollingRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        stopPolling();
        if (onRefresh) await onRefresh();
        setEmissionState('sin_confirmar');
        return;
      }

      try {
        const statusData = await invoiceService.getInvoiceStatus(invoiceId, sender?.id);
        if (statusData.status === InvoiceStatus.EMITIDO) {
          stopPolling();
          setNumeroComprobante(statusData.nro_comprobante_sunat);
          setSunatMessage(statusData.sunat_message);
          setEmissionState('emitido');
          void refreshUsage();
          try {
            // El PDF ya no viaja dentro de la factura: se baja del endpoint, que lo trae
            // del link que guardo Factu API.
            const base64 = await pdfCache.load(invoiceId, sender?.id);
            if (base64) setPdfBase64(base64);
          } catch {
            /* PDF opcional */
          }
        } else if (statusData.status === InvoiceStatus.FALLO) {
          stopPolling();
          setSunatMessage(statusData.sunat_message);
          if (onRefresh) await onRefresh();
          setEmissionState('fallo');
        } else if (statusData.status === InvoiceStatus.BORRADOR) {
          stopPolling();
          setSunatMessage(statusData.sunat_message);
          if (onRefresh) await onRefresh();
          setEmissionState('prueba');
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
      (invoice) => invoice.sender_id === sender.id && invoice.invoice_type === invoiceType,
    );

    if (senderInvoices.length === 0) return '00000001';

    const lastNumber = Math.max(...senderInvoices.map((invoice) => parseInt(invoice.number, 10)));
    return String(lastNumber + 1).padStart(6, '0');
  };

  const validateInvoiceForm = (): boolean => {
    const validItemsWithIndex = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.description.trim().length > 0);

    const result = invoiceEmissionSchema.safeParse({
      invoice_type: invoiceType,
      clientData,
      items: validItemsWithIndex.map(({ item }) => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        sale_price: item.sale_price,
        igv_type: item.igv_type,
      })),
    });

    if (!result.success) {
      const itemIndexByValidIndex = validItemsWithIndex.map(({ index }) => index);
      const formErrors = result.error.issues.map((issue) =>
        describeIssue(issue, itemIndexByValidIndex),
      );
      setErrors(formErrors);
      scrollToFirstIssue(formErrors);
      return false;
    }

    setErrors([]);
    return true;
  };

  const handleOpenConfirm = () => {
    if (!validateInvoiceForm()) return;

    const itemsWithoutPrice = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.description.trim().length > 0 && item.sale_price <= 0);

    if (itemsWithoutPrice.length > 0) {
      const formErrors = itemsWithoutPrice.map(({ index }) => ({
        message: `Producto ${index + 1}: asígnale un precio antes de emitir (S/ 0.00).`,
        itemIndex: index,
      }));
      setErrors(formErrors);
      scrollToFirstIssue(formErrors);
      return;
    }

    // Sin total no se emite: el cajero tiene que ver cuanto cobra antes de que el
    // comprobante exista. Lo calcula Factu API, asi que si no respondio, se espera.
    if (!hasTotals) {
      const formErrors = [
        {
          message: isCalculatingTotals
            ? 'Espera a que termine de calcularse el total.'
            : 'No se pudo calcular el total. Revisa tu conexión e intenta de nuevo.',
        },
      ];
      setErrors(formErrors);
      scrollToFirstIssue(formErrors);
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
        client_name: clientData.name.trim().toUpperCase(),
        client_document: clientData.document || null,
        invoice_type: invoiceType,
        series,
        number: nextNumber,
        nro_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        taxed_amount: gravada,
        exempt_amount: exonerada,
        unaffected_amount: inafecta,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_ticket_url: null,
        pdf_a4_url: null,
        sunat_message: null,
        referenced_invoice_id: null,
        credit_note_reason: null,
        credit_note_sustento: null,
        items,
      };

      await onSaveDraft(invoiceData);
      setClientData({
        name: '',
        document: '',
        phone: '',
        invoice_date: new Date().toLocaleDateString('en-CA'),
      });
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
        client_name: clientData.name.trim().toUpperCase(),
        client_document: clientData.document || null,
        invoice_type: invoiceType,
        series,
        number: nextNumber,
        nro_comprobante_sunat: null,
        invoice_date: clientData.invoice_date,
        taxed_amount: gravada,
        exempt_amount: exonerada,
        unaffected_amount: inafecta,
        igv: igvTotal,
        total,
        status: InvoiceStatus.BORRADOR,
        task_id: null,
        pdf_ticket_url: null,
        pdf_a4_url: null,
        sunat_message: null,
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

      // El formulario sigue "lleno" en pantalla mientras se ve el exito, pero ya se
      // emitio: si el usuario navega por accidente y vuelve, no debe reaparecer y
      // arriesgar una emision duplicada.
      if (sender) sessionStorage.removeItem(billingDraftKey(sender.id));
      setEmissionSuccess(finalInvoice);
      setEmissionState('processing');
      startPolling(finalInvoice.id);
    } catch (error) {
      setErrors([{ message: getUserMessage(error, 'No se pudo emitir el documento.') }]);
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
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
        {/* ── PROCESANDO ── */}
        {emissionState === 'processing' && (
          <>
            <div className="mb-8 flex size-24 items-center justify-center rounded-full bg-accent/10">
              <Loader2 size={48} className="animate-spin text-accent" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Validando en SUNAT</h2>
            {emissionSuccess && (
              <p className="mb-6 text-sm font-medium text-slate-500">
                {emissionSuccess.series}-{emissionSuccess.number}
              </p>
            )}

            {/* Aqui habia una barra de porcentaje. El numero venia del paso que reportaba
                el scraper mientras navegaba el portal; Factu API responde de una vez y no
                hay avance que medir. Una barra que avanza sola es una promesa inventada. */}
            <p className="mb-10 text-sm font-semibold text-slate-600">Procesando en SUNAT</p>

            <div className="w-full max-w-xs">
              <Button size="lg" fullWidth onClick={handleKeepEmitting}>
                Seguir emitiendo <ArrowRight size={18} />
              </Button>
              <p className="mt-3 text-xs leading-snug text-slate-500">
                Se procesa solo en segundo plano. Mira el resultado en Historial.
              </p>
            </div>

            <p className="mt-10 text-xs text-slate-400">FactuMovil AI • Validado SUNAT</p>
          </>
        )}

        {/* ── EMITIDO ── */}
        {emissionState === 'emitido' && (
          <>
            <div className="mb-8 flex size-24 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={56} strokeWidth={2.5} />
            </div>
            <h2 className="mb-2 text-3xl font-bold text-success">¡Emitido!</h2>
            {emissionSuccess && (
              <p className="mb-1 text-base font-bold text-slate-900">
                {emissionSuccess.series}-{emissionSuccess.number}
              </p>
            )}
            {numeroComprobante && (
              <p className="mb-10 text-sm text-slate-500">Nº SUNAT: {numeroComprobante}</p>
            )}
            {!numeroComprobante && <div className="mb-10" />}

            <div className="w-full max-w-xs space-y-3">
              <Button variant="success" size="lg" fullWidth onClick={handleWhatsAppShare}>
                <MessageCircle size={20} />
                {pdfBase64 ? 'Compartir PDF' : 'Compartir WhatsApp'}
              </Button>

              {pdfBase64 && (
                <Button variant="outline" size="lg" fullWidth onClick={handleDownloadPdf}>
                  <Download size={18} /> Descargar PDF
                </Button>
              )}

              <Button variant="outline" size="lg" fullWidth onClick={resetForm}>
                <RotateCcw size={18} /> Nueva venta
              </Button>
            </div>

            <p className="mt-8 text-xs text-slate-400">FactuMovil AI • Validado SUNAT</p>
          </>
        )}

        {/* ── FALLO ── */}
        {emissionState === 'fallo' && (
          <>
            <div className="mb-8 flex size-24 items-center justify-center rounded-full bg-danger/10 text-danger">
              <XCircle size={56} strokeWidth={2} />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-danger">No se pudo emitir</h2>
            {/* El motivo lo redacta el backend para que el usuario lo lea. Antes esto salia
                de un mapa por paso del scraper y, sin paso que buscar, siempre caia en
                "intenta de nuevo en unos segundos": el motivo de verdad llegaba, se
                guardaba en sunatMessage y no se pintaba en ninguna parte. */}
            <p className="mb-10 max-w-xs text-sm leading-relaxed text-slate-500">
              {sunatMessage || 'Intenta de nuevo en unos segundos.'}
            </p>

            <div className="w-full max-w-xs space-y-3">
              <Button size="lg" fullWidth onClick={handleRetry}>
                <RefreshCw size={18} /> Reintentar
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={resetForm}>
                <RotateCcw size={18} /> Nueva venta
              </Button>
            </div>
          </>
        )}

        {/* ── SIN EMITIR: prueba o espera sin confirmar ── */}
        {(emissionState === 'prueba' || emissionState === 'sin_confirmar') && (
          <>
            <div className="mb-8 flex size-24 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {emissionState === 'prueba' ? (
                <FlaskConical size={52} strokeWidth={2} />
              ) : (
                <Clock size={52} strokeWidth={2} />
              )}
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">
              {NEUTRAL_OUTCOMES[emissionState].title}
            </h2>
            <p className="mb-10 max-w-xs text-sm leading-relaxed text-slate-500">
              {NEUTRAL_OUTCOMES[emissionState].message}
            </p>

            <div className="w-full max-w-xs">
              <Button variant="secondary" size="lg" fullWidth onClick={resetForm}>
                <RotateCcw size={18} /> Nueva venta
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-md mx-auto relative px-2">
      {isEmitting && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-white/95 p-8 text-center backdrop-blur-xl">
          <div className="mb-8 size-16 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <h3 className="mb-8 text-2xl font-bold text-slate-900">Preparando documento</h3>

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
                    className={`flex size-10 items-center justify-center rounded-control ${
                      isDone
                        ? 'bg-success text-white'
                        : isActive
                          ? 'animate-pulse bg-accent text-white'
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
                    className={`text-sm font-semibold ${
                      isActive ? 'text-slate-900' : isDone ? 'text-success' : 'text-slate-500'
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
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div
            role="alert"
            className="pointer-events-auto w-full max-w-sm rounded-card bg-danger p-5 text-white shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h4 className="text-base font-semibold">Completa estos campos</h4>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setErrors([])}
                aria-label="Cerrar"
                className="text-white hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </Button>
            </div>

            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li
                  key={`${index}-${error.message}`}
                  className="flex items-start gap-2 text-sm font-medium"
                >
                  <span className="text-white/60">•</span> {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {iaWarning && (
        <Notice tone="warning" onDismiss={() => setIaWarning(null)}>
          {iaWarning}
        </Notice>
      )}

      {iaSuccess && (
        <Notice tone="success" onDismiss={() => setIaSuccess(null)}>
          {iaSuccess}
        </Notice>
      )}

      <Card className="relative overflow-hidden p-5">
        <div className="relative mb-4 flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-slate-200 bg-slate-50">
          {previewImage ? (
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Preview"
                className="h-full w-full rounded-card bg-slate-900 object-contain"
              />
              {!isProcessing && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewImage(null);
                  }}
                  type="button"
                  aria-label="Quitar imagen"
                  className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-danger"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center">
              <div className="mb-3 flex size-16 animate-pulse items-center justify-center rounded-full bg-danger text-white shadow-lg">
                <Mic size={32} />
              </div>
              <p className="text-sm font-semibold text-danger">Escuchando...</p>
            </div>
          ) : (
            <>
              {/* Circuit grid background */}
              <svg
                className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="ai-grid"
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#2563eb" strokeWidth="0.6" />
                    <circle cx="0" cy="0" r="1.4" fill="#2563eb" />
                    <circle cx="28" cy="0" r="1.4" fill="#2563eb" />
                    <circle cx="0" cy="28" r="1.4" fill="#2563eb" />
                    <circle cx="28" cy="28" r="1.4" fill="#2563eb" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ai-grid)" />
              </svg>

              {/* AI Star — estilo Gemini con colores del sistema */}
              <div
                className="relative z-10 mb-1 flex items-center justify-center"
                style={{ width: 120, height: 120 }}
              >
                {/* Halo exterior pulsante */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)',
                    animation: 'halo 3.5s ease-in-out infinite',
                  }}
                />

                {/* Estrella principal — 4 pétalos curvos */}
                <svg
                  viewBox="0 0 120 120"
                  width="100"
                  height="100"
                  style={{
                    position: 'absolute',
                    animation: 'starSpin 10s linear infinite',
                    filter:
                      'drop-shadow(0 0 14px rgba(59,130,246,0.55)) drop-shadow(0 0 4px rgba(99,102,241,0.4))',
                  }}
                >
                  <defs>
                    <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="45%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="sg2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a5b4fc" />
                      <stop offset="45%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <radialGradient id="sg3" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Pétalo vertical (arriba + abajo) */}
                  <path d="M60 8 C63 34 63 34 60 60 C57 34 57 34 60 8Z" fill="url(#sg1)" />
                  <path d="M60 112 C63 86 63 86 60 60 C57 86 57 86 60 112Z" fill="url(#sg1)" />

                  {/* Pétalo horizontal (izq + der) */}
                  <path d="M8 60 C34 63 34 63 60 60 C34 57 34 57 8 60Z" fill="url(#sg2)" />
                  <path d="M112 60 C86 63 86 63 60 60 C86 57 86 57 112 60Z" fill="url(#sg2)" />

                  {/* Núcleo brillante */}
                  <circle cx="60" cy="60" r="7" fill="url(#sg3)" />
                </svg>

                {/* Estrella secundaria — 45° girada al revés, más pequeña */}
                <svg
                  viewBox="0 0 120 120"
                  width="58"
                  height="58"
                  style={{
                    position: 'absolute',
                    animation: 'starSpin 7s linear infinite reverse',
                    opacity: 0.55,
                    filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.5))',
                  }}
                >
                  <path d="M60 22 C62 42 62 42 60 60 C58 42 58 42 60 22Z" fill="#a5b4fc" />
                  <path d="M60 98 C62 78 62 78 60 60 C58 78 58 78 60 98Z" fill="#a5b4fc" />
                  <path d="M22 60 C42 62 42 62 60 60 C42 58 42 58 22 60Z" fill="#818cf8" />
                  <path d="M98 60 C78 62 78 62 60 60 C78 58 78 58 98 60Z" fill="#818cf8" />
                </svg>

                {/* Partículas flotantes */}
                {(
                  [
                    { size: 7, cx: 18, cy: 22, color: '#93c5fd', delay: '0s', dur: '2.6s' },
                    { size: 5, cx: 96, cy: 18, color: '#a5b4fc', delay: '0.9s', dur: '3.1s' },
                    { size: 6, cx: 104, cy: 80, color: '#60a5fa', delay: '1.7s', dur: '2.3s' },
                    { size: 4, cx: 14, cy: 88, color: '#818cf8', delay: '0.4s', dur: '3.8s' },
                    { size: 5, cx: 58, cy: 8, color: '#bfdbfe', delay: '1.2s', dur: '2.9s' },
                  ] as {
                    size: number;
                    cx: number;
                    cy: number;
                    color: string;
                    delay: string;
                    dur: string;
                  }[]
                ).map((p, i) => (
                  <svg
                    key={i}
                    viewBox="0 0 10 10"
                    width={p.size}
                    height={p.size}
                    style={{
                      position: 'absolute',
                      left: p.cx - p.size / 2,
                      top: p.cy - p.size / 2,
                      animation: `particle ${p.dur} ease-in-out ${p.delay} infinite`,
                    }}
                  >
                    <path
                      d="M5 0 L5.5 4.5 L10 5 L5.5 5.5 L5 10 L4.5 5.5 L0 5 L4.5 4.5Z"
                      fill={p.color}
                    />
                  </svg>
                ))}
              </div>

              <p className="z-10 text-sm font-semibold text-slate-600">Asistente IA</p>
              <p className="z-10 mt-1 px-4 text-center text-xs leading-relaxed text-slate-500">
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
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-accent/70 px-8 text-center text-white backdrop-blur-[2px] transition-all">
              <div className="mb-4 size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <h4 className="mb-1 text-base font-semibold">
                {processingType === 'audio' ? 'Procesando voz' : 'Procesando imagen'}
              </h4>
              <p className="text-sm opacity-90">Extrayendo datos con IA...</p>
            </div>
          )}
        </div>

        <div className="flex w-full gap-2">
          {isRecording ? (
            <Button variant="danger" size="lg" className="flex-1" onClick={stopRecording}>
              <Square size={18} fill="white" /> Parar
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setPhotoMenuOpen(true)}
              >
                <Camera size={18} /> Foto
              </Button>

              <Button size="lg" className="flex-1" onClick={startRecording}>
                <Mic size={18} /> Voz
              </Button>
            </>
          )}

          <Button variant="outline" size="icon-lg" onClick={clearAll} aria-label="Limpiar todo">
            <RotateCcw size={18} />
          </Button>
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
              className="w-full max-w-md rounded-t-card bg-white p-4 pb-8 shadow-2xl animate-[fm-sheet-in_0.2s_ease-out]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

              <button
                type="button"
                onClick={openCamera}
                className="flex w-full items-center gap-3 rounded-control px-3 py-3 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-secondary text-white">
                  <Camera size={20} />
                </span>
                <span className="text-sm font-semibold text-slate-900">Tomar foto</span>
              </button>

              <button
                type="button"
                onClick={openGallery}
                className="flex w-full items-center gap-3 rounded-control px-3 py-3 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent text-white">
                  <Images size={20} />
                </span>
                <span className="text-sm font-semibold text-slate-900">Subir de galería</span>
              </button>

              <Button
                variant="ghost"
                fullWidth
                className="mt-2"
                onClick={() => setPhotoMenuOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle icon={Layers}>Documento</SectionTitle>

        <div className="space-y-4">
          <SegmentedControl
            options={DOCUMENT_TYPE_OPTIONS}
            value={invoiceType}
            onChange={setInvoiceType}
            aria-label="Tipo de comprobante"
          />

          {sender ? (
            <Card tone="muted" className="p-4">
              <p className="mb-0.5 text-xs text-slate-500">Emisor</p>
              <p className="truncate text-sm font-semibold text-slate-900">{sender.name}</p>
            </Card>
          ) : (
            <button
              type="button"
              onClick={onSelectSender}
              className="flex w-full items-center justify-between rounded-card border border-warning/30 bg-warning/10 p-4 text-left"
            >
              <div className="min-w-0">
                <p className="mb-0.5 text-xs font-semibold text-warning">Sin empresa</p>
                <p className="text-sm font-medium text-warning">Configura tu empresa en Perfil</p>
              </div>
              <ChevronDown size={20} className="shrink-0 text-warning" />
            </button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={User}>Cliente</SectionTitle>

        <div className="space-y-4">
          <div>
            <Input
              value={clientData.document}
              onChange={(event) => {
                const digits = onlyDigits(event.target.value);
                setClientData((prev) => ({ ...prev, document: digits }));
                // RUC (11 digitos) solo puede ir en factura; cualquier otro caso (DNI,
                // documento incompleto o solo nombre) es boleta.
                setInvoiceType(
                  digits.length === RUC_LENGTH ? InvoiceType.FACTURA : InvoiceType.BOLETA,
                );
                if (digits.length !== DNI_LENGTH && digits.length !== RUC_LENGTH) {
                  setDocumentLookup('idle');
                }
              }}
              inputMode="numeric"
              maxLength={RUC_LENGTH}
              placeholder="DNI o RUC"
              aria-label="DNI o RUC del cliente"
              icon={<Search size={18} />}
              trailing={
                documentLookup === 'searching' ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : documentLookup === 'found' ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : null
              }
            />

            <p
              className={`ml-1 mt-2 text-sm ${
                documentLookup === 'notfound'
                  ? 'text-warning'
                  : documentLookup === 'found'
                    ? 'text-success'
                    : 'text-slate-500'
              }`}
            >
              {documentLookup === 'searching' && 'Buscando datos…'}
              {documentLookup === 'found' && 'Cliente encontrado ✓'}
              {documentLookup === 'notfound' && 'No lo encontramos. Escribe el nombre abajo.'}
              {documentLookup === 'idle' && 'Escríbelo y traemos el nombre automáticamente'}
            </p>
          </div>

          <Input
            value={clientData.name}
            onChange={(event) => setClientData((prev) => ({ ...prev, name: event.target.value }))}
            className="uppercase"
            placeholder="Nombre / Razón Social"
            aria-label="Nombre o razón social del cliente"
          />

          <Input
            label="Fecha de emisión"
            type="date"
            value={clientData.invoice_date}
            min={minInvoiceDate}
            max={maxInvoiceDate}
            onChange={(event) =>
              setClientData((prev) => ({ ...prev, invoice_date: event.target.value }))
            }
          />

          <Input
            value={clientData.phone}
            onChange={(event) => setClientData((prev) => ({ ...prev, phone: event.target.value }))}
            inputMode="tel"
            placeholder="Celular para envío WhatsApp"
            aria-label="Celular del cliente para enviar por WhatsApp"
          />
        </div>
      </Card>

      <section ref={productsSectionRef} className="scroll-mt-4">
        <SectionTitle
          icon={ShoppingCart}
          action={
            <Button onClick={openNewProduct}>
              <Plus size={16} /> Producto
            </Button>
          }
        >
          Detalle
        </SectionTitle>

        {items.length === 0 ? (
          <button
            type="button"
            onClick={openNewProduct}
            className="flex w-full flex-col items-center gap-3 rounded-card border border-dashed border-slate-300 bg-white p-8 text-center transition active:scale-[0.99]"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-50">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Aún no agregaste productos</p>
              <p className="mt-1 text-sm text-slate-500">Toca aquí para agregar el primero</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const hasError = invalidItemIndexes.has(index);
              return (
                <Card
                  key={`item-${index}-${item.product_id ?? 'new'}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  tone={hasError ? 'danger' : 'default'}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-lg font-bold leading-none text-slate-900">{item.quantity}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{unitLabel(item.unit)}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.description || 'Sin nombre'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      S/ {Number(item.sale_price).toFixed(2)} c/u · {igvTypeLabel(item.igv_type)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      S/ {Number(lineOf(index)?.total ?? item.total).toFixed(2)}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditProduct(index)}
                        aria-label={`Editar ${item.description || 'producto'}`}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(index)}
                        aria-label={`Quitar ${item.description || 'producto'}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Button variant="outline" fullWidth onClick={openNewProduct}>
              <Plus size={16} /> Agregar otro producto
            </Button>
          </div>
        )}
      </section>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Resumen de venta</h3>

        <div className="mb-4">
          <AmountLine label="Op. Gravadas" amount={gravada} />
          {exonerada > 0 && <AmountLine label="Op. Exoneradas" amount={exonerada} />}
          {inafecta > 0 && <AmountLine label="Op. Inafectas" amount={inafecta} />}
          <AmountLine label="IGV (18%)" amount={igvTotal} />
        </div>

        {showUsage && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-sm ${
              lowOnQuota
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <span>Comprobantes de este mes</span>
            <span className="font-semibold">
              Te quedan {usage.remaining} de {usage.limit}
            </span>
          </div>
        )}

        {totalsFailed && (
          <div className="mb-4">
            {/* El motivo tal cual lo manda el backend: muchas veces es una regla que el
                cajero puede corregir, y un texto generico lo manda a buscar donde no esta. */}
            <Notice tone="danger">
              {totalsError ?? 'No se pudo calcular el total.'} Sin total no se puede emitir.
            </Notice>
          </div>
        )}

        <div className="mb-6 rounded-card bg-primary p-5 text-white">
          <p className="mb-1 text-sm text-white/70">Total a pagar</p>
          <p className="text-3xl font-bold tracking-tight">
            {hasTotals ? `S/ ${total.toFixed(2)}` : isCalculatingTotals ? 'Calculando…' : 'S/ —'}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            fullWidth
            onClick={handleOpenDraftConfirm}
            loading={isSavingDraft}
            disabled={isEmitting || items.length === 0}
          >
            {!isSavingDraft && <Layers size={18} />} Guardar como borrador
          </Button>

          <Button variant="success" size="lg" fullWidth onClick={handleOpenConfirm}>
            <CheckCircle2 size={22} /> Emitir documento
          </Button>
        </div>
      </Card>

      {showConfirmModal && (
        <Modal
          title="¿Confirmar venta?"
          icon={<AlertTriangle size={28} />}
          iconTone="accent"
          description={
            <>
              Está por emitir una{' '}
              <span className="font-semibold text-slate-900">{invoiceType}</span> oficial ante
              SUNAT. Revisa los datos antes de confirmar.
            </>
          }
          onClose={() => setShowConfirmModal(false)}
        >
          <SaleSummary
            clientName={clientData.name}
            itemCount={items.length}
            gravada={gravada}
            exonerada={exonerada}
            inafecta={inafecta}
            igv={igvTotal}
            total={total}
          />

          {exoneratedItems.length > 0 && (
            <div className="mb-6 text-left">
              <Notice tone="warning">
                {exoneratedItems.length === 1
                  ? '1 producto sin IGV: '
                  : `${exoneratedItems.length} productos sin IGV: `}
                <span className="font-semibold">
                  {exoneratedItems.map((item) => item.description || 'Sin nombre').join(', ')}
                </span>
              </Notice>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={handleFinalEmit}>
              Confirmar emisión
            </Button>
            <Button variant="outline" fullWidth onClick={() => setShowConfirmModal(false)}>
              Revisar datos
            </Button>
          </div>
        </Modal>
      )}

      {showDraftConfirmModal && (
        <Modal
          title="¿Guardar como borrador?"
          icon={<Layers size={28} />}
          description="Se guardará sin emitir a SUNAT. Podrás editarlo y emitirlo después."
          onClose={() => setShowDraftConfirmModal(false)}
        >
          <SaleSummary
            clientName={clientData.name}
            itemCount={items.length}
            gravada={gravada}
            exonerada={exonerada}
            inafecta={inafecta}
            igv={igvTotal}
            total={total}
          />

          <div className="flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={handleSaveDraft} loading={isSavingDraft}>
              Guardar borrador
            </Button>
            <Button variant="outline" fullWidth onClick={() => setShowDraftConfirmModal(false)}>
              Revisar datos
            </Button>
          </div>
        </Modal>
      )}

      {productModal.open && (
        <ProductFormModal
          initialItem={productModal.index !== null ? items[productModal.index] : null}
          products={products.filter((product) => String(product.sender_id) === String(sender?.id))}
          canSaveToCatalog={!!onSaveProduct}
          onSubmit={handleProductSubmit}
          onClose={closeProductModal}
        />
      )}
    </div>
  );
};

export default Billing;
