import {
  FirestoreError,
  GeoPoint,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type StatusLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type StatusItem = {
  id: string;
  userId: string;
  content: string;
  imageUri?: string | null;
  audioUri?: string | null;
  emojis?: string[];
  location?: StatusLocation | null;
  createdAt?: Timestamp | null;
};

export type CreateStatusInput = {
  content: string;
  imageUri?: string | null;
  audioUri?: string | null;
  emojis?: string[];
  location?: StatusLocation | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

const mapFirestoreError = (error: unknown): Error => {
  const firestoreError = error as Partial<FirestoreError>;

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice para consultar estados.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo completar la operación de estados.');
};

export const createStatus = async (userId: string, contentOrInput: string | CreateStatusInput): Promise<string> => {
  const firestore = requireDb();
  const input: CreateStatusInput = typeof contentOrInput === 'string' ? { content: contentOrInput } : contentOrInput;
  const normalizedContent = input.content.trim();

  if (!normalizedContent && !input.imageUri && !input.audioUri && !input.location) {
    throw new Error('Agrega texto, foto, audio o ubicación para publicar el estado.');
  }

  try {
    const snapshot = await addDoc(collection(firestore, 'status'), {
      userId,
      content: normalizedContent,
      imageUri: input.imageUri ?? null,
      audioUri: input.audioUri ?? null,
      emojis: input.emojis ?? [],
      location: input.location
        ? new GeoPoint(input.location.latitude, input.location.longitude)
        : null,
      locationLabel: input.location?.label ?? null,
      createdAt: serverTimestamp(),
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

    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      const location = data.location as GeoPoint | undefined;

      return {
        id: docSnapshot.id,
        userId: data.userId as string,
        content: (data.content as string | undefined) ?? '',
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
        createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      } as StatusItem;
    });
  } catch (error) {
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
