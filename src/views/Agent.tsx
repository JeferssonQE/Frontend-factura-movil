// views/Agent.tsx

import { Mic, Send } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import Button from '../components/ui/Button';
import Notice from '../components/ui/Notice';
import { useAgent } from '../hooks/useAgent';
import type { ChatMessage } from '../services/integrations/agentService';

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
  <div className="flex items-center gap-1.5 px-1 py-1">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="size-2 animate-bounce rounded-full bg-slate-300"
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
        <div className="max-w-[80%] rounded-card rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-card rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
        {message.isLoading ? (
          <LoadingDots />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
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
  const { messages, inputText, setInputText, isLoading, error, setError, sendMessage } = useAgent();

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
    <div className="-mx-4 -mt-4 flex h-[calc(100%+1rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-2 pt-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2">
          <Notice tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Notice>
        </div>
      )}

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-2">
        {QUICK_TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => handleChipClick(topic)}
            disabled={isLoading}
            className="min-h-9 shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-accent/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {topic}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Ej: ¿Que es el IGV? ¿Cuando emitir una nota de credito?"
          disabled={isLoading}
          className="max-h-[120px] min-h-11 flex-1 resize-none overflow-y-auto rounded-control border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          aria-label="Consulta sobre SUNAT"
        />

        {/* Mic button — disabled, coming soon */}
        <Button
          variant="ghost"
          size="icon"
          disabled
          title="Próximamente"
          aria-label="Próximamente"
          className="shrink-0 bg-slate-100"
        >
          <Mic size={20} />
        </Button>

        <Button
          size="icon"
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          aria-label="Enviar consulta"
          className="shrink-0"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
};

export default AgentView;
