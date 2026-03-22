// views/Agent.tsx
import React, { useEffect, useRef } from 'react';
import { Send, Mic, X } from 'lucide-react';
import { useAgent } from '../hooks/useAgent';
import { ChatMessage } from '../services/integrations/agentService';

// ---------------------------------------------------------------------------
// Quick-topic chips
// ---------------------------------------------------------------------------

const QUICK_TOPICS = [
  'IGV',
  'RUC',
  'Regimenes',
  'Detracciones',
  'Portal SOL',
  'Facturas',
  'Notas de Credito',
  'UIT 2025',
  'Libros Electronicos',
  'Multas SUNAT',
  'Fraccionamiento',
  'Renta 4ta Categoria',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
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
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

const AgentView: React.FC = () => {
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    error,
    setError,
    sendMessage,
  } = useAgent();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 24 * 4 + 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (topic: string) => {
    if (isLoading) return;
    sendMessage(`¿Que es ${topic}?`);
  };

  return (
    <div className="flex flex-col -mx-4 -mt-4" style={{ height: 'calc(100% + 1rem)' }}>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
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

      {/* Quick topics */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
        {QUICK_TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => handleChipClick(topic)}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-violet-100 hover:text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Ej: ¿Que es el IGV? ¿Cuando emitir una nota de credito?"
          disabled={isLoading}
          className="flex-1 resize-none rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
          aria-label="Consulta sobre SUNAT"
        />

        {/* Mic button — disabled, coming soon */}
        <button
          disabled
          title="Proximamente"
          aria-label="Proximamente"
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-300 cursor-not-allowed"
        >
          <Mic size={20} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          aria-label="Enviar consulta"
          className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AgentView;
