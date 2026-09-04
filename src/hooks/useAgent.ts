// hooks/useAgent.ts
import { useCallback, useState } from 'react';
import {
  type ChatMessage,
  type ChatRole,
  queryLocalKnowledge,
} from '../services/integrations/agentService';

export type { ChatRole };

const LOADING_MESSAGE_ID = 'loading';

const initialWelcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Bienvenido al Centro de Informacion SUNAT.\n\nAqui encontraras respuestas sobre normativa tributaria peruana actualizada: IGV, comprobantes, regimenes, declaraciones y mas.\n\n¿Sobre que tema deseas consultar?',
  timestamp: new Date(),
};

function genId(): string {
  return Date.now().toString();
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const removeLoadingMessage = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.id !== LOADING_MESSAGE_ID));
  }, []);

  const addLoadingPlaceholder = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: LOADING_MESSAGE_ID,
        role: 'model' as ChatRole,
        text: '',
        isLoading: true,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setIsLoading(true);

      addMessage({ id: genId(), role: 'user', text: trimmed, timestamp: new Date() });
      addLoadingPlaceholder();

      try {
        const { message } = await queryLocalKnowledge(trimmed);
        removeLoadingMessage();
        addMessage({ id: genId(), role: 'model', text: message, timestamp: new Date() });
      } catch {
        removeLoadingMessage();
        setError('Ocurrio un error al consultar la base de conocimiento.');
        addMessage({
          id: genId(),
          role: 'model',
          text: 'Lo siento, ocurrio un error. Intenta nuevamente.',
          timestamp: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage, addLoadingPlaceholder, removeLoadingMessage],
  );

  return {
    messages,
    inputText,
    setInputText,
    isLoading,
    error,
    setError,
    sendMessage,
  };
}
