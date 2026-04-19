import { useEffect, useState } from 'react';
import { Chat, listenUserChats } from '@/src/features/chat/services/chatService';

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

    const unsubscribe = listenUserChats(
      userId,
      (nextChats) => {
        setChats(nextChats);
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
