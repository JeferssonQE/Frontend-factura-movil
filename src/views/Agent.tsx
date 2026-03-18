// views/Agent.tsx
import React, { useEffect, useRef } from 'react';
import { Send, Mic, X, CheckCircle, ArrowRight } from 'lucide-react';
import { useAgent } from '../hooks/useAgent';
import { ChatMessage } from '../services/integrations/agentService';
import { InvoiceType } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgentViewProps {
  onNavigateToHistory: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Three animated dots displayed while waiting for an agent response. */
const LoadingDots: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1 px-1">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);

/** Action card shown inside a model bubble when a draft invoice was created. */
interface DraftCardProps {
  message: ChatMessage;
  onNavigateToHistory: () => void;
}

const DraftCard: React.FC<DraftCardProps> = ({ message, onNavigateToHistory }) => {
  const { invoice } = message.action!;

  const typeLabel = invoice.invoice_type === InvoiceType.BOLETA ? 'BOLETA' : 'FACTURA';
  const series = invoice.series ?? (invoice.invoice_type === InvoiceType.BOLETA ? 'B001' : 'F001');
  const total = typeof invoice.total === 'number' ? invoice.total.toFixed(2) : '—';

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
        <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
          Borrador creado
        </span>
      </div>

      <p className="text-xs text-emerald-800 font-semibold">
        {typeLabel} · {series} · S/ {total}
      </p>
      {invoice.client_name && (
        <p className="text-xs text-emerald-700 mt-0.5">
          Cliente: {invoice.client_name}
        </p>
      )}

      <button
        onClick={onNavigateToHistory}
        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-800 transition-colors"
      >
        Ver en Historial
        <ArrowRight size={12} />
      </button>
    </div>
  );
};

/** A single chat bubble (user or model). */
interface MessageBubbleProps {
  message: ChatMessage;
  onNavigateToHistory: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onNavigateToHistory }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-slate-900 text-white rounded-[20px] rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-100 shadow-sm rounded-[20px] rounded-tl-sm px-4 py-3 max-w-[85%]">
        {message.isLoading ? (
          <LoadingDots />
        ) : (
          <>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {message.text}
            </p>
            {message.action?.type === 'draft_created' && (
              <DraftCard
                message={message}
                onNavigateToHistory={onNavigateToHistory}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

const AgentView: React.FC<AgentViewProps> = ({ onNavigateToHistory }) => {
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    isRecording,
    error,
    setError,
    sendMessage,
    startRecording,
    stopRecording,
  } = useAgent();

  // Auto-scroll to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Textarea auto-grow (up to 4 rows)
  // -------------------------------------------------------------------------

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24; // px — matches text-sm line-height
    const maxHeight = lineHeight * 4 + 24; // 4 rows + vertical padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -------------------------------------------------------------------------
  // Hold-to-record pointer events
  // -------------------------------------------------------------------------

  const handleMicPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleMicPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRecording) stopRecording();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    // The Layout's <main> has px-4 pt-4 pb-32. We use -mx-4 -mt-4 to cancel
    // horizontal and top padding, then let pb-32 still apply for bottom nav.
    <div className="flex flex-col -mx-4 -mt-4" style={{ height: 'calc(100% + 1rem)' }}>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onNavigateToHistory={onNavigateToHistory}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <p className="flex-1 text-xs text-red-600 font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mx-4 mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">
            Grabando...
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta..."
          disabled={isLoading}
          className="flex-1 resize-none rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
          aria-label="Mensaje al agente SUNAT"
        />

        {/* Mic button — hold to record */}
        <button
          onPointerDown={handleMicPointerDown}
          onPointerUp={handleMicPointerUp}
          onPointerLeave={handleMicPointerUp}
          disabled={isLoading && !isRecording}
          aria-label={isRecording ? 'Detener grabación' : 'Mantener para grabar'}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 select-none ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Mic size={20} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          aria-label="Enviar mensaje"
          className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AgentView;
