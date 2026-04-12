import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export type Chat = {
  id: string;
  participants: string[];
  createdAt?: Timestamp | null;
};

export type ChatMessageType = 'text' | 'image' | 'audio' | 'location';

export type ChatMessage = {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  type: ChatMessageType;
  createdAt?: Timestamp | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

const buildChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

export const createChat = async (userId1: string, userId2: string): Promise<string> => {
  if (!userId1 || !userId2) {
    throw new Error('Se requieren ambos usuarios para crear un chat.');
  }

  const firestore = requireDb();
  const chatId = buildChatId(userId1, userId2);
  const chatRef = doc(firestore, 'chats', chatId);
  const existing = await getDoc(chatRef);

  if (!existing.exists()) {
    await setDoc(chatRef, {
      id: chatId,
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
};

export const createOrGetChat = createChat;

export const getChatById = async (chatId: string): Promise<Chat | null> => {
  const firestore = requireDb();
  const snapshot = await getDoc(doc(firestore, 'chats', chatId));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    participants: (data.participants ?? []) as string[],
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  };
};

export const getUserChats = async (uid: string): Promise<Chat[]> => {
  const firestore = requireDb();
  const chatsQuery = query(collection(firestore, 'chats'), where('participants', 'array-contains', uid));
  const snapshot = await getDocs(chatsQuery);

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        participants: (data.participants ?? []) as string[],
        createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      } as Chat;
    })
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
};

export const listenUserChats = (uid: string, callback: (chats: Chat[]) => void, onError?: (error: Error) => void) => {
  const firestore = requireDb();
  const chatsQuery = query(collection(firestore, 'chats'), where('participants', 'array-contains', uid));

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            participants: (data.participants ?? []) as string[],
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          } as Chat;
        })
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

      callback(chats);
    },
    (error) => onError?.(error as Error),
  );
};

export const sendMessage = async (
  chatId: string,
  text: string,
  senderId: string,
  type: ChatMessageType = 'text',
): Promise<string> => {
  const firestore = requireDb();
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  const created = await addDoc(collection(firestore, 'messages'), {
    chatId,
    text: normalizedText,
    senderId,
    type,
    createdAt: serverTimestamp(),
  });

  return created.id;
};

export const listenMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
) => {
  const firestore = requireDb();
  const messagesQuery = query(collection(firestore, 'messages'), where('chatId', '==', chatId), orderBy('createdAt', 'asc'));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();

        return {
          id: docSnapshot.id,
          chatId: data.chatId as string,
          text: data.text as string,
          senderId: data.senderId as string,
          type: (data.type as ChatMessageType | undefined) ?? 'text',
          createdAt: (data.createdAt as Timestamp | undefined) ?? null,
        } as ChatMessage;
      });

      callback(messages);
    },
    (error) => onError?.(error as Error),
  );
};
