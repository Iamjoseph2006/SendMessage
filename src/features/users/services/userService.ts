import { User as FirebaseUser } from 'firebase/auth';
import { FirestoreError, Timestamp, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '@/src/config/firebase';
import { isPermissionDeniedFirestoreError, mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  online: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
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
  if (isPermissionDeniedFirestoreError(error)) {
    console.error(
      '[userService] Diagnóstico: Firestore rechazó la operación por reglas de seguridad (permission-denied). No es un problema de red ni de configuración del SDK.',
    );
  }

  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice en Firestore para completar la consulta.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo completar la operación de usuario en Firestore.');
};

const normalizeUid = (source: Record<string, unknown>, documentId: string): string => {
  const sourceUid = typeof source.uid === 'string' ? source.uid.trim() : '';
  return sourceUid || documentId;
};

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolveFallbackName = (source: Record<string, unknown>, email: string): string => {
  const directName = asTrimmedString(source.name);
  const displayName = asTrimmedString(source.displayName);
  return directName || displayName || email || 'Usuario';
};

const mapUser = (source: Record<string, unknown>, documentId: string): UserProfile => {
  const email = asTrimmedString(source.email);
  const name = resolveFallbackName(source, email);

  return {
    uid: normalizeUid(source, documentId),
    email,
    name,
    photoURL: (source.photoURL as string | null | undefined) ?? null,
    online: Boolean(source.online),
    createdAt: (source.createdAt as Timestamp | undefined) ?? null,
    updatedAt: (source.updatedAt as Timestamp | undefined) ?? null,
  };
};

const repairInFlight = new Set<string>();

const autoRepairUserDocument = async (
  documentId: string,
  source: Record<string, unknown>,
  reason: string,
): Promise<void> => {
  if (repairInFlight.has(documentId)) {
    return;
  }

  const firestore = requireDb();
  const uid = normalizeUid(source, documentId);
  if (!uid) {
    return;
  }

  const email = asTrimmedString(source.email) || (auth?.currentUser?.uid === uid ? auth.currentUser.email?.trim() ?? '' : '');
  const name = resolveFallbackName(
    {
      ...source,
      displayName: asTrimmedString(source.displayName) || (auth?.currentUser?.uid === uid ? auth.currentUser.displayName ?? '' : ''),
    },
    email,
  );

  repairInFlight.add(documentId);
  try {
    await setDoc(
      doc(firestore, 'users', documentId),
      {
        uid,
        email,
        name,
        online: typeof source.online === 'boolean' ? source.online : false,
        createdAt: source.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    console.log(
      `[userService] users/${documentId} autoreparado. razón=${reason} uid=${uid} email=${email || '(vacío)'} name=${name}.`,
    );
    console.log(`[userService] Usuario persistido correctamente users/${documentId}`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError>;
    console.error(
      `[userService] Falló autoreparación users/${documentId}. razón=${reason} code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
      error,
    );
    if (isPermissionDeniedFirestoreError(error)) {
      console.error(
        `[userService] Autorreparación bloqueada por reglas de Firestore en users/${documentId} (permission-denied).`,
      );
    }
  } finally {
    repairInFlight.delete(documentId);
  }
};

const isValidUserDocument = (source: Record<string, unknown>, documentId: string): boolean => {
  const uid = normalizeUid(source, documentId);
  const email = asTrimmedString(source.email);
  const name = resolveFallbackName(source, email);

  if (!uid) {
    console.warn(`[userService] Documento users/${documentId} descartado: uid vacío. fields=${JSON.stringify(Object.keys(source))}`);
    return false;
  }

  if (!email && !name) {
    console.warn(
      `[userService] Documento users/${documentId} descartado: faltan email y name incluso con fallback. fields=${JSON.stringify(source)}`,
    );
    void autoRepairUserDocument(documentId, source, 'faltan-email-y-name');
    return false;
  }

  if (!asTrimmedString(source.uid) || !asTrimmedString(source.name) || typeof source.online !== 'boolean' || !source.createdAt) {
    void autoRepairUserDocument(documentId, source, 'campos-minimos-faltantes');
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
  const mappedEntries = docs.map((docSnapshot) => ({ id: docSnapshot.id, data: docSnapshot.data() }));
  const users = mappedEntries.filter(({ id, data }) => isValidUserDocument(data, id)).map(({ id, data }) => mapUser(data, id));
  const dedupedUsers = dedupeUsersByUid(users).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  const usersBeforeExclude = dedupedUsers.length;
  const finalUsers = dedupedUsers.filter((user) => user.uid !== currentUserUid);
  const containsCurrentUser = currentUserUid ? dedupedUsers.some((user) => user.uid === currentUserUid) : false;
  const knownUids = dedupedUsers.map((user) => user.uid).filter(Boolean);

  return {
    users: finalUsers,
    rawDocs: docs.length,
    validBeforeExclude: usersBeforeExclude,
    afterExclude: finalUsers.length,
    containsCurrentUser,
    knownUids,
  };
};

const ensureAuthenticatedUserDoc = async (firebaseUser: FirebaseUser): Promise<void> => {
  const firestore = requireDb();
  const normalizedEmail = firebaseUser.email?.trim() ?? '';
  const normalizedName = firebaseUser.displayName?.trim() || normalizedEmail || 'Usuario';

  try {
    await setDoc(
      doc(firestore, 'users', firebaseUser.uid),
      {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        name: normalizedName,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        online: true,
      },
      { merge: true },
    );
    console.log(`[userService] users/${firebaseUser.uid} asegurado desde getUsers (autorreparación).`);
    console.log(`[userService] Usuario persistido correctamente users/${firebaseUser.uid}`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError>;
    console.error(
      `[userService] Falló autorreparación users/${firebaseUser.uid}. code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
      error,
    );
    if (isPermissionDeniedFirestoreError(error)) {
      console.error(
        `[userService] No se puede crear/reparar users/${firebaseUser.uid} por reglas de Firestore (permission-denied).`,
      );
    }
    throw error;
  }
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

  const [profile] = mapUsersFromSnapshot(snapshot.docs).users;
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
      const result = mapUsersFromSnapshot(snapshot.docs, currentUserUid);
      const isFromCache = snapshot.metadata.fromCache;
      console.log(
        `[userService] onSnapshot users OK. projectId=${firebaseConfig.projectId || 'N/D'} appId=${firebaseConfig.appId || 'N/D'} authDomain=${firebaseConfig.authDomain || 'N/D'} docs_crudos=${result.rawDocs}, válidos_antes_excluir=${result.validBeforeExclude}, finales=${result.afterExclude}, excludeUid=${currentUserUid ?? 'none'}, desde_cache=${isFromCache}, uids=[${result.knownUids.join(',') || 'none'}].`,
      );
      if (currentUserUid && result.containsCurrentUser && result.afterExclude === 0) {
        console.warn(
          `[userService] Solo existe users/${currentUserUid} tras excluir el usuario actual. Posible falta de persistencia del segundo usuario en colección users.`,
        );
      }
      if (result.rawDocs === 1 && result.validBeforeExclude === 1 && !isFromCache) {
        console.warn('[userService] WARN: posible inconsistencia de backend Firebase entre dispositivos');
      } else if (result.rawDocs === 1 && result.validBeforeExclude === 1 && isFromCache) {
        console.warn('[userService] Snapshot desde caché local (offline). Se omite advertencia de inconsistencia entre dispositivos.');
      }
      callback(result.users);
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
  let isFromCache = false;

  try {
    snapshot = await getDocs(collection(firestore, 'users'));
    isFromCache = snapshot.metadata.fromCache;
    console.log(`[userService] getDocs users OK. docs=${snapshot.size}.`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError>;
    console.error(
      `[userService] getDocs users FALLÓ. code=${firestoreError?.code ?? 'unknown'} message=${firestoreError?.message ?? 'N/D'}`,
    );
    throw mapFirestoreError(error);
  }

  if (snapshot.empty && currentUserUid && auth?.currentUser?.uid === currentUserUid) {
    console.warn(`[userService] Colección users vacía para ${currentUserUid}. Intentando autorreparar perfil autenticado.`);
    try {
      await ensureAuthenticatedUserDoc(auth.currentUser);
      snapshot = await getDocs(collection(firestore, 'users'));
      isFromCache = snapshot.metadata.fromCache;
      console.log(`[userService] getDocs users tras autorreparación. docs=${snapshot.size}.`);
    } catch (repairError) {
      throw mapFirestoreError(repairError);
    }
  }

  const result = mapUsersFromSnapshot(snapshot.docs, currentUserUid);
  console.log(
    `[userService] getUsers resumen. projectId=${firebaseConfig.projectId || 'N/D'} appId=${firebaseConfig.appId || 'N/D'} authDomain=${firebaseConfig.authDomain || 'N/D'} docs_crudos=${result.rawDocs}, válidos_antes_excluir=${result.validBeforeExclude}, finales=${result.afterExclude}, excludeUid=${currentUserUid ?? 'none'}, desde_cache=${isFromCache}, uids=[${result.knownUids.join(',') || 'none'}].`,
  );
  if (currentUserUid && result.containsCurrentUser && result.afterExclude === 0) {
    console.warn(
      `[userService] getUsers detectó solo users/${currentUserUid}. El segundo usuario no aparece persistido aún en users.`,
    );
  }
  if (result.rawDocs === 1 && result.validBeforeExclude === 1 && !isFromCache) {
    console.warn('[userService] WARN: posible inconsistencia de backend Firebase entre dispositivos');
  } else if (result.rawDocs === 1 && result.validBeforeExclude === 1 && isFromCache) {
    console.warn('[userService] Resultado desde caché local (offline). Se omite advertencia de inconsistencia entre dispositivos.');
  }
  return result.users;
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
