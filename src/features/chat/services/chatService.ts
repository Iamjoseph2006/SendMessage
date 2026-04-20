import {
  FirestoreError,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FirebaseStorage, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, db } from '@/src/config/firebase';
import { DateInput, toSafeMillis } from '@/src/shared/utils/date';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type Chat = {
  id: string;
  participants: string[];
  createdAt?: DateInput;
  updatedAt?: DateInput;
  lastMessage?: string;
  lastMessageType?: ChatMessageType;
  lastMessageSenderId?: string;
  lastMessageAt?: DateInput;
  pinnedMessageId?: string | null;
  pinnedAt?: DateInput;
  unreadCountByUser?: Record<string, number>;
  lastReadAtByUser?: Record<string, DateInput>;
};

export type ChatMessageType = 'text' | 'image' | 'audio' | 'location';

export type ChatLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  type: ChatMessageType;
  createdAt?: DateInput;
  mediaUrl?: string | null;
  audioUrl?: string | null;
  location?: ChatLocation | null;
  replyTo?: Pick<ChatMessage, 'id' | 'senderId' | 'text' | 'type'> | null;
  forwardedFrom?: string | null;
  editedAt?: DateInput;
  isPinned?: boolean;
  isStarredBy?: string[];
  deletedFor?: string[];
  reactions?: Record<string, string[]>;
  deliveredAt?: DateInput;
  readAt?: DateInput;
};

export type SendMessageInput = {
  text?: string;
  senderId: string;
  type?: ChatMessageType;
  mediaUrl?: string | null;
  audioUrl?: string | null;
  location?: ChatLocation | null;
  replyTo?: Pick<ChatMessage, 'id' | 'senderId' | 'text' | 'type'> | null;
  forwardedFrom?: string | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

const getStorageInstance = (): FirebaseStorage => {
  if (!app) {
    throw new Error('Firebase Storage no está disponible porque Firebase no está inicializado.');
  }

  return getStorage(app);
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

const buildMessagePreview = (input: SendMessageInput): string => {
  if (input.type === 'image') {
    return input.text?.trim() ? `📷 ${input.text.trim()}` : '📷 Imagen';
  }

  if (input.type === 'audio') {
    return '🎤 Audio';
  }

  if (input.type === 'location') {
    return '📍 Ubicación';
  }

  return input.text?.trim() ?? '';
};

const mapChat = (id: string, data: Record<string, unknown>): Chat => ({
  id,
  participants: (data.participants ?? []) as string[],
  createdAt: (data.createdAt as DateInput | undefined) ?? null,
  updatedAt: (data.updatedAt as DateInput | undefined) ?? null,
  lastMessage: (data.lastMessage as string | undefined) ?? undefined,
  lastMessageType: (data.lastMessageType as ChatMessageType | undefined) ?? undefined,
  lastMessageSenderId: (data.lastMessageSenderId as string | undefined) ?? undefined,
  lastMessageAt: (data.lastMessageAt as DateInput | undefined) ?? null,
  pinnedMessageId: (data.pinnedMessageId as string | undefined) ?? null,
  pinnedAt: (data.pinnedAt as DateInput | undefined) ?? null,
  unreadCountByUser: (data.unreadCountByUser as Record<string, number> | undefined) ?? {},
  lastReadAtByUser: (data.lastReadAtByUser as Record<string, DateInput> | undefined) ?? {},
});

const buildUserChatsQuery = (uid: string) => query(collection(requireDb(), 'chats'), where('participants', 'array-contains', uid));

const mapMessage = (id: string, data: Record<string, unknown>): ChatMessage => ({
  id,
  chatId: data.chatId as string,
  text: (data.text as string | undefined) ?? '',
  senderId: data.senderId as string,
  type: (data.type as ChatMessageType | undefined) ?? 'text',
  createdAt: (data.createdAt as DateInput | undefined) ?? null,
  mediaUrl: (data.mediaUrl as string | undefined) ?? null,
  audioUrl: (data.audioUrl as string | undefined) ?? null,
  location: (data.location as ChatLocation | undefined) ?? null,
  replyTo: (data.replyTo as ChatMessage['replyTo']) ?? null,
  forwardedFrom: (data.forwardedFrom as string | undefined) ?? null,
  editedAt: (data.editedAt as DateInput | undefined) ?? null,
  isPinned: Boolean(data.isPinned),
  isStarredBy: (data.isStarredBy as string[] | undefined) ?? [],
  deletedFor: (data.deletedFor as string[] | undefined) ?? [],
  reactions: (data.reactions as Record<string, string[]> | undefined) ?? {},
  deliveredAt: (data.deliveredAt as DateInput | undefined) ?? null,
  readAt: (data.readAt as DateInput | undefined) ?? null,
});

const fetchBlobFromUri = async (uri: string) => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('No se pudo leer el archivo multimedia.');
  }

  return response.blob();
};

export const uploadChatMedia = async (chatId: string, uri: string, kind: 'image' | 'audio', senderId: string): Promise<string> => {
  try {
    const storage = getStorageInstance();
    const blob = await fetchBlobFromUri(uri);
    const extension = uri.split('.').pop()?.split('?')[0] ?? (kind === 'image' ? 'jpg' : 'm4a');
    const path = `chats/${chatId}/${kind}s/${senderId}_${Date.now()}.${extension}`;
    const mediaRef = ref(storage, path);
    await uploadBytes(mediaRef, blob, { contentType: kind === 'image' ? 'image/jpeg' : 'audio/m4a' });
    return await getDownloadURL(mediaRef);
  } catch (error) {
    throw mapFirebaseErrorToSpanish(error, 'No se pudo subir el archivo multimedia.');
  }
};

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
        pinnedMessageId: null,
        pinnedAt: null,
        unreadCountByUser: {
          [firstUid]: 0,
          [secondUid]: 0,
        },
        lastReadAtByUser: {
          [firstUid]: null,
          [secondUid]: null,
        },
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
  try {
    const snapshot = await getDocs(buildUserChatsQuery(uid));

    return snapshot.docs
      .map((docSnapshot) => mapChat(docSnapshot.id, docSnapshot.data()))
      .sort((a, b) => (toSafeMillis(b.lastMessageAt) || toSafeMillis(b.updatedAt)) - (toSafeMillis(a.lastMessageAt) || toSafeMillis(a.updatedAt)));
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const listenUserChats = (uid: string, callback: (chats: Chat[]) => void, onError?: (error: Error) => void) => {
  const chatsQuery = buildUserChatsQuery(uid);
  const unsubscribe = onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs
        .map((docSnapshot) => mapChat(docSnapshot.id, docSnapshot.data()))
        .sort(
          (a, b) =>
            (toSafeMillis(b.lastMessageAt) || toSafeMillis(b.updatedAt)) - (toSafeMillis(a.lastMessageAt) || toSafeMillis(a.updatedAt)),
        );
      callback(chats);
    },
    (error) => onError?.(mapFirestoreError(error)),
  );

  return unsubscribe;
};

export const sendMessage = async (chatId: string, text: string, senderId: string, type: ChatMessageType = 'text'): Promise<string> =>
  sendMessagePayload(chatId, { text, senderId, type });

export const sendMessagePayload = async (chatId: string, input: SendMessageInput): Promise<string> => {
  const firestore = requireDb();
  const normalizedText = input.text?.trim() ?? '';
  const type = input.type ?? 'text';

  if (!input.senderId?.trim()) {
    throw new Error('No se pudo identificar al remitente del mensaje.');
  }

  const hasPayload = Boolean(
    normalizedText || input.mediaUrl || input.audioUrl || input.location || type === 'location' || type === 'audio' || type === 'image',
  );

  if (!hasPayload) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  try {
    const chatRef = doc(firestore, 'chats', chatId);
    let chatSnapshot = await getDoc(chatRef);

    if (!chatSnapshot.exists()) {
      const participants = chatId.split('_').filter(Boolean);
      if (participants.length !== 2 || !participants.includes(input.senderId)) {
        throw new Error('El chat no existe y no se pudo inferir participantes válidos.');
      }

      const [firstUid, secondUid] = toDeterministicParticipants(participants[0], participants[1]);
      await setDoc(chatRef, {
        id: chatId,
        participants: [firstUid, secondUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageType: 'text',
        lastMessageSenderId: '',
        lastMessageAt: null,
        pinnedMessageId: null,
        pinnedAt: null,
        unreadCountByUser: {
          [firstUid]: 0,
          [secondUid]: 0,
        },
        lastReadAtByUser: {
          [firstUid]: null,
          [secondUid]: null,
        },
      });

      chatSnapshot = await getDoc(chatRef);
    }

    const chat = mapChat(chatSnapshot.id, chatSnapshot.data() ?? {});

    if (!chat.participants.includes(input.senderId)) {
      throw new Error('No puedes enviar mensajes a un chat del que no eres participante.');
    }

    const created = await addDoc(collection(firestore, 'messages'), {
      chatId,
      text: normalizedText,
      senderId: input.senderId,
      type,
      mediaUrl: input.mediaUrl ?? null,
      audioUrl: input.audioUrl ?? null,
      location: input.location ?? null,
      replyTo: input.replyTo ?? null,
      forwardedFrom: input.forwardedFrom ?? null,
      editedAt: null,
      isPinned: false,
      isStarredBy: [],
      deletedFor: [],
      reactions: {},
      deliveredAt: serverTimestamp(),
      readAt: null,
      createdAt: serverTimestamp(),
    });

    const unreadUpdate = chat.participants.reduce<Record<string, unknown>>((acc, participantId) => {
      if (participantId === input.senderId) {
        acc[`unreadCountByUser.${participantId}`] = 0;
        return acc;
      }

      acc[`unreadCountByUser.${participantId}`] = increment(1);
      return acc;
    }, {});

    await updateDoc(chatRef, {
      lastMessage: buildMessagePreview({ ...input, text: normalizedText, type }),
      lastMessageType: type,
      lastMessageSenderId: input.senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...unreadUpdate,
    });

    return created.id;
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const editMessage = async (messageId: string, senderId: string, text: string): Promise<void> => {
  const firestore = requireDb();
  const normalized = text.trim();

  if (!normalized) {
    throw new Error('El mensaje editado no puede estar vacío.');
  }

  const messageRef = doc(firestore, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  if (!snapshot.exists()) {
    throw new Error('El mensaje ya no existe.');
  }

  const data = snapshot.data();
  if (data.senderId !== senderId) {
    throw new Error('Solo puedes editar tus mensajes.');
  }

  await updateDoc(messageRef, {
    text: normalized,
    editedAt: serverTimestamp(),
  });
};

export const deleteMessageForMe = async (messageId: string, userId: string): Promise<void> => {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'messages', messageId), {
    deletedFor: arrayUnion(userId),
  });
};

export const deleteMessageForEveryone = async (messageId: string, userId: string): Promise<void> => {
  const firestore = requireDb();
  const messageRef = doc(firestore, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  if (!snapshot.exists()) {
    return;
  }

  if (snapshot.data().senderId !== userId) {
    throw new Error('Solo puedes eliminar para todos tus propios mensajes.');
  }

  await deleteDoc(messageRef);
};

export const toggleStarMessage = async (messageId: string, userId: string, isStarred: boolean): Promise<void> => {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'messages', messageId), {
    isStarredBy: isStarred ? arrayRemove(userId) : arrayUnion(userId),
  });
};

export const togglePinMessage = async (chatId: string, messageId: string, shouldPin: boolean): Promise<void> => {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'messages', messageId), {
    isPinned: shouldPin,
  });

  await updateDoc(doc(firestore, 'chats', chatId), {
    pinnedMessageId: shouldPin ? messageId : null,
    pinnedAt: shouldPin ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
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
      const messages = snapshot.docs.map((docSnapshot) => mapMessage(docSnapshot.id, docSnapshot.data()));
      callback(messages);
    },
    (error) => onError?.(mapFirestoreError(error)),
  );
};

export const reactToMessage = async (
  messageId: string,
  userId: string,
  emoji: string,
  previousEmoji?: string | null,
): Promise<void> => {
  const firestore = requireDb();
  const messageRef = doc(firestore, 'messages', messageId);
  if (previousEmoji && previousEmoji !== emoji) {
    await updateDoc(messageRef, {
      [`reactions.${previousEmoji}`]: arrayRemove(userId),
    });
  }
  await updateDoc(messageRef, {
    [`reactions.${emoji}`]: arrayUnion(userId),
  });
};

export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  const firestore = requireDb();
  await updateDoc(doc(firestore, 'chats', chatId), {
    [`unreadCountByUser.${userId}`]: 0,
    [`lastReadAtByUser.${userId}`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
