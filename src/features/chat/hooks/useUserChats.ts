import { useEffect, useState } from 'react';
import { Chat, listenUserChats } from '@/src/features/chat/services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const buildCacheKey = (userId: string) => `user_chats_cache:${userId}`;

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
          const cached = JSON.parse(raw) as Chat[];
          setChats(cached);
          setLoading(false);
        }
      })
      .catch(() => undefined);

    const unsubscribe = listenUserChats(
      userId,
      (nextChats) => {
        setChats(nextChats);
        AsyncStorage.setItem(buildCacheKey(userId), JSON.stringify(nextChats)).catch(() => undefined);
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
