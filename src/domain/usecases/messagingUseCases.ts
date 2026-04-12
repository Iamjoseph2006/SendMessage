import { isFirebaseConfigured } from '@/src/data/firebase/firebaseConfig';
import { firebaseMessagingRepository } from '@/src/data/repositories/FirebaseMessagingRepository';
import { mockMessagingRepository } from '@/src/data/repositories/MockMessagingRepository';
import { Message } from '@/src/domain/entities';
import { MessagingRepository } from '@/src/domain/repositories/MessagingRepository';

const repository: MessagingRepository = isFirebaseConfigured ? firebaseMessagingRepository : mockMessagingRepository;

export const signUpUseCase = (name: string, email: string, password: string) =>
  repository.signUp?.(name, email, password);
export const signInUseCase = (email: string, password: string) => repository.signIn?.(email, password);
export const signOutUseCase = () => repository.signOut?.();
export const getCurrentSessionUseCase = () => repository.getCurrentSession?.();

export const getChatsUseCase = () => repository.getChats();
export const getMessagesUseCase = (chatId: string) => repository.getMessages(chatId);
export const listenMessagesUseCase = (chatId: string, onUpdate: (messages: Message[]) => void) =>
  repository.listenMessages?.(chatId, onUpdate);
export const sendMessageUseCase = (chatId: string, text: string) => repository.sendMessage(chatId, text);
export const sendImageMessageUseCase = (chatId: string, localUri: string) =>
  repository.sendImageMessage?.(chatId, localUri);

export const getCallsUseCase = () => repository.getCalls();
export const getStatusesUseCase = () => repository.getStatuses();
export const getProfileUseCase = () => repository.getProfile();
