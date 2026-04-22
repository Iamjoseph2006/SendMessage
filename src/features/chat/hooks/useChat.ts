import { useEffect, useMemo, useState } from 'react';
import {
  ChatLocation,
  ChatMessage,
  ChatMessageType,
  ChatContact,
  deleteMessageForEveryone,
  deleteMessageForMe,
  editMessage,
  listenMessages,
  markChatAsRead,
  markChatAsDelivered,
  sendMessage,
  sendMessagePayload,
  reactToMessage,
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
  isSendingMedia: boolean;
  isSendingAudio: boolean;
  replyingTo: ChatMessage | null;
  setReplyingTo: (value: ChatMessage | null) => void;
  sendText: () => Promise<void>;
  sendImage: (localUri: string, caption?: string) => Promise<void>;
  sendAudio: (localUri: string) => Promise<void>;
  sendLocation: (location: ChatLocation) => Promise<void>;
  sendContact: (contact: ChatContact) => Promise<void>;
  forwardMessage: (message: ChatMessage) => Promise<void>;
  editOwnMessage: (messageId: string, text: string) => Promise<void>;
  deleteForMe: (messageId: string) => Promise<void>;
  deleteForEveryone: (messageId: string) => Promise<void>;
  toggleStar: (message: ChatMessage) => Promise<void>;
  togglePin: (message: ChatMessage) => Promise<void>;
  react: (message: ChatMessage, emoji: string) => Promise<void>;
};

const mapError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const useChat = (chatId: string | null, senderId: string | null): UseChatResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);

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

  useEffect(() => {
    if (!chatId || !senderId) {
      return;
    }

    if (!messages.length) {
      return;
    }

    const latest = messages[messages.length - 1];
    if (latest.senderId === senderId) {
      return;
    }

    markChatAsDelivered(chatId, senderId).catch(() => undefined);
    markChatAsRead(chatId, senderId).catch(() => undefined);
  }, [chatId, messages, senderId]);

  const canSend = useMemo(() => Boolean(chatId && senderId && input.trim().length > 0), [chatId, input, senderId]);

  const sendWithType = async (payload: { text?: string; type: ChatMessageType; mediaUrl?: string | null; audioUrl?: string | null; location?: ChatLocation | null; contact?: ChatContact | null }) => {
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
        contact: payload.contact,
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
      throw sendError;
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
    if (!chatId || !senderId || isSendingMedia) {
      return;
    }

    setIsSendingMedia(true);
    setError(null);

    try {
      const url = await uploadChatMedia(chatId, localUri, 'image', senderId);
      await sendWithType({ text: caption, type: 'image', mediaUrl: url });
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar la imagen.'));
      throw sendError;
    } finally {
      setIsSendingMedia(false);
    }
  };

  const sendAudio = async (localUri: string) => {
    if (!chatId || !senderId || isSendingAudio) {
      return;
    }

    setIsSendingAudio(true);
    setError(null);

    try {
      const url = await uploadChatMedia(chatId, localUri, 'audio', senderId);
      await sendWithType({ type: 'audio', audioUrl: url });
    } catch (sendError) {
      setError(mapError(sendError, 'No se pudo enviar el audio.'));
      throw sendError;
    } finally {
      setIsSendingAudio(false);
    }
  };

  const sendLocation = async (location: ChatLocation) => {
    await sendWithType({ type: 'location', location });
  };

  const sendContact = async (contact: ChatContact) => {
    await sendWithType({ type: 'contact', contact, text: contact.name });
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
        contact: message.contact,
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

  const react = async (message: ChatMessage, emoji: string) => {
    if (!senderId) {
      return;
    }
    const previousEmoji =
      Object.entries(message.reactions ?? {}).find(([, userIds]) => userIds.includes(senderId))?.[0] ?? null;
    try {
      await reactToMessage(message.id, senderId, emoji, previousEmoji);
    } catch (toggleError) {
      setError(mapError(toggleError, 'No se pudo reaccionar al mensaje.'));
    }
  };

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    canSend,
    isSendingMedia,
    isSendingAudio,
    replyingTo,
    setReplyingTo,
    sendText,
    sendImage,
    sendAudio,
    sendLocation,
    sendContact,
    forwardMessage,
    editOwnMessage,
    deleteForMe,
    deleteForEveryone,
    toggleStar,
    togglePin,
    react,
  };
};
