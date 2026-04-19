import { AuthError, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { FirestoreError, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig, firebaseConfigError } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type AppUser = {
  uid: string;
  email: string;
  idToken: string;
  displayName?: string;
};

type EnsureUserProfilePayload = {
  email: string;
  name: string;
};

type NormalizedUserProfile = {
  uid: string;
  email: string;
  name: string;
};

const FIRESTORE_PROFILE_WRITE_TIMEOUT_MS = 12000;
const PROFILE_SYNC_MAX_RETRIES = 3;
const PROFILE_SYNC_RETRY_DELAY_MS = 1200;

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const firebaseNotConfiguredError = () =>
  new Error(firebaseConfigError ?? 'Firebase no está configurado.');

const getAuthClient = () => {
  if (!auth) {
    throw firebaseNotConfiguredError();
  }

  return auth;
};

const getFirestoreClient = () => {
  if (!db) {
    throw firebaseNotConfiguredError();
  }

  return db;
};

const mapFirebaseUser = async (user: User | null): Promise<AppUser | null> => {
  if (!user?.email) {
    return null;
  }

  const idToken = await user.getIdToken();

  return {
    uid: user.uid,
    email: user.email,
    idToken,
    displayName: user.displayName ?? undefined,
  };
};


const normalizeProfilePayload = (uid: string, payload: EnsureUserProfilePayload): NormalizedUserProfile => {
  const normalizedUid = toTrimmedString(uid);
  const normalizedEmail = toTrimmedString(payload.email);
  const normalizedName = toTrimmedString(payload.name);

  return {
    uid: normalizedUid,
    email: normalizedEmail,
    name: normalizedName || normalizedEmail || 'Usuario',
  };
};

const authErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Correo inválido.',
  'auth/user-not-found': 'Usuario no encontrado.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/email-already-in-use': 'El correo ya está registrado.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/weak-password': 'La contraseña es demasiado débil.',
  'auth/network-request-failed': 'Sin conexión de red. Verifica internet e inténtalo nuevamente.',
};

const normalizeAuthError = (error: unknown): Error => {
  const authError = error as Partial<AuthError>;
  if (authError?.code && authErrorMessages[authError.code]) {
    return new Error(authErrorMessages[authError.code]);
  }

  return mapFirebaseErrorToSpanish(error, 'No fue posible completar la autenticación.');
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};


const isNonBlockingProfileSyncError = (error: unknown): boolean => {
  const firebaseError = error as Partial<AuthError & FirestoreError> & { message?: string; code?: string };
  const normalizedCode = firebaseError?.code?.replace(/^auth\//, '') ?? firebaseError?.code ?? '';
  const normalizedMessage = firebaseError?.message?.toLowerCase() ?? '';

  return (
    normalizedCode === 'unavailable'
    || normalizedCode === 'network-request-failed'
    || normalizedMessage.includes('client is offline')
    || normalizedMessage.includes('network-request-failed')
  );
};

const isOfflineLikeFirestoreError = (error: unknown): boolean => {
  const firestoreError = error as Partial<FirestoreError> & { message?: string; code?: string };
  const normalizedCode = firestoreError?.code?.replace(/^auth\//, '') ?? firestoreError?.code ?? '';
  const normalizedMessage = firestoreError?.message?.toLowerCase() ?? '';

  return normalizedCode === 'unavailable' || normalizedMessage.includes('client is offline');
};

const getFirebaseLikeErrorCode = (error: unknown): string => {
  const firebaseError = error as Partial<AuthError & FirestoreError> & { code?: string };
  return firebaseError?.code ?? 'unknown';
};

const wait = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const logProfileWriteContext = (uid: string, origin: string) => {
  console.log(
    `[authService] Contexto sync users/${uid}. origen=${origin} projectId=${firebaseConfig.projectId || 'N/D'} appId=${firebaseConfig.appId || 'N/D'} authDomain=${firebaseConfig.authDomain || 'N/D'}.`,
  );
};

const syncUserProfileSafely = async (firebaseUser: User): Promise<void> => {
  if (!firebaseUser.email) {
    console.warn(`[authService] Sync users/${firebaseUser.uid} omitido: firebaseUser.email vacío.`);
    return;
  }

  const profilePayload = normalizeProfilePayload(firebaseUser.uid, {
    email: firebaseUser.email,
    name: firebaseUser.displayName ?? '',
  });

  for (let attempt = 1; attempt <= PROFILE_SYNC_MAX_RETRIES; attempt += 1) {
    try {
      logProfileWriteContext(firebaseUser.uid, 'syncUserProfileSafely');
      console.log(`[authService] Intentando sincronizar users/${firebaseUser.uid} (intento ${attempt}/${PROFILE_SYNC_MAX_RETRIES}).`);
      await ensureUserDocument(firebaseUser.uid, profilePayload);
      return;
    } catch (error) {
      const errorCode = getFirebaseLikeErrorCode(error);
      const canRetry = isNonBlockingProfileSyncError(error) && attempt < PROFILE_SYNC_MAX_RETRIES;

      console.warn(
        `[authService] Sync users/${firebaseUser.uid} falló (code=${errorCode}) en intento ${attempt}/${PROFILE_SYNC_MAX_RETRIES}.`,
        error,
      );

      if (!canRetry) {
        if (isNonBlockingProfileSyncError(error)) {
          console.warn(
            `[authService] No se pudo sincronizar users/${firebaseUser.uid} tras ${PROFILE_SYNC_MAX_RETRIES} intentos. Se mantiene sesión autenticada.`,
          );
          return;
        }

        throw error;
      }

      await wait(PROFILE_SYNC_RETRY_DELAY_MS * attempt);
    }
  }
};

export const ensureUserDocument = async (uid: string, payload: EnsureUserProfilePayload) => {
  const firestoreClient = getFirestoreClient();
  const normalizedProfile = normalizeProfilePayload(uid, payload);
  const userRef = doc(firestoreClient, 'users', normalizedProfile.uid);

  if (!normalizedProfile.uid || !normalizedProfile.email) {
    console.error(
      `[authService] ensureUserDocument abortado. uid='${normalizedProfile.uid}' email='${normalizedProfile.email}'.`,
    );
    throw new Error('No se puede persistir users/{uid} sin uid y email válidos.');
  }

  let existingCreatedAt: unknown = null;

  try {
    const existingSnapshot = await getDoc(userRef);
    existingCreatedAt = existingSnapshot.exists() ? existingSnapshot.data()?.createdAt : null;
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError> & { message?: string };
    console.warn(
      `[authService] No se pudo leer users/${normalizedProfile.uid} antes de sincronizar (code=${firestoreError.code ?? 'unknown'}). Se intentará setDoc directo.`,
      error,
    );
  }

  try {
    logProfileWriteContext(normalizedProfile.uid, 'ensureUserDocument:setDoc');
    await setDoc(
      userRef,
      {
        uid: normalizedProfile.uid,
        email: normalizedProfile.email,
        name: normalizedProfile.name,
        createdAt: existingCreatedAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        online: true,
      },
      { merge: true },
    );
    console.log(`[authService] Perfil users/${normalizedProfile.uid} creado/reparado en Firestore.`);
    console.log(`[userService] Usuario persistido correctamente users/${normalizedProfile.uid}`);
  } catch (error) {
    const firestoreError = error as Partial<FirestoreError> & { message?: string };
    console.error(
      `[authService] Error creando/reparando users/${normalizedProfile.uid} (code=${firestoreError.code ?? 'unknown'}).`,
      error,
    );
    throw error;
  }

  try {
    const persisted = await getDoc(userRef);
    if (persisted.exists()) {
      console.log(
        `[authService] Verificación OK users/${normalizedProfile.uid}. persisted=true email=${normalizedProfile.email}.`,
      );
      return;
    }

    console.error(
      `[authService] Verificación FALLÓ users/${normalizedProfile.uid}. persisted=false tras ensureUserDocument.`,
    );
    throw new Error(`No se pudo verificar la persistencia de users/${normalizedProfile.uid}.`);
  } catch (verificationError) {
    const firestoreError = verificationError as Partial<FirestoreError> & { message?: string };
    if (isOfflineLikeFirestoreError(verificationError)) {
      console.warn(
        `[authService] Verificación users/${normalizedProfile.uid} omitida por modo offline (code=${firestoreError.code ?? 'unknown'}). La escritura setDoc quedó en cola local.`,
      );
      return;
    }
    console.error(
      `[authService] Error verificando users/${normalizedProfile.uid} (code=${firestoreError.code ?? 'unknown'}).`,
      verificationError,
    );
    throw verificationError;
  }
};

export const registerUser = async (email: string, password: string, name: string): Promise<AppUser> => {
  try {
    const normalizedEmail = toTrimmedString(email);
    const normalizedName = toTrimmedString(name);

    if (!normalizedName) {
      throw new Error('El nombre es obligatorio.');
    }

    const authClient = getAuthClient();
    const credentials = await createUserWithEmailAndPassword(authClient, normalizedEmail, password);

    await updateProfile(credentials.user, {
      displayName: normalizedName,
    }).catch((profileError) => {
      console.warn('No se pudo guardar displayName en Auth durante el registro.', profileError);
    });

    const profilePayload = normalizeProfilePayload(credentials.user.uid, {
      email: credentials.user.email ?? normalizedEmail,
      name: normalizedName,
    });

    try {
      logProfileWriteContext(credentials.user.uid, 'registerUser:setDoc');
      await withTimeout(
        setDoc(doc(getFirestoreClient(), 'users', credentials.user.uid), {
          uid: credentials.user.uid,
          email: profilePayload.email,
          name: profilePayload.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          online: true,
        }),
        FIRESTORE_PROFILE_WRITE_TIMEOUT_MS,
        'profile-write-timeout',
      );
      console.log(`[authService] Registro creó users/${credentials.user.uid} correctamente.`);
    } catch (profileError) {
      if (!isNonBlockingProfileSyncError(profileError) && (profileError as Error)?.message !== 'profile-write-timeout') {
        throw profileError;
      }

      console.warn(
        'El perfil del usuario no se pudo guardar durante el registro en el tiempo esperado. Se continuará con la sesión.',
        profileError,
      );
      void ensureUserDocument(credentials.user.uid, profilePayload).catch((syncError) => {
        const firestoreError = syncError as Partial<FirestoreError>;
        console.error(
          `[authService] Registro: falló persistencia diferida de users/${credentials.user.uid}. code=${firestoreError?.code ?? 'unknown'}.`,
          syncError,
        );
      });
    }

    const mappedUser = await mapFirebaseUser(credentials.user);
    if (!mappedUser) {
      throw new Error('No fue posible crear la sesión del usuario.');
    }

    return mappedUser;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const loginUser = async (email: string, password: string): Promise<AppUser> => {
  try {
    const authClient = getAuthClient();
    const credentials = await signInWithEmailAndPassword(authClient, email.trim(), password);
    await syncUserProfileSafely(credentials.user);

    const mappedUser = await mapFirebaseUser(credentials.user);

    if (!mappedUser) {
      throw new Error('No fue posible iniciar sesión con este usuario.');
    }

    return mappedUser;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const logoutUser = async (): Promise<void> => {
  const authClient = getAuthClient();
  const uid = authClient.currentUser?.uid;

  await signOut(authClient);

  if (!uid) {
    return;
  }

  if (!db) {
    return;
  }

  void updateDoc(doc(db, 'users', uid), {
    online: false,
    updatedAt: serverTimestamp(),
  }).catch((error: unknown) => {
    console.warn('No se pudo marcar al usuario como desconectado en Firestore.', error);
  });
};

export const repairAuthenticatedUserProfile = async (firebaseUser: User | null): Promise<void> => {
  if (!firebaseUser?.uid || !firebaseUser.email) {
    return;
  }

  await syncUserProfileSafely(firebaseUser);
};

export const syncAuthenticatedUserProfile = repairAuthenticatedUserProfile;

export const getCurrentUser = async (): Promise<AppUser | null> => {
  return mapFirebaseUser(getAuthClient().currentUser);
};
