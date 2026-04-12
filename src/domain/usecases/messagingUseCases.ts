import { isFirebaseConfigured } from '@/src/data/firebase/firebaseConfig';
import { firebaseMessagingRepository } from '@/src/data/repositories/FirebaseMessagingRepository';
import { mockMessagingRepository } from '@/src/data/repositories/MockMessagingRepository';
import { Message } from '@/src/domain/entities';
import { MessagingRepository } from '@/src/domain/repositories/MessagingRepository';

const repository: MessagingRepository = isFirebaseConfigured ? firebaseMessagingRepository : mockMessagingRepository;

const requireFeature = <T extends (...args: any[]) => any>(featureName: string, fn?: T): T => {
  if (!fn) {
    throw new Error(`La funcionalidad "${featureName}" no está disponible con el repositorio actual.`);
  }

  return fn;
};

export const signUpUseCase = (name: string, email: string, password: string) =>
  requireFeature('signUp', repository.signUp?.bind(repository))(name, email, password);
export const signInUseCase = (email: string, password: string) =>
  requireFeature('signIn', repository.signIn?.bind(repository))(email, password);
export const signOutUseCase = () => requireFeature('signOut', repository.signOut?.bind(repository))();
export const getCurrentSessionUseCase = () =>
  requireFeature('getCurrentSession', repository.getCurrentSession?.bind(repository))();

export const getChatsUseCase = () => repository.getChats();
export const getMessagesUseCase = (chatId: string) => repository.getMessages(chatId);
export const listenMessagesUseCase = (chatId: string, onUpdate: (messages: Message[]) => void) =>
  requireFeature('listenMessages', repository.listenMessages?.bind(repository))(chatId, onUpdate);
export const sendMessageUseCase = (chatId: string, text: string) => repository.sendMessage(chatId, text);
export const sendImageMessageUseCase = (chatId: string, localUri: string) =>
  requireFeature('sendImageMessage', repository.sendImageMessage?.bind(repository))(chatId, localUri);

export const getCallsUseCase = () => repository.getCalls();
export const getStatusesUseCase = () => repository.getStatuses();
export const getProfileUseCase = () => repository.getProfile();
