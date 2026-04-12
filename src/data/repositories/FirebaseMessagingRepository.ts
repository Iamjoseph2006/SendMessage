import { firebaseDataSource } from '@/src/data/firebase/FirebaseDataSource';
import { callLogs, profileData, statusItems } from '@/src/data/mock/mockData';
import { AuthSession, CallLog, ChatSummary, Message, Profile, StatusItem, User } from '@/src/domain/entities';
import { MessagingRepository } from '@/src/domain/repositories/MessagingRepository';

const parseField = (fields: Record<string, any>, key: string) => fields?.[key]?.stringValue ?? '';
const parseDocId = (docName: string) => docName.split('/').pop() ?? '';

export class FirebaseMessagingRepository implements MessagingRepository {
  private session: AuthSession | null = null;
  private currentUser: User | null = null;

  async signUp(name: string, email: string, password: string): Promise<AuthSession> {
    const data = await firebaseDataSource.signUp(email, password);
    this.session = {
      userId: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
    this.currentUser = { id: data.localId, email: data.email, name, photoURL: '', lastSeen: new Date().toISOString() };
    return this.session;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const data = await firebaseDataSource.signIn(email, password);
    this.session = {
      userId: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
    this.currentUser = { id: data.localId, email: data.email, name: 'Usuario', photoURL: '', lastSeen: new Date().toISOString() };
    return this.session;
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.currentUser = null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.session;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async getChats(): Promise<ChatSummary[]> {
    if (!this.session) return [];

    const docs = await firebaseDataSource.getDocuments('chats', this.session.idToken);

    return docs.map((doc: any) => ({
      id: parseDocId(doc.name),
      name: parseField(doc.fields, 'name') || 'Chat',
      avatarColor: '#D9EAFF',
      lastMessage: parseField(doc.fields, 'lastMessage') || 'Sin mensajes',
      time: 'Ahora',
      unreadCount: 0,
      updatedAt: parseField(doc.fields, 'updatedAt'),
    }));
  }

  async getMessages(chatId: string): Promise<Message[]> {
    if (!this.session) return [];
    const docs = await firebaseDataSource.getDocuments('messages', this.session.idToken);

    return docs
      .map((doc: any) => ({
        id: parseDocId(doc.name),
        chatId: parseField(doc.fields, 'chatId'),
        sender: parseField(doc.fields, 'senderId') === this.session?.userId ? 'me' : 'contact',
        senderId: parseField(doc.fields, 'senderId'),
        text: parseField(doc.fields, 'text'),
        type: 'text' as const,
        time: 'Ahora',
        createdAt: parseField(doc.fields, 'createdAt'),
        status: 'sent' as const,
      }))
      .filter((message: Message) => message.chatId === chatId)
      .sort((a: Message, b: Message) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  }

  listenMessages(chatId: string, onUpdate: (messages: Message[]) => void) {
    const interval = setInterval(async () => {
      try {
        const messages = await this.getMessages(chatId);
        onUpdate(messages);
      } catch {
        // Silenciamos errores transitorios de red para mantener el polling activo.
      }
    }, 1600);

    return () => clearInterval(interval);
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    if (!this.session) throw new Error('La sesión no está activa.');

    const createdAt = new Date().toISOString();
    const created = await firebaseDataSource.createDocument(
      'messages',
      {
        chatId: { stringValue: chatId },
        senderId: { stringValue: this.session.userId },
        text: { stringValue: text },
        type: { stringValue: 'text' },
        mediaUrl: { nullValue: null },
        createdAt: { stringValue: createdAt },
        status: { stringValue: 'sent' },
      },
      this.session.idToken,
    );

    return {
      id: parseDocId(created.name),
      chatId,
      sender: 'me',
      senderId: this.session.userId,
      text,
      type: 'text',
      time: 'Ahora',
      createdAt,
      status: 'sent',
    };
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

export const firebaseMessagingRepository = new FirebaseMessagingRepository();
