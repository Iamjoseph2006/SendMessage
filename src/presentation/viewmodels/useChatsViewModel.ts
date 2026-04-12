import { ChatSummary } from '@/src/domain/entities';
import { getChatsUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useState } from 'react';

export const useChatsViewModel = () => {
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchChats = () => {
      getChatsUseCase().then((nextChats) => {
        if (mounted) setChats([...nextChats]);
      });
    };

    fetchChats();
    const timer = setInterval(fetchChats, 1200);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return { chats };
};
