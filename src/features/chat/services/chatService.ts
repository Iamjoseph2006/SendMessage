import {
  FirestoreError,
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
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type Chat = {
  id: string;
  participants: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastMessage?: string;
  lastMessageType?: ChatMessageType;
  lastMessageSenderId?: string;
  lastMessageAt?: Timestamp | null;
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

const toDeterministicParticipants = (uid1: string, uid2: string): [string, string] => {
  const first = uid1.trim();
  const second = uid2.trim();

  if (!first || !second) {
    throw new Error('Se requieren ambos usuarios para crear un chat.');
  }

  if (first === second) {
    throw new Error('No puedes iniciar un chat contigo mismo.');
  }

  return [first, second].sort() as [string, string];
};

const buildChatId = (uid1: string, uid2: string) => toDeterministicParticipants(uid1, uid2).join('_');

const mapFirestoreError = (error: unknown): Error => {
  const firestoreError = error as Partial<FirestoreError>;

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice de Firestore para esta consulta. Despliega firestore.indexes.json.');
  }

  return mapFirebaseErrorToSpanish(error, 'Ocurrió un error inesperado con Firestore.');
};

const mapChat = (id: string, data: Record<string, unknown>): Chat => ({
  id,
  participants: (data.participants ?? []) as string[],
  createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
  lastMessage: (data.lastMessage as string | undefined) ?? undefined,
  lastMessageType: (data.lastMessageType as ChatMessageType | undefined) ?? undefined,
  lastMessageSenderId: (data.lastMessageSenderId as string | undefined) ?? undefined,
  lastMessageAt: (data.lastMessageAt as Timestamp | undefined) ?? null,
});

export const createChat = async (userId1: string, userId2: string): Promise<string> => {
  const firestore = requireDb();

  try {
    const [firstUid, secondUid] = toDeterministicParticipants(userId1, userId2);
    const chatId = buildChatId(firstUid, secondUid);
    const chatRef = doc(firestore, 'chats', chatId);
    const existing = await getDoc(chatRef);

    if (!existing.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participants: [firstUid, secondUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageType: 'text',
        lastMessageSenderId: '',
        lastMessageAt: null,
      });
    }

    return chatId;
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const createOrGetChat = createChat;

export const getChatById = async (chatId: string): Promise<Chat | null> => {
  const firestore = requireDb();

  try {
    const snapshot = await getDoc(doc(firestore, 'chats', chatId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapChat(snapshot.id, snapshot.data());
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const getUserChats = async (uid: string): Promise<Chat[]> => {
  const firestore = requireDb();

  try {
    const chatsQuery = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', uid),
      orderBy('updatedAt', 'desc'),
    );
    const snapshot = await getDocs(chatsQuery);

    return snapshot.docs.map((docSnapshot) => mapChat(docSnapshot.id, docSnapshot.data()));
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const listenUserChats = (uid: string, callback: (chats: Chat[]) => void, onError?: (error: Error) => void) => {
  const firestore = requireDb();
  const chatsQuery = query(
    collection(firestore, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs.map((docSnapshot) => mapChat(docSnapshot.id, docSnapshot.data()));
      callback(chats);
    },
    (error) => onError?.(mapFirestoreError(error)),
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

  if (!senderId?.trim()) {
    throw new Error('No se pudo identificar al remitente del mensaje.');
  }

  try {
    const chatRef = doc(firestore, 'chats', chatId);
    let chatSnapshot = await getDoc(chatRef);

    if (!chatSnapshot.exists()) {
      const participants = chatId.split('_').filter(Boolean);
      if (participants.length !== 2 || !participants.includes(senderId)) {
        throw new Error('El chat no existe y no se pudo inferir participantes válidos.');
      }

      const [firstUid, secondUid] = toDeterministicParticipants(participants[0], participants[1]);
      const deterministicChatId = buildChatId(firstUid, secondUid);

      if (deterministicChatId !== chatId) {
        throw new Error('El identificador del chat no coincide con el formato esperado.');
      }

      await setDoc(chatRef, {
        id: chatId,
        participants: [firstUid, secondUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageType: 'text',
        lastMessageSenderId: '',
        lastMessageAt: null,
      });

      chatSnapshot = await getDoc(chatRef);
    }

    const chat = mapChat(chatSnapshot.id, chatSnapshot.data() ?? {});

    if (!chat.participants.includes(senderId)) {
      throw new Error('No puedes enviar mensajes a un chat del que no eres participante.');
    }

    const created = await addDoc(collection(firestore, 'messages'), {
      chatId,
      text: normalizedText,
      senderId,
      type,
      createdAt: serverTimestamp(),
    });

    await updateDoc(chatRef, {
      lastMessage: normalizedText,
      lastMessageType: type,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return created.id;
  } catch (error) {
    throw mapFirestoreError(error);
  }
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
    (error) => onError?.(mapFirestoreError(error)),
  );
};
