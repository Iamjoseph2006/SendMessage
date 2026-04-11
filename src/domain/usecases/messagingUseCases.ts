import { mockMessagingRepository } from '@/src/data/repositories/MockMessagingRepository';

export const getChatsUseCase = () => mockMessagingRepository.getChats();
export const getMessagesUseCase = (chatId: string) => mockMessagingRepository.getMessages(chatId);
export const sendMessageUseCase = (chatId: string, text: string) =>
  mockMessagingRepository.sendMessage(chatId, text);
export const getCallsUseCase = () => mockMessagingRepository.getCalls();
export const getStatusesUseCase = () => mockMessagingRepository.getStatuses();
export const getProfileUseCase = () => mockMessagingRepository.getProfile();
