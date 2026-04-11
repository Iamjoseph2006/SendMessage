import { CallLog, ChatSummary, Message, Profile, StatusItem } from '../entities';

export interface MessagingRepository {
  getChats(): Promise<ChatSummary[]>;
  getMessages(chatId: string): Promise<Message[]>;
  sendMessage(chatId: string, text: string): Promise<Message>;
  getCalls(): Promise<CallLog[]>;
  getStatuses(): Promise<StatusItem[]>;
  getProfile(): Promise<Profile>;
}
