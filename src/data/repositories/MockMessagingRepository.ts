import { MessagingRepository } from '@/src/domain/repositories/MessagingRepository';
import { CallLog, ChatSummary, Message, Profile, StatusItem } from '@/src/domain/entities';
import { callLogs, chatMessagesByChatId, chatSummaries, profileData, statusItems } from '../mock/mockData';

const formatHour = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export class MockMessagingRepository implements MessagingRepository {
  private messages = new Map(Object.entries(chatMessagesByChatId));

  async getChats(): Promise<ChatSummary[]> {
    return chatSummaries;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return this.messages.get(chatId) ?? [];
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    const message: Message = {
      id: `m-${Date.now()}`,
      chatId,
      sender: 'me',
      text,
      time: formatHour(),
      status: 'sent',
    };

    const existing = this.messages.get(chatId) ?? [];
    this.messages.set(chatId, [...existing, message]);

    return message;
  }

  async getCalls(): Promise<CallLog[]> {
    return callLogs;
  }

  async getStatuses(): Promise<StatusItem[]> {
    return statusItems;
  }

  async getProfile(): Promise<Profile> {
    return profileData;
  }
}

export const mockMessagingRepository = new MockMessagingRepository();
