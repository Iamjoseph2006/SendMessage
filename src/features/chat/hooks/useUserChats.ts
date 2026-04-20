import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Chat, listenUserChats } from '@/src/features/chat/services/chatService';
import { toSafeMillis } from '@/src/shared/utils/date';

const buildCacheKey = (userId: string) => `user_chats_cache:${userId}`;

const normalizeChatDates = (chat: Chat): Chat => ({
  ...chat,
  createdAt: toSafeMillis(chat.createdAt),
  updatedAt: toSafeMillis(chat.updatedAt),
  lastMessageAt: toSafeMillis(chat.lastMessageAt),
  pinnedAt: toSafeMillis(chat.pinnedAt),
  lastReadAtByUser: Object.fromEntries(
    Object.entries(chat.lastReadAtByUser ?? {}).map(([uid, value]) => [uid, toSafeMillis(value)]),
  ),
});

const normalizeChats = (chats: Chat[]) => chats.map(normalizeChatDates);

export const useUserChats = (userId: string | null) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setChats([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    AsyncStorage.getItem(buildCacheKey(userId))
      .then((raw) => {
        if (raw) {
          const cached = normalizeChats(JSON.parse(raw) as Chat[]);
          setChats(cached);
          setLoading(false);
        }
      })
      .catch(() => undefined);

    const unsubscribe = listenUserChats(
      userId,
      (nextChats) => {
        const normalized = normalizeChats(nextChats);
        setChats(normalized);
        AsyncStorage.setItem(buildCacheKey(userId), JSON.stringify(normalized)).catch(() => undefined);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  return { chats, loading, error };
};
