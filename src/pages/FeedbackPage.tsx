// src/pages/FeedbackPage.tsx

import { CheckCircle, MessageCircle, Send, Star } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useAppData } from '../context/AppDataContext';
import { feedbackService } from '../services/business/feedbackService';

const RATING_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'];

const FeedbackPage: React.FC = () => {
  const { activeSenderId, showToast } = useAppData();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex size-20 items-center justify-center rounded-card bg-success/10">
          <CheckCircle size={36} className="text-success" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">¡Gracias!</h2>
          <p className="mt-1 text-sm text-slate-500">Tu opinión fue enviada</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setSent(false);
            setRating(0);
            setName('');
            setMessage('');
          }}
        >
          Enviar otra opinión
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <Card className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent/10">
          <MessageCircle size={22} className="text-accent" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Tu opinión nos mejora</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Cuéntanos cómo fue tu experiencia con FactuMovil
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-medium text-slate-700">¿Cómo calificarías FactuMovil?</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = (hovered || rating) >= star;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                aria-pressed={rating === star}
                className="flex size-11 items-center justify-center transition-transform active:scale-90"
              >
                <Star
                  size={32}
                  strokeWidth={1.5}
                  className={`transition-colors ${
                    filled ? 'fill-warning text-warning' : 'fill-transparent text-slate-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <p className="mt-3 text-center text-sm font-semibold text-warning">
            {RATING_LABELS[rating]}
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <Input
          label="Nombre (opcional)"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
        />

        <Textarea
          label="Mensaje o consulta *"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu opinión, sugerencia o consulta…"
          rows={4}
        />

        <Button fullWidth loading={busy} disabled={!message.trim()} onClick={handleSubmit}>
          {!busy && <Send size={16} />}
          {busy ? 'Enviando…' : 'Enviar opinión'}
        </Button>
      </Card>
    </div>
  );
};

export default FeedbackPage;
