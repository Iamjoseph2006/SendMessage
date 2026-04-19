import {
  FirestoreError,
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

export type StatusItem = {
  id: string;
  userId: string;
  content: string;
  createdAt?: Timestamp | null;
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

export const createStatus = async (userId: string, content: string): Promise<string> => {
  const firestore = requireDb();
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('El estado no puede estar vacío.');
  }

  try {
    const snapshot = await addDoc(collection(firestore, 'status'), {
      userId,
      content: normalizedContent,
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

      return {
        id: docSnapshot.id,
        userId: data.userId as string,
        content: data.content as string,
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
