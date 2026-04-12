import { useEffect, useMemo, useState } from 'react';
import { ChatMessage, listenMessages, sendMessage } from '@/src/features/chat/services/chatService';

type UseChatResult = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  error: string | null;
  canSend: boolean;
  sendText: () => Promise<void>;
};

export const useChat = (chatId: string | null, senderId: string | null): UseChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenMessages(
      chatId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [chatId]);

  const canSend = useMemo(() => Boolean(chatId && senderId && input.trim().length > 0), [chatId, input, senderId]);

  const sendText = async () => {
    if (!chatId || !senderId) {
      return;
    }

    const normalized = input.trim();
    if (!normalized) {
      return;
    }

    setError(null);

    try {
      await sendMessage(chatId, normalized, senderId);
      setInput('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje.');
    }
  };

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    canSend,
    sendText,
  };
};
