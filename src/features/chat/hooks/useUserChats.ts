import { useEffect, useState } from 'react';
import { Chat, listenUserChats } from '@/src/features/chat/services/chatService';

export const useUserChats = (userId: string | null) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChats([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenUserChats(userId, (nextChats) => {
      setChats(nextChats);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { chats, loading };
};
