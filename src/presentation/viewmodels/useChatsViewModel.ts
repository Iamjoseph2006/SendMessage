import { ChatSummary } from '@/src/domain/entities';
import { getChatsUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useState } from 'react';

export const useChatsViewModel = () => {
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useEffect(() => {
    getChatsUseCase().then(setChats);
  }, []);

  return { chats };
};
