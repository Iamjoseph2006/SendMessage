import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  createdAt?: Timestamp | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

export const getUsers = async (excludeUid?: string): Promise<UserProfile[]> => {
  const firestore = requireDb();
  const snapshot = await getDocs(collection(firestore, 'users'));

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();

      return {
        uid: data.uid as string,
        email: data.email as string,
        name: (data.name as string | undefined) ?? 'Sin nombre',
        createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      } as UserProfile;
    })
    .filter((user) => Boolean(user.uid) && user.uid !== excludeUid)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getUsersByUids = async (uids: string[]): Promise<UserProfile[]> => {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  if (uniqueUids.length === 0) {
    return [];
  }

  const firestore = requireDb();
  const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', uniqueUids.slice(0, 10)));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      uid: data.uid as string,
      email: data.email as string,
      name: (data.name as string | undefined) ?? 'Sin nombre',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
    } as UserProfile;
  });
};
