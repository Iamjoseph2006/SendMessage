import { Timestamp, addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

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

export const createStatus = async (userId: string, content: string): Promise<string> => {
  const firestore = requireDb();
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('El estado no puede estar vacío.');
  }

  const snapshot = await addDoc(collection(firestore, 'status'), {
    userId,
    content: normalizedContent,
    createdAt: serverTimestamp(),
  });

  return snapshot.id;
};

export const getStatuses = async (): Promise<StatusItem[]> => {
  const firestore = requireDb();
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
};
