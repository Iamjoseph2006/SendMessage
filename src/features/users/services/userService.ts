import { FirestoreError, Timestamp, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

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


const mapFirestoreError = (error: unknown): Error => {
  const firestoreError = error as Partial<FirestoreError>;

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice en Firestore para completar la consulta.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo completar la operación de usuario en Firestore.');
};

const mapUser = (source: Record<string, unknown>, documentId: string): UserProfile => ({
  uid: documentId,
  email: (source.email as string | undefined) ?? '',
  name: (source.name as string | undefined) ?? '',
  photoURL: (source.photoURL as string | null | undefined) ?? null,
  online: Boolean(source.online),
  createdAt: (source.createdAt as Timestamp | undefined) ?? null,
});

export const listenUsers = (
  currentUserUid: string | undefined,
  callback: (users: UserProfile[]) => void,
  onError?: (error: Error) => void,
) => {
  if (typeof callback !== 'function') {
    throw new Error('listenUsers requiere un callback válido.');
  }

  const firestore = requireDb();
  const usersQuery = collection(firestore, 'users');

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs
        .map((docSnapshot) => mapUser(docSnapshot.data(), docSnapshot.id))
        .filter((user) => user.uid !== currentUserUid);

      const filteredUsers = users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

      callback(filteredUsers);
    },
    (error) => onError?.(mapFirestoreError(error)),
  );
};

export const getUsers = async (currentUserUid?: string): Promise<UserProfile[]> => {
  const firestore = requireDb();
  let snapshot;

  try {
    snapshot = await getDocs(query(collection(firestore, 'users')));
  } catch (error) {
    throw mapFirestoreError(error);
  }

  return snapshot.docs
    .map((docSnapshot) => mapUser(docSnapshot.data(), docSnapshot.id))
    .filter((user) => user.uid !== currentUserUid)
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
};

export const getUserById = async (uid: string): Promise<UserProfile | null> => {
  const firestore = requireDb();
  let userSnapshot;

  try {
    userSnapshot = await getDoc(doc(firestore, 'users', uid));
  } catch (error) {
    throw mapFirestoreError(error);
  }

  if (!userSnapshot.exists()) {
    return null;
  }

  const profile = mapUser(userSnapshot.data(), userSnapshot.id);
  return profile;
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

      const profile = mapUser(snapshot.data(), snapshot.id);
      callback(profile);
    },
    (error) => onError?.(mapFirestoreError(error)),
  );
};

export const updateUserName = async (uid: string, name: string) => {
  const firestore = requireDb();
  const nextName = name.trim();

  if (!nextName) {
    throw new Error('El nombre no puede estar vacío.');
  }

  try {
    await setDoc(
      doc(firestore, 'users', uid),
      {
        uid,
        name: nextName,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw mapFirestoreError(error);
  }
};

export const getUsersByUids = async (uids: string[]): Promise<UserProfile[]> => {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  if (uniqueUids.length === 0) {
    return [];
  }

  const firestore = requireDb();
  const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', uniqueUids.slice(0, 10)));
  let snapshot;

  try {
    snapshot = await getDocs(usersQuery);
  } catch (error) {
    throw mapFirestoreError(error);
  }

  const users = snapshot.docs.map((docSnapshot) => mapUser(docSnapshot.data(), docSnapshot.id));
  return users;
};
