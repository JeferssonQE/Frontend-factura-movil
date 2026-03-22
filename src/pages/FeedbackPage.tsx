// src/pages/FeedbackPage.tsx
import React, { useState } from 'react';
import { Star, Send, RefreshCw, CheckCircle, MessageCircle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { feedbackService } from '../services/business/feedbackService';

const FeedbackPage: React.FC = () => {
  const { activeSenderId, showToast } = useAppData();
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [name, setName]         = useState('');
  const [message, setMessage]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [sent, setSent]         = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await feedbackService.submitFeedback({
        sender_id: activeSenderId ?? undefined,
        rating: rating || undefined,
        nombre: name.trim() || undefined,
        mensaje: message.trim(),
      });
      setSent(true);
    } catch {
      showToast('Error al enviar tu opinión. Intenta de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
        <div className="w-20 h-20 rounded-[28px] bg-emerald-50 flex items-center justify-center">
          <CheckCircle size={36} className="text-emerald-500" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">¡Gracias!</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-widest">Tu opinión fue enviada</p>
        </div>
        <button
          onClick={() => { setSent(false); setRating(0); setName(''); setMessage(''); }}
          className="text-[10px] font-black text-blue-500 uppercase tracking-widest"
        >
          Enviar otra opinión
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <MessageCircle size={22} className="text-blue-500" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tu opinión nos mejora :)</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Cuéntanos cómo fue tu experiencia con FactuMovil</p>
        </div>
      </div>

      {/* Rating */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">¿Cómo calificarías FactuMovil?</p>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90"
            >
              <Star
                size={32}
                className="transition-colors"
                fill={(hovered || rating) >= star ? '#f59e0b' : 'transparent'}
                stroke={(hovered || rating) >= star ? '#f59e0b' : '#cbd5e1'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-[10px] font-black text-amber-500 uppercase tracking-widest mt-3">
            {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'][rating]}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Nombre (opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Mensaje o consulta *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe tu opinión, sugerencia o consulta..."
            rows={4}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={busy || !message.trim()}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          {busy ? 'Enviando...' : 'Enviar Opinión'}
        </button>
      </div>

    </div>
  );
};

export default FeedbackPage;
