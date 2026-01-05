
import { Sender, Product, Client, Invoice, InvoiceType, UnitOfMeasure, InvoiceItem, IAExtractionResult, InvoiceStatus } from '../types';
import { processInvoiceImage, processInvoiceAudio } from '../services/geminiService';
import { SunatApiService } from '../services/sunatApi';
import { SupabaseDB } from '../services/supabase';
import { decrypt } from '../services/crypto';
import React, { useState, useRef } from 'react';
import { Camera, Plus, Trash2, X, ShoppingCart, User, CheckCircle2, RotateCcw, ChevronDown, Zap, Layers, Mic, Square, AlertTriangle, MessageCircle, Download, Loader2 } from 'lucide-react';

interface BillingProps {
  sender: Sender | null;
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  onEmit: (invoice: Invoice) => void;
  onAddClient: (client: Client) => void;
  onSelectSender: () => void;
}

const Billing: React.FC<BillingProps> = ({ sender, products, clients, invoices, onEmit, onAddClient, onSelectSender }) => {
  const [type, setType] = useState<InvoiceType>(InvoiceType.BOLETA);
  const [clientData, setClientData] = useState({ name: '', idDoc: '', phone: '', date: new Date().toISOString().split('T')[0] });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'image' | 'audio' | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [isEmitting, setIsEmitting] = useState(false);
  const [emissionStep, setEmissionStep] = useState(0);
  const [emissionStatus, setEmissionStatus] = useState('');
  const [emissionSuccess, setEmissionSuccess] = useState<Invoice | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cálculos automáticos reactivos
  const gravada = items.filter(i => i.hasIgv).reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  const exonerada = items.filter(i => !i.hasIgv).reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  const igvTotal = gravada * 0.18;
  const total = gravada + exonerada + igvTotal;

  const fillFormWithResult = (result: IAExtractionResult) => {
    setClientData(prev => ({
      ...prev,
      name: result.cliente.cliente || '',
      idDoc: result.cliente.dni || result.cliente.ruc || '',
      phone: result.cliente.telefono || '',
      date: result.cliente.fecha ? formatDateForInput(result.cliente.fecha) : prev.date
    }));
    
    setItems(result.productos.map(p => {
      const qty = p.cantidad || 1;
      const hasIgv = p.igv !== 0; 
      const matchedProduct = products.find(prod => prod.id === p.productId);
      
      const description = matchedProduct ? matchedProduct.description : p.descripcion || '';
      const unitPrice = matchedProduct ? matchedProduct.basePrice : (p.precio_base || (p.precio_total / (hasIgv ? 1.18 : 1) / qty));
      const finalHasIgv = matchedProduct ? matchedProduct.hasIgv : hasIgv;

      return {
        productId: p.productId || 'ia-' + Math.random().toString(36).substring(7),
        description: description,
        quantity: qty,
        unit: mapUnit(p.unidad_medida),
        unitPrice: unitPrice,
        hasIgv: finalHasIgv,
        total: p.precio_total || (unitPrice * qty * (finalHasIgv ? 1.18 : 1))
      };
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          setProcessingType('audio');
          const result = await processInvoiceAudio(base64Audio, 'audio/webm', products.filter(p => p.senderId === sender?.id));
          if (result) fillFormWithResult(result);
          setIsProcessing(false);
          setProcessingType(null);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      
      setTimeout(async () => {
        setIsProcessing(true);
        setProcessingType('image');
        const result = await processInvoiceImage(base64, products.filter(p => p.senderId === sender?.id));
        if (result) fillFormWithResult(result);
        setIsProcessing(false);
        setProcessingType(null);
      }, 100);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index], ...updates };
    const qty = currentItem.quantity || 1;

    // Si cambia el TOTAL → recalcular precio unitario (el total es el precio final)
    if ('total' in updates) {
      // Total es lo que paga el cliente, P.Unit se ajusta
      const totalSinIgv = currentItem.hasIgv ? currentItem.total / 1.18 : currentItem.total;
      currentItem.unitPrice = totalSinIgv / qty;
    }
    // Si cambia el PRECIO UNITARIO → recalcular total
    else if ('unitPrice' in updates) {
      const base = qty * currentItem.unitPrice;
      currentItem.total = currentItem.hasIgv ? base * 1.18 : base;
    }
    // Si cambia la CANTIDAD → recalcular total
    else if ('quantity' in updates) {
      const base = qty * (currentItem.unitPrice || 0);
      currentItem.total = currentItem.hasIgv ? base * 1.18 : base;
    }
    // Si cambia IGV → mantener total, ajustar precio unitario
    else if ('hasIgv' in updates) {
      // El total se mantiene, recalculamos el precio unitario
      const totalSinIgv = currentItem.hasIgv ? currentItem.total / 1.18 : currentItem.total;
      currentItem.unitPrice = totalSinIgv / qty;
    }

    newItems[index] = currentItem;
    setItems(newItems);
  };

  const formatDateForInput = (dateStr: string) => {
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
    const u = unit?.toUpperCase();
    if (Object.values(UnitOfMeasure).includes(u as UnitOfMeasure)) return u as UnitOfMeasure;
    return UnitOfMeasure.UNIDAD;
  };

  const clearAll = () => {
    if (confirm('¿Deseas limpiar todo el formulario?')) {
      setClientData({ name: '', idDoc: '', phone: '', date: new Date().toISOString().split('T')[0] });
      setItems([]);
      setPreviewImage(null);
      setEmissionSuccess(null);
      setErrors([]);
    }
  };

  const addItem = () => {
    setItems([...items, { 
      productId: 'new-' + Date.now(), 
      description: '', 
      quantity: 1, 
      unit: UnitOfMeasure.UNIDAD, 
      unitPrice: 0, 
      hasIgv: true,
      total: 0 
    }]);
  };

  const getNextNumber = () => {
    if (!sender) return '01';
    const senderInvoices = invoices.filter(inv => inv.senderId === sender.id && inv.type === type);
    if (senderInvoices.length === 0) return '01';
    const lastNumber = Math.max(...senderInvoices.map(inv => parseInt(inv.number)));
    return (lastNumber + 1).toString().padStart(2, '0');
  };

  const handleOpenConfirm = () => {
    const errs: string[] = [];

    if (!sender) errs.push("Configura tu empresa en Perfil");
    
    if (items.length === 0) {
      errs.push("Agrega al menos un producto");
    } else {
      if (items.some(it => !it.description || it.description.trim() === "")) {
        errs.push("Todos los productos deben tener descripción");
      }
      if (items.some(it => it.total <= 0)) {
        errs.push("Los productos deben tener precio mayor a 0");
      }
    }

    if (!clientData.name || clientData.name.trim() === "") {
      errs.push("Ingresa el nombre del cliente");
    }
    
    if (type === InvoiceType.FACTURA) {
      if (!clientData.idDoc || clientData.idDoc.length !== 11) {
        errs.push("Para FACTURA el RUC debe tener 11 dígitos");
      }
    }

    if (errs.length > 0) {
      setErrors(errs);
      // Scroll al inicio para ver errores
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors([]);
    setShowConfirmModal(true);
  };

  const handleFinalEmit = async () => {
    if (!sender) return;
    setShowConfirmModal(false);
    setIsEmitting(true);
    setEmissionStep(1);
    setEmissionStatus('Preparando documento...');

    try {
      // Obtener siguiente número desde Supabase
      const series = type === InvoiceType.BOLETA ? 'B001' : 'F001';
      const nextNumber = await SupabaseDB.getNextInvoiceNumber(sender.id, series);

      // Crear objeto invoice
      const invoiceData: Invoice = {
        id: Date.now().toString(),
        senderId: sender.id,
        clientId: clientData.idDoc || '000',
        clientName: clientData.name,
        type,
        series,
        number: nextNumber,
        date: clientData.date,
        subtotal: gravada + exonerada,
        igv: igvTotal,
        total,
        items,
        status: InvoiceStatus.PROCESANDO
      };

      // Crear cliente temporal para la API
      const clientForApi: Client = {
        id: clientData.idDoc || 'temp',
        senderId: sender.id,
        name: clientData.name,
        dni: clientData.idDoc?.length === 8 ? clientData.idDoc : undefined,
        ruc: clientData.idDoc?.length === 11 ? clientData.idDoc : undefined,
        phone: clientData.phone
      };

      setEmissionStep(2);
      setEmissionStatus('Enviando a SUNAT...');

      // Desencriptar credenciales SUNAT
      const sunatUser = sender.sunatUser ? await decrypt(sender.sunatUser) : '';
      const sunatPass = sender.sunatPass ? await decrypt(sender.sunatPass) : '';

      // Llamar a la API SUNAT
      const result = await SunatApiService.emitirYEsperar(
        invoiceData,
        items,
        sender,
        clientForApi,
        {
          ruc: sender.ruc,
          usuario: sunatUser,
          password: sunatPass
        }
      );

      setEmissionStep(3);
      setEmissionStatus('Procesando respuesta...');

      if (result.success) {
        // Actualizar invoice con datos de respuesta
        const finalInv: Invoice = {
          ...invoiceData,
          status: InvoiceStatus.ACEPTADO,
          series: result.serie || invoiceData.series,
          number: result.numero || invoiceData.number,
          pdfBase64: result.pdf?.content
        };

        // Guardar PDF
        if (result.pdf?.content) {
          setPdfBase64(result.pdf.content);
        }

        // Notificar al padre para guardar en Supabase
        onEmit(finalInv);
        setEmissionSuccess(finalInv);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.error('Error emitiendo:', error);
      setErrors([error.message || 'Error al emitir documento']);
      setEmissionStep(0);
    } finally {
      setIsEmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (pdfBase64 && emissionSuccess) {
      SunatApiService.downloadPdf(pdfBase64, `${emissionSuccess.series}-${emissionSuccess.number}.pdf`);
    }
  };

  const handleViewPdf = () => {
    if (pdfBase64) {
      SunatApiService.openPdf(pdfBase64);
    }
  };

  const handleWhatsAppShare = () => {
    if (!emissionSuccess) return;
    const text = `Hola ${emissionSuccess.clientName}, le envío su comprobante electrónico ${emissionSuccess.type} ${emissionSuccess.series}-${emissionSuccess.number} por un monto de S/ ${emissionSuccess.total.toFixed(2)}.`;
    const encodedText = encodeURIComponent(text);
    const phoneNumber = clientData.phone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${phoneNumber.startsWith('51') ? phoneNumber : '51' + phoneNumber}?text=${encodedText}`, '_blank');
  };

  if (emissionSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-50">
          <CheckCircle2 size={56} strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2 uppercase tracking-tighter text-emerald-600">¡Venta Exitosa!</h2>
        <p className="text-slate-500 font-medium mb-12 text-sm leading-relaxed">
          Documento <span className="font-black text-slate-900">{emissionSuccess.series}-{emissionSuccess.number}</span> procesado correctamente.
        </p>
        
        <div className="w-full space-y-4 mb-10 max-w-xs">
          <button 
            onClick={handleWhatsAppShare}
            className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
          >
            <MessageCircle size={20} /> Compartir WhatsApp
          </button>

          <button 
            onClick={() => alert("Mostrando PDF Oficial...")}
            className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"
          >
            <Layers size={20} /> Ver PDF Oficial
          </button>
          
          <button 
            onClick={clearAll} 
            className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:bg-slate-200 transition-all"
          >
            <RotateCcw size={18} /> Nueva Venta
          </button>
        </div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">FactuMovil AI • Validado SUNAT</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-md mx-auto relative px-2">
      {isEmitting && (
        <div className="fixed inset-0 z-[250] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-8"></div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 uppercase tracking-tighter">Comunicación SUNAT</h3>
          <div className="w-full max-w-xs space-y-6">
            {['Generando XML', 'Firmando Digital', 'Enviando a SUNAT'].map((label, i) => {
              const isActive = emissionStep === i + 1;
              const isDone = emissionStep > i + 1;
              return (
                <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'scale-110' : isDone ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    {isDone ? <CheckCircle2 size={20} /> : <Loader2 size={20} className="animate-spin" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Errores de Validación - Modal flotante */}
      {errors.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 pointer-events-none">
          <div id="error-summary" className="bg-red-600 text-white p-5 rounded-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h4 className="text-[11px] font-black uppercase tracking-widest">Completa estos campos</h4>
              </div>
              <button onClick={() => setErrors([])} className="p-1 hover:bg-white/20 rounded-full">
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-[11px] font-bold flex items-start gap-2">
                  <span className="text-red-200">•</span> {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Escáner IA */}
      <section className="bg-white p-5 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div 
          className="w-full h-44 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden mb-4 cursor-pointer hover:bg-slate-100 transition-all group"
          onClick={() => !isRecording && !previewImage && fileInputRef.current?.click()}
        >
          {previewImage ? (
            <div className="relative w-full h-full">
              <img src={previewImage} alt="Preview" className="w-full h-full object-contain bg-slate-900 rounded-[28px]" />
              {!isProcessing && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
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
              <p className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em]">Escuchando...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-white rounded-3xl shadow-md flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                <Zap size={32} />
              </div>
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Dictar o Tomar Foto</p>
            </>
          )}
          
          {isProcessing && (
            <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 px-8 text-center text-white transition-all">
              <div className="w-10 h-10 border-[4px] border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
              <h4 className="font-black text-[11px] uppercase tracking-widest mb-1">
                {processingType === 'audio' ? 'Procesando Voz' : 'Procesando Imagen'}
              </h4>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Extrayendo datos con IA...</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full">
          {isRecording ? (
            <button onClick={stopRecording} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
              <Square size={18} fill="white" /> Parar
            </button>
          ) : (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><Camera size={18} /> Cámara</button>
              <button onClick={startRecording} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><Mic size={18} /> Voz</button>
            </>
          )}
          <button onClick={clearAll} className="w-14 bg-slate-50 text-slate-400 py-4 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-slate-100"><RotateCcw size={18} /></button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
      </section>

      {/* Tipo de Documento */}
      <section className="bg-white p-6 rounded-[36px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-blue-600" />
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Documento</h3>
        </div>
        <div className="space-y-4">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button onClick={() => setType(InvoiceType.BOLETA)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${type === InvoiceType.BOLETA ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>BOLETA</button>
            <button onClick={() => setType(InvoiceType.FACTURA)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${type === InvoiceType.FACTURA ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>FACTURA</button>
          </div>
          {sender ? (
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Emisor</p>
              <p className="text-sm font-black text-slate-800 truncate">{sender.name}</p>
            </div>
          ) : (
            <button onClick={onSelectSender} className="w-full bg-amber-50 p-4 rounded-2xl text-left flex justify-between items-center border border-amber-200">
              <div className="min-w-0">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">⚠️ Sin Empresa</p>
                <p className="text-sm font-bold text-amber-700">Configura tu empresa en Perfil</p>
              </div>
              <ChevronDown size={20} className="text-amber-400 shrink-0" />
            </button>
          )}
        </div>
      </section>

      {/* Cliente */}
      <section className="bg-white p-6 rounded-[36px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-600" />
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Cliente</h3>
        </div>
        <div className="space-y-4">
          <input 
            value={clientData.name} 
            onChange={e => setClientData({...clientData, name: e.target.value.toUpperCase()})} 
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase placeholder:text-slate-300" 
            placeholder="Nombre / Razón Social" 
          />
          <div className="grid grid-cols-2 gap-3">
            <input 
              value={clientData.idDoc} 
              onChange={e => setClientData({...clientData, idDoc: e.target.value})} 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 placeholder:text-slate-300" 
              placeholder="DNI / RUC" 
            />
            <input 
              type="date" 
              value={clientData.date} 
              onChange={e => setClientData({...clientData, date: e.target.value})} 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800" 
            />
          </div>
          <input 
            value={clientData.phone} 
            onChange={e => setClientData({...clientData, phone: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 placeholder:text-slate-300" 
            placeholder="Celular para envío WhatsApp" 
          />
        </div>
      </section>

      {/* Detalle Items */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Detalle</h3>
          </div>
          <button onClick={addItem} className="bg-blue-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 active:scale-95 transition-all">
            <Plus size={14} /> Producto
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.productId} className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-4 animate-in slide-in-from-left duration-300">
              {/* Descripción + Eliminar */}
              <div className="flex items-center gap-2 mb-3">
                <input 
                  value={item.description} 
                  onChange={e => updateItem(index, { description: e.target.value.toUpperCase() })} 
                  placeholder="Nombre del producto" 
                  className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-300 uppercase" 
                />
                <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Cantidad + P.Unitario + Total */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">Cant.</label>
                  <input 
                    type="number" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })} 
                    placeholder="1"
                    className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">P.Unit</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={item.unitPrice ? item.unitPrice.toFixed(2) : ''} 
                    onChange={e => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00"
                    className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-blue-600 uppercase mb-1 block px-1">Total</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={item.total ? item.total.toFixed(2) : ''} 
                    onChange={e => updateItem(index, { total: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00"
                    className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-2 py-2.5 text-sm font-black text-blue-600 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
              </div>

              {/* IGV Toggle */}
              <div className="flex gap-2">
                <button 
                  onClick={() => updateItem(index, { hasIgv: true })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${item.hasIgv ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  Con IGV 18%
                </button>
                <button 
                  onClick={() => updateItem(index, { hasIgv: false })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!item.hasIgv ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  Exonerado
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Resumen Final */}
      <section className="bg-white p-8 rounded-[48px] shadow-xl shadow-slate-200/50 border border-slate-100 mx-1">
        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Subtotal</span>
            <span className="text-slate-800 font-black">S/ {(gravada + exonerada).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>IGV (18%)</span>
            <span className="text-blue-600 font-black">S/ {igvTotal.toFixed(2)}</span>
          </div>
          <div className="h-px bg-slate-100 my-4" />
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">Total a Pagar</span>
              <span className="text-5xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleOpenConfirm} 
          className="w-full bg-blue-600 text-white h-20 rounded-[32px] shadow-2xl shadow-blue-200 font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <CheckCircle2 size={24} /> Emitir Documento
        </button>
      </section>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
          <div className="bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase tracking-tighter">¿Confirmar Venta?</h3>
            <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">
              Está por emitir una <span className="text-blue-600 font-black">{type}</span> oficial por un monto total de <span className="font-black text-slate-900">S/ {total.toFixed(2)}</span>.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleFinalEmit} className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">Confirmar Emisión</button>
              <button onClick={() => setShowConfirmModal(false)} className="w-full bg-white border border-slate-100 text-slate-400 py-5 rounded-[22px] font-black text-xs uppercase tracking-widest active:bg-slate-50 transition-all">Revisar Datos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
