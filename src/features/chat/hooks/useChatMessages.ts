import { useEffect, useState } from 'react';
import { ChatMessage, listenMessages, sendMessage } from '@/src/features/chat/services/chatService';

type UseChatMessagesResult = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendText: (text: string, senderId: string) => Promise<void>;
};

export const useChatMessages = (chatId: string | null): UseChatMessagesResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenMessages(chatId, (nextMessages) => {
      setMessages(nextMessages);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  const sendText = async (text: string, senderId: string) => {
    if (!chatId) return;

    setError(null);
    try {
      await sendMessage(chatId, text, senderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    }
  };

  return { messages, loading, error, sendText };
};
