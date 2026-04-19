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
  console.error(
    `[userService] Error Firestore code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
    error,
  );

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice en Firestore para completar la consulta.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo completar la operación de usuario en Firestore.');
};

const normalizeUid = (source: Record<string, unknown>, documentId: string): string => {
  const sourceUid = typeof source.uid === 'string' ? source.uid.trim() : '';
  return sourceUid || documentId;
};

const mapUser = (source: Record<string, unknown>, documentId: string): UserProfile => ({
  uid: normalizeUid(source, documentId),
  email: (source.email as string | undefined) ?? '',
  name: (source.name as string | undefined) ?? '',
  photoURL: (source.photoURL as string | null | undefined) ?? null,
  online: Boolean(source.online),
  createdAt: (source.createdAt as Timestamp | undefined) ?? null,
});

const isValidUserDocument = (source: Record<string, unknown>, documentId: string): boolean => {
  const uid = normalizeUid(source, documentId);
  const email = typeof source.email === 'string' ? source.email.trim() : '';
  const name = typeof source.name === 'string' ? source.name.trim() : '';

  if (!uid) {
    console.warn(`[userService] Documento users/${documentId} ignorado: uid vacío.`);
    return false;
  }

  if (!email && !name) {
    console.warn(`[userService] Documento users/${documentId} ignorado: faltan email y name.`);
    return false;
  }

  return true;
};

const dedupeUsersByUid = (users: UserProfile[]): UserProfile[] => {
  const usersByUid = new Map<string, UserProfile>();

  users.forEach((profile) => {
    if (!profile.uid) {
      return;
    }

    if (!usersByUid.has(profile.uid)) {
      usersByUid.set(profile.uid, profile);
      return;
    }

    const previous = usersByUid.get(profile.uid);
    const currentScore = Number(Boolean(profile.name?.trim())) + Number(Boolean(profile.email?.trim()));
    const previousScore = Number(Boolean(previous?.name?.trim())) + Number(Boolean(previous?.email?.trim()));

    if (currentScore > previousScore) {
      usersByUid.set(profile.uid, profile);
    }
  });

  return [...usersByUid.values()];
};

const mapUsersFromSnapshot = (docs: { id: string; data: () => Record<string, unknown> }[], currentUserUid?: string) => {
  const users = docs
    .map((docSnapshot) => ({ id: docSnapshot.id, data: docSnapshot.data() }))
    .filter(({ id, data }) => isValidUserDocument(data, id))
    .map(({ id, data }) => mapUser(data, id));

  return dedupeUsersByUid(users)
    .filter((user) => user.uid !== currentUserUid)
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
};

const getUserByUidField = async (uid: string): Promise<UserProfile | null> => {
  const firestore = requireDb();
  const usersQuery = query(collection(firestore, 'users'), where('uid', '==', uid));

  let snapshot;

  try {
    snapshot = await getDocs(usersQuery);
  } catch (error) {
    throw mapFirestoreError(error);
  }

  const [profile] = mapUsersFromSnapshot(snapshot.docs);
  return profile ?? null;
};

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
      const filteredUsers = mapUsersFromSnapshot(snapshot.docs, currentUserUid);
      console.log(
        `[userService] onSnapshot users OK. docs=${snapshot.size}, válidos=${filteredUsers.length}, excludeUid=${currentUserUid ?? 'none'}.`,
      );
      callback(filteredUsers);
    },
    (error) => {
      const firestoreError = error as Partial<FirestoreError>;
      console.error(
        `[userService] onSnapshot users FALLÓ. code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
      );
      onError?.(mapFirestoreError(error));
    },
  );
};

export const getUsers = async (currentUserUid?: string): Promise<UserProfile[]> => {
  const firestore = requireDb();
  let snapshot;

  try {
    snapshot = await getDocs(collection(firestore, 'users'));
    console.log(`[userService] getDocs users OK. docs=${snapshot.size}.`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError>;
    console.error(
      `[userService] getDocs users FALLÓ. code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
    );
    throw mapFirestoreError(error);
  }

  const users = mapUsersFromSnapshot(snapshot.docs, currentUserUid);
  console.log(`[userService] getUsers devolvió ${users.length} usuarios válidos.`);
  return users;
};

export const getUserById = async (uid: string): Promise<UserProfile | null> => {
  const firestore = requireDb();
  let userSnapshot;

  try {
    userSnapshot = await getDoc(doc(firestore, 'users', uid));
    console.log(`[userService] getDoc users/${uid} OK. exists=${userSnapshot.exists()}.`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError>;
    console.error(
      `[userService] getDoc users/${uid} FALLÓ. code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
    );
    throw mapFirestoreError(error);
  }

  if (userSnapshot.exists()) {
    const data = userSnapshot.data();
    if (isValidUserDocument(data, userSnapshot.id)) {
      return mapUser(data, userSnapshot.id);
    }
  }

  return getUserByUidField(uid);
};

export const listenUserById = (
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) => {
  const firestore = requireDb();
  let isActive = true;

  const fallbackToUidQuery = async () => {
    try {
      const profile = await getUserByUidField(uid);
      if (isActive) {
        callback(profile);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : mapFirestoreError(error));
    }
  };

  const unsubscribe = onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        void fallbackToUidQuery();
        return;
      }

      const data = snapshot.data();
      if (!isValidUserDocument(data, snapshot.id)) {
        void fallbackToUidQuery();
        return;
      }

      const profile = mapUser(data, snapshot.id);
      callback(profile);
    },
    (error) => onError?.(mapFirestoreError(error)),
  );

  return () => {
    isActive = false;
    unsubscribe();
  };
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

  const users = snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, data: docSnapshot.data() }))
    .filter(({ id, data }) => isValidUserDocument(data, id))
    .map(({ id, data }) => mapUser(data, id));
  return dedupeUsersByUid(users);
};
