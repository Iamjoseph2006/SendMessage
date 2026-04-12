import { Message, MessageStatus } from '@/src/domain/entities';
import { getMessagesUseCase, listenMessagesUseCase, sendMessageUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useMemo, useState } from 'react';

const nextStatus: Record<MessageStatus, MessageStatus> = {
  sent: 'delivered',
  delivered: 'read',
  received: 'read',
  read: 'read',
};

const advanceStatus = (messages: Message[]) =>
  messages.map((message, index) => {
    if (message.sender !== 'me' || index !== messages.length - 1) return message;

    return { ...message, status: nextStatus[message.status] };
  });

const mergeMessages = (current: Message[], incoming: Message[]) => {
  const merged = new Map<string, Message>();

  current.forEach((message) => merged.set(message.id, message));
  incoming.forEach((message) => merged.set(message.id, message));

  return [...merged.values()].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
};

export const useConversationViewModel = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    getMessagesUseCase(chatId)
      .then((initialMessages) => {
        if (!isMounted) return;
        setMessages(initialMessages);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes.');
      });

    const unsubscribe = listenMessagesUseCase(chatId, (nextMessages: Message[]) => {
      if (!isMounted) return;
      setMessages((prev) => mergeMessages(prev, nextMessages));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [chatId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setInterval(() => setMessages((prev) => advanceStatus(prev)), 2500);
    return () => clearInterval(timer);
  }, [messages.length]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendText = async () => {
    if (!canSend) return;
    setError(null);
    try {
      const created = await sendMessageUseCase(chatId, input.trim());
      setMessages((prev) => mergeMessages(prev, [created]));
      setInput('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el mensaje.');
    }
  };

  const sendTemplateMessage = async (text: string) => {
    setError(null);
    try {
      const created = await sendMessageUseCase(chatId, text);
      setMessages((prev) => mergeMessages(prev, [created]));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el mensaje.');
    }
  };

  return { messages, input, setInput, canSend, sendText, sendTemplateMessage, error };
};
