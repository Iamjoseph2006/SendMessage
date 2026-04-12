import { createDoc, FirestoreValue, getCollectionDocs, onSnapshot, patchDoc } from '@/src/config/firestoreClient';
import { getCurrentUser } from '@/src/features/auth/services/authService';

export type Chat = {
  id: string;
  participants: string[];
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'text';
  createdAt?: string;
};

const parseString = (fields: Record<string, any>, key: string) => fields?.[key]?.stringValue ?? '';
const parseDocId = (docName: string) => docName.split('/').pop() ?? '';
const parseArrayStrings = (fields: Record<string, any>, key: string) =>
  (fields?.[key]?.arrayValue?.values ?? []).map((value: { stringValue?: string }) => value.stringValue ?? '');

const asStringField = (value: string): FirestoreValue => ({ stringValue: value });

const getUserToken = () => {
  const user = getCurrentUser();
  if (!user?.idToken) throw new Error('No hay sesión activa.');
  return user.idToken;
};

const getNow = () => new Date().toISOString();

const buildChatId = (userId1: string, userId2: string) => [userId1, userId2].sort().join('_');

export const createChat = async (userId1: string, userId2: string): Promise<string> => {
  const token = getUserToken();
  const chatId = buildChatId(userId1, userId2);

  const existing = await getCollectionDocs('chats', token);
  const alreadyExists = existing.some((doc: any) => parseDocId(doc.name) === chatId);

  if (!alreadyExists) {
    await createDoc(
      'chats',
      {
        participants: {
          arrayValue: {
            values: [{ stringValue: userId1 }, { stringValue: userId2 }],
          },
        },
        createdAt: asStringField(getNow()),
        updatedAt: asStringField(getNow()),
        lastMessage: asStringField(''),
      },
      token,
      chatId,
    );
  }

  return chatId;
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  const token = getUserToken();
  const docs = await getCollectionDocs('chats', token);

  return docs
    .map((doc: any) => ({
      id: parseDocId(doc.name),
      participants: parseArrayStrings(doc.fields, 'participants'),
      createdAt: parseString(doc.fields, 'createdAt'),
      updatedAt: parseString(doc.fields, 'updatedAt'),
      lastMessage: parseString(doc.fields, 'lastMessage'),
    }))
    .filter((chat: Chat) => chat.participants.includes(userId))
    .sort((a: Chat, b: Chat) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
};

export const listenUserChats = (userId: string, callback: (chats: Chat[]) => void) =>
  onSnapshot(() => getUserChats(userId), callback, { intervalMs: 1800 });

export const sendMessage = async (chatId: string, text: string, senderId: string): Promise<string> => {
  const token = getUserToken();
  const normalized = text.trim();
  if (!normalized) throw new Error('El mensaje no puede estar vacío.');

  const createdAt = getNow();
  const created = await createDoc(
    `chats/${chatId}/messages`,
    {
      senderId: asStringField(senderId),
      text: asStringField(normalized),
      type: asStringField('text'),
      createdAt: asStringField(createdAt),
    },
    token,
  );

  await patchDoc(
    `chats/${chatId}`,
    {
      updatedAt: asStringField(createdAt),
      lastMessage: asStringField(normalized),
    },
    token,
  );

  return parseDocId(created.name);
};

export const fetchMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const token = getUserToken();
  const docs = await getCollectionDocs(`chats/${chatId}/messages`, token);

  return docs
    .map((doc: any) => ({
      id: parseDocId(doc.name),
      chatId,
      senderId: parseString(doc.fields, 'senderId'),
      text: parseString(doc.fields, 'text'),
      type: 'text' as const,
      createdAt: parseString(doc.fields, 'createdAt'),
    }))
    .sort((a: ChatMessage, b: ChatMessage) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
};

export const listenMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) =>
  onSnapshot(() => fetchMessages(chatId), callback, { intervalMs: 1200 });
