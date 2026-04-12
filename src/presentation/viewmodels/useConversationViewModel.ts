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

export const useConversationViewModel = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    getMessagesUseCase(chatId).then(setMessages);

    const unsubscribe = listenMessagesUseCase(chatId, (nextMessages: Message[]) => {
      setMessages(nextMessages);
    });

    return () => {
      unsubscribe?.();
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
    const created = await sendMessageUseCase(chatId, input.trim());
    setMessages((prev) => [...prev, created]);
    setInput('');
  };

  const sendTemplateMessage = async (text: string) => {
    const created = await sendMessageUseCase(chatId, text);
    setMessages((prev) => [...prev, created]);
  };

  return { messages, input, setInput, canSend, sendText, sendTemplateMessage };
};
