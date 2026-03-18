// hooks/useAgent.ts
import { useState, useRef, useCallback } from 'react';
import {
  ChatMessage,
  ChatRole,
  sendTextToAgent,
  sendAudioToAgent,
  createDraftFromAgentResponse,
} from '../services/integrations/agentService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOADING_MESSAGE_ID = 'loading';

const initialWelcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Hola! Soy tu asistente de facturación SUNAT. Puedo ayudarte con consultas sobre IGV, comprobantes, y crear borradores de facturas o boletas.\n\n¿En qué te puedo ayudar?',
  timestamp: new Date(),
};

// ---------------------------------------------------------------------------
// Audio MIME type detection
// ---------------------------------------------------------------------------

function getBestAudioMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

// ---------------------------------------------------------------------------
// Base64 conversion via FileReader
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data-URI prefix: "data:<mime>;base64,"
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Error al leer el audio grabado.'));
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function genId(): string {
  return Date.now().toString();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('audio/webm');

  // -------------------------------------------------------------------------
  // History helper
  // Excludes the welcome message, loading placeholders, and action messages
  // from the Gemini multi-turn context (they are UI-only artifacts).
  // -------------------------------------------------------------------------

  const getHistory = useCallback(
    (): Array<{ role: ChatRole; text: string }> =>
      messages
        .filter(
          (m) =>
            m.id !== 'welcome' &&
            !m.isLoading &&
            m.text.trim().length > 0
        )
        .map((m) => ({ role: m.role, text: m.text })),
    [messages]
  );

  // -------------------------------------------------------------------------
  // Helpers to mutate message list
  // -------------------------------------------------------------------------

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const removeLoadingMessage = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.id !== LOADING_MESSAGE_ID));
  }, []);

  const addLoadingPlaceholder = useCallback(() => {
    const placeholder: ChatMessage = {
      id: LOADING_MESSAGE_ID,
      role: 'model',
      text: '',
      isLoading: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, placeholder]);
  }, []);

  // -------------------------------------------------------------------------
  // Process agent response (shared between text and audio flows)
  // -------------------------------------------------------------------------

  const processAgentResponse = useCallback(
    async (
      responsePromise: ReturnType<typeof sendTextToAgent>,
      currentHistory: Array<{ role: ChatRole; text: string }>
    ) => {
      void currentHistory; // captured before state update — passed for reference
      try {
        const response = await responsePromise;
        removeLoadingMessage();

        if (response.action === 'create_draft' && response.draft) {
          try {
            const invoice = await createDraftFromAgentResponse(response.draft);
            addMessage({
              id: genId(),
              role: 'model',
              text: response.message,
              timestamp: new Date(),
              action: { type: 'draft_created', invoice },
            });
          } catch (draftErr) {
            const errMsg =
              draftErr instanceof Error ? draftErr.message : 'Error al crear el borrador.';
            addMessage({
              id: genId(),
              role: 'model',
              text: `${response.message}\n\nNo pude guardar el borrador: ${errMsg}`,
              timestamp: new Date(),
            });
          }
        } else {
          addMessage({
            id: genId(),
            role: 'model',
            text: response.message,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        removeLoadingMessage();
        const errMsg =
          err instanceof Error ? err.message : 'Error desconocido.';
        setError(errMsg);
        addMessage({
          id: genId(),
          role: 'model',
          text: 'Lo siento, ocurrió un error. Intenta nuevamente.',
          timestamp: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, removeLoadingMessage]
  );

  // -------------------------------------------------------------------------
  // Send text message
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Capture history BEFORE adding the new user message so the new turn
      // isn't included in the history array sent to Gemini (it's the new turn).
      const history = getHistory();

      addMessage({
        id: genId(),
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      });

      addLoadingPlaceholder();

      await processAgentResponse(sendTextToAgent(trimmed, history), history);
    },
    [isLoading, getHistory, addMessage, addLoadingPlaceholder, processAgentResponse]
  );

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording || isLoading) return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestAudioMimeType();
      recordingMimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder al micrófono.';
      setError(msg);
    }
  }, [isRecording, isLoading]);

  const stopRecording = useCallback(async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop all tracks to release the microphone
        recorder.stream.getTracks().forEach((t) => t.stop());

        const mimeType = recordingMimeTypeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);

        try {
          setError(null);
          setIsLoading(true);

          const history = getHistory();

          addMessage({
            id: genId(),
            role: 'user',
            text: '🎤 Mensaje de voz',
            timestamp: new Date(),
            audioBlob,
          });

          addLoadingPlaceholder();

          const base64 = await blobToBase64(audioBlob);
          await processAgentResponse(
            sendAudioToAgent(base64, mimeType, history),
            history
          );
        } catch (err) {
          removeLoadingMessage();
          setIsLoading(false);
          setError('Error al procesar el audio grabado.');
          addMessage({
            id: genId(),
            role: 'model',
            text: 'Lo siento, ocurrió un error al procesar tu mensaje de voz.',
            timestamp: new Date(),
          });
        }

        resolve();
      };

      recorder.stop();
    });
  }, [
    getHistory,
    addMessage,
    addLoadingPlaceholder,
    removeLoadingMessage,
    processAgentResponse,
  ]);

  return {
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
  };
}
