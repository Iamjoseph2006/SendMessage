import { Timestamp, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  online: boolean;
  createdAt?: Timestamp | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

const mapUser = (source: Record<string, unknown>): UserProfile => ({
  uid: (source.uid as string | undefined) ?? '',
  email: (source.email as string | undefined) ?? '',
  name: (source.name as string | undefined) ?? 'Sin nombre',
  photoURL: (source.photoURL as string | null | undefined) ?? null,
  online: Boolean(source.online),
  createdAt: (source.createdAt as Timestamp | undefined) ?? null,
});

export const getUsers = async (excludeUid?: string): Promise<UserProfile[]> => {
  const firestore = requireDb();
  const snapshot = await getDocs(collection(firestore, 'users'));

  return snapshot.docs
    .map((docSnapshot) => mapUser(docSnapshot.data()))
    .filter((user) => Boolean(user.uid) && user.uid !== excludeUid)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getUserById = async (uid: string): Promise<UserProfile | null> => {
  const firestore = requireDb();
  const userSnapshot = await getDoc(doc(firestore, 'users', uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  return mapUser(userSnapshot.data());
};

export const listenUserById = (
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) => {
  const firestore = requireDb();

  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(mapUser(snapshot.data()));
    },
    (error) => onError?.(error as Error),
  );
};

export const updateUserName = async (uid: string, name: string) => {
  const firestore = requireDb();
  const nextName = name.trim();

  if (!nextName) {
    throw new Error('El nombre no puede estar vacío.');
  }

  await updateDoc(doc(firestore, 'users', uid), {
    name: nextName,
  });
};

export const getUsersByUids = async (uids: string[]): Promise<UserProfile[]> => {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  if (uniqueUids.length === 0) {
    return [];
  }

  const firestore = requireDb();
  const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', uniqueUids.slice(0, 10)));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((docSnapshot) => mapUser(docSnapshot.data()));
};
