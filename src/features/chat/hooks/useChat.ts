import { useEffect, useMemo, useState } from 'react';
import {
  ChatLocation,
  ChatMessage,
  ChatMessageType,
  deleteMessageForEveryone,
  deleteMessageForMe,
  editMessage,
  listenMessages,
  sendMessage,
  sendMessagePayload,
  togglePinMessage,
  toggleStarMessage,
  uploadChatMedia,
} from '@/src/features/chat/services/chatService';

type UseChatResult = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  error: string | null;
  canSend: boolean;
  replyingTo: ChatMessage | null;
  setReplyingTo: (value: ChatMessage | null) => void;
  sendText: () => Promise<void>;
  sendImage: (localUri: string, caption?: string) => Promise<void>;
  sendAudio: (localUri: string) => Promise<void>;
  sendLocation: (location: ChatLocation) => Promise<void>;
  forwardMessage: (message: ChatMessage) => Promise<void>;
  editOwnMessage: (messageId: string, text: string) => Promise<void>;
  deleteForMe: (messageId: string) => Promise<void>;
  deleteForEveryone: (messageId: string) => Promise<void>;
  toggleStar: (message: ChatMessage) => Promise<void>;
  togglePin: (message: ChatMessage) => Promise<void>;
};

const mapError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const useChat = (chatId: string | null, senderId: string | null): UseChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

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

  const sendWithType = async (payload: { text?: string; type: ChatMessageType; mediaUrl?: string | null; audioUrl?: string | null; location?: ChatLocation | null }) => {
    if (!chatId || !senderId) {
      return;
    }

    setError(null);

    try {
      await sendMessagePayload(chatId, {
        senderId,
        text: payload.text,
        type: payload.type,
        mediaUrl: payload.mediaUrl,
        audioUrl: payload.audioUrl,
        location: payload.location,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderId: replyingTo.senderId,
              text: replyingTo.text,
              type: replyingTo.type,
            }
          : null,
      });
      setInput('');
      setReplyingTo(null);
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar el mensaje.'));
    }
  };

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
      if (replyingTo) {
        await sendWithType({ text: normalized, type: 'text' });
      } else {
        await sendMessage(chatId, normalized, senderId);
        setInput('');
      }
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar el mensaje.'));
    }
  };

  const sendImage = async (localUri: string, caption = '') => {
    if (!chatId || !senderId) {
      return;
    }

    try {
      const url = await uploadChatMedia(chatId, localUri, 'image', senderId);
      await sendWithType({ text: caption, type: 'image', mediaUrl: url });
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar la imagen.'));
    }
  };

  const sendAudio = async (localUri: string) => {
    if (!chatId || !senderId) {
      return;
    }

    try {
      const url = await uploadChatMedia(chatId, localUri, 'audio', senderId);
      await sendWithType({ type: 'audio', audioUrl: url });
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar el audio.'));
    }
  };

  const sendLocation = async (location: ChatLocation) => {
    await sendWithType({ type: 'location', location });
  };

  const forwardMessage = async (message: ChatMessage) => {
    if (!chatId || !senderId) {
      return;
    }

    try {
      await sendMessagePayload(chatId, {
        senderId,
        text: message.text,
        type: message.type,
        mediaUrl: message.mediaUrl,
        audioUrl: message.audioUrl,
        location: message.location,
        forwardedFrom: message.senderId,
      });
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo reenviar el mensaje.'));
    }
  };

  const editOwnMessage = async (messageId: string, text: string) => {
    if (!senderId) {
      return;
    }

    try {
      await editMessage(messageId, senderId, text);
    } catch (editError) {
      setError(mapError(editError, 'No se pudo editar el mensaje.'));
    }
  };

  const deleteForMe = async (messageId: string) => {
    if (!senderId) {
      return;
    }

    try {
      await deleteMessageForMe(messageId, senderId);
    } catch (deleteError) {
      setError(mapError(deleteError, 'No se pudo eliminar el mensaje para ti.'));
    }
  };

  const deleteForEveryone = async (messageId: string) => {
    if (!senderId) {
      return;
    }

    try {
      await deleteMessageForEveryone(messageId, senderId);
    } catch (deleteError) {
      setError(mapError(deleteError, 'No se pudo eliminar el mensaje para todos.'));
    }
  };

  const toggleStar = async (message: ChatMessage) => {
    if (!senderId) {
      return;
    }

    const isStarred = message.isStarredBy?.includes(senderId) ?? false;
    try {
      await toggleStarMessage(message.id, senderId, isStarred);
    } catch (toggleError) {
      setError(mapError(toggleError, 'No se pudo actualizar destacado.'));
    }
  };

  const togglePin = async (message: ChatMessage) => {
    if (!chatId) {
      return;
    }

    try {
      await togglePinMessage(chatId, message.id, !message.isPinned);
    } catch (toggleError) {
      setError(mapError(toggleError, 'No se pudo fijar el mensaje.'));
    }
  };

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    canSend,
    replyingTo,
    setReplyingTo,
    sendText,
    sendImage,
    sendAudio,
    sendLocation,
    forwardMessage,
    editOwnMessage,
    deleteForMe,
    deleteForEveryone,
    toggleStar,
    togglePin,
  };
};
