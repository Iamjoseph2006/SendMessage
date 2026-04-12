import { MessagingRepository } from '@/src/domain/repositories/MessagingRepository';
import { AuthSession, CallLog, ChatSummary, Message, Profile, StatusItem, User } from '@/src/domain/entities';
import { callLogs, chatMessagesByChatId, chatSummaries, profileData, statusItems } from '../mock/mockData';

const formatHour = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export class MockMessagingRepository implements MessagingRepository {
  private messages = new Map(Object.entries(chatMessagesByChatId));
  private session: AuthSession | null = null;

  async signUp(name: string, email: string): Promise<AuthSession> {
    const session = {
      userId: `u-${Date.now()}`,
      email,
      idToken: `mock-token-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
    };
    this.session = session;
    profileData.name = name;
    return session;
  }

  async signIn(email: string): Promise<AuthSession> {
    const session = {
      userId: `u-${Date.now()}`,
      email,
      idToken: `mock-token-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
    };
    this.session = session;
    return session;
  }

  async signOut(): Promise<void> {
    this.session = null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.session;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.session) return null;
    return {
      id: this.session.userId,
      email: this.session.email,
      name: profileData.name,
      lastSeen: new Date().toISOString(),
    };
  }

  async getChats(): Promise<ChatSummary[]> {
    return chatSummaries;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return this.messages.get(chatId) ?? [];
  }

  listenMessages(chatId: string, onUpdate: (messages: Message[]) => void) {
    const timer = setInterval(() => {
      onUpdate(this.messages.get(chatId) ?? []);
    }, 1800);

    return () => clearInterval(timer);
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    const message: Message = {
      id: `m-${Date.now()}`,
      chatId,
      sender: 'me',
      text,
      type: 'text',
      time: formatHour(),
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    const existing = this.messages.get(chatId) ?? [];
    this.messages.set(chatId, [...existing, message]);

    return message;
  }

  async sendImageMessage(chatId: string, localUri: string): Promise<Message> {
    return this.sendMessage(chatId, `🖼️ ${localUri}`);
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
