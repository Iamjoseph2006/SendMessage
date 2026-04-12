import { AuthSession, CallLog, ChatSummary, Message, Profile, StatusItem, User } from '../entities';

export interface MessagingRepository {
  signUp?(name: string, email: string, password: string): Promise<AuthSession>;
  signIn?(email: string, password: string): Promise<AuthSession>;
  signOut?(): Promise<void>;
  getCurrentSession?(): Promise<AuthSession | null>;
  getCurrentUser?(): Promise<User | null>;

  getChats(): Promise<ChatSummary[]>;
  getMessages(chatId: string): Promise<Message[]>;
  listenMessages?(chatId: string, onUpdate: (messages: Message[]) => void): () => void;
  sendMessage(chatId: string, text: string): Promise<Message>;
  sendImageMessage?(chatId: string, localUri: string): Promise<Message>;

  getCalls(): Promise<CallLog[]>;
  getStatuses(): Promise<StatusItem[]>;
  getProfile(): Promise<Profile>;
}
