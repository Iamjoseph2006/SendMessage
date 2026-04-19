import {
  FirestoreError,
  GeoPoint,
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FirebaseStorage, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type StatusLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type StatusKind = 'text' | 'image' | 'audio' | 'location';

export type StatusItem = {
  id: string;
  userId: string;
  content: string;
  type: StatusKind;
  imageUri?: string | null;
  audioUri?: string | null;
  emojis?: string[];
  location?: StatusLocation | null;
  viewedBy?: string[];
  backgroundColor?: string | null;
  expiresAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};

export type CreateStatusInput = {
  content: string;
  imageUri?: string | null;
  audioUri?: string | null;
  emojis?: string[];
  location?: StatusLocation | null;
  backgroundColor?: string | null;
};

export type StatusComment = {
  id: string;
  statusId: string;
  userId: string;
  text: string;
  createdAt?: Timestamp | null;
};

const STATUS_DURATION_MS = 24 * 60 * 60 * 1000;

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

const mapFirestoreError = (error: unknown): Error => {
  const firestoreError = error as Partial<FirestoreError>;

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice para consultar estados.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo completar la operación de estados.');
};

const isMissingIndexError = (error: unknown) => (error as Partial<FirestoreError>)?.code === 'failed-precondition';

const uploadStatusMedia = async (userId: string, uri: string, kind: 'image' | 'audio') => {
  const storage = getStorageInstance();
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('No se pudo leer el archivo de estado.');
  }

  const blob = await response.blob();
  const extension = uri.split('.').pop()?.split('?')[0] ?? (kind === 'image' ? 'jpg' : 'm4a');
  const fileRef = ref(storage, `status/${userId}/${kind}_${Date.now()}.${extension}`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
};

const detectStatusType = (input: CreateStatusInput): StatusKind => {
  if (input.imageUri) return 'image';
  if (input.audioUri) return 'audio';
  if (input.location) return 'location';
  return 'text';
};

const mapStatus = (id: string, data: Record<string, any>): StatusItem => {
  const location = data.location as GeoPoint | undefined;

  return {
    id,
    userId: data.userId as string,
    content: (data.content as string | undefined) ?? '',
    type: (data.type as StatusKind | undefined) ?? 'text',
    imageUri: (data.imageUri as string | undefined) ?? null,
    audioUri: (data.audioUri as string | undefined) ?? null,
    emojis: (data.emojis as string[] | undefined) ?? [],
    location: location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          label: (data.locationLabel as string | undefined) ?? undefined,
        }
      : null,
    viewedBy: (data.viewedBy as string[] | undefined) ?? [],
    backgroundColor: (data.backgroundColor as string | undefined) ?? null,
    expiresAt: (data.expiresAt as Timestamp | undefined) ?? null,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  };
};

const isExpired = (status: StatusItem) => {
  const expiry = status.expiresAt?.toMillis();
  return typeof expiry === 'number' ? expiry < Date.now() : false;
};

export const createStatus = async (userId: string, contentOrInput: string | CreateStatusInput): Promise<string> => {
  const firestore = requireDb();
  const input: CreateStatusInput = typeof contentOrInput === 'string' ? { content: contentOrInput } : contentOrInput;
  const normalizedContent = input.content.trim();

  if (!normalizedContent && !input.imageUri && !input.audioUri && !input.location) {
    throw new Error('Agrega texto, foto, audio o ubicación para publicar el estado.');
  }

  try {
    const imageUri = input.imageUri ? await uploadStatusMedia(userId, input.imageUri, 'image') : null;
    const audioUri = input.audioUri ? await uploadStatusMedia(userId, input.audioUri, 'audio') : null;

    const snapshot = await addDoc(collection(firestore, 'status'), {
      userId,
      content: normalizedContent,
      type: detectStatusType({ ...input, imageUri, audioUri }),
      imageUri,
      audioUri,
      emojis: input.emojis ?? [],
      viewedBy: [userId],
      location: input.location ? new GeoPoint(input.location.latitude, input.location.longitude) : null,
      locationLabel: input.location?.label ?? null,
      backgroundColor: input.backgroundColor ?? null,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATUS_DURATION_MS),
    });

    return snapshot.id;
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const getStatuses = async (): Promise<StatusItem[]> => {
  const firestore = requireDb();

  try {
    const statusesQuery = query(collection(firestore, 'status'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(statusesQuery);

    return snapshot.docs
      .map((docSnapshot) => mapStatus(docSnapshot.id, docSnapshot.data()))
      .filter((status) => !isExpired(status));
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const listenStatuses = (callback: (statuses: StatusItem[]) => void, onError?: (error: Error) => void) => {
  const firestore = requireDb();
  const statusesQuery = query(collection(firestore, 'status'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    statusesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((item) => mapStatus(item.id, item.data())).filter((status) => !isExpired(status)));
    },
    (error) => onError?.(mapFirestoreError(error)),
  );
};

export const markStatusAsViewed = async (statusId: string, viewerId: string): Promise<void> => {
  const firestore = requireDb();
  const statusRef = doc(firestore, 'status', statusId);
  const snapshot = await getDoc(statusRef);
  if (!snapshot.exists()) {
    return;
  }

  await updateDoc(statusRef, {
    viewedBy: arrayUnion(viewerId),
  });
};

export const getStatusesByUser = async (userId: string): Promise<StatusItem[]> => {
  const firestore = requireDb();

  try {
    const q = query(collection(firestore, 'status'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => mapStatus(docSnapshot.id, docSnapshot.data())).filter((status) => !isExpired(status));
  } catch (error) {
    if (isMissingIndexError(error)) {
      const fallbackQuery = query(collection(firestore, 'status'), orderBy('createdAt', 'desc'));
      const fallbackSnapshot = await getDocs(fallbackQuery);
      return fallbackSnapshot.docs
        .map((docSnapshot) => mapStatus(docSnapshot.id, docSnapshot.data()))
        .filter((status) => status.userId === userId && !isExpired(status));
    }
    throw mapFirestoreError(error);
  }
};

export const deleteStatus = async (statusId: string): Promise<void> => {
  const firestore = requireDb();

  try {
    await deleteDoc(doc(firestore, 'status', statusId));
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

const mapComment = (id: string, data: Record<string, unknown>): StatusComment => ({
  id,
  statusId: (data.statusId as string | undefined) ?? '',
  userId: (data.userId as string | undefined) ?? '',
  text: ((data.text as string | undefined) ?? '').trim(),
  createdAt: (data.createdAt as Timestamp | undefined) ?? null,
});

export const addStatusComment = async (statusId: string, userId: string, text: string): Promise<string> => {
  const firestore = requireDb();
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error('El comentario no puede estar vacío.');
  }

  const created = await addDoc(collection(firestore, 'statusComments'), {
    statusId,
    userId,
    text: normalizedText,
    createdAt: serverTimestamp(),
  });

  return created.id;
};

export const listenStatusComments = (
  statusId: string,
  callback: (comments: StatusComment[]) => void,
  onError?: (error: Error) => void,
) => {
  const firestore = requireDb();
  const commentsQuery = query(
    collection(firestore, 'statusComments'),
    where('statusId', '==', statusId),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(
    commentsQuery,
    (snapshot) => callback(snapshot.docs.map((item) => mapComment(item.id, item.data()))),
    (error) => onError?.(mapFirestoreError(error)),
  );
};
