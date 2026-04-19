import { AuthError, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigError } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type AppUser = {
  uid: string;
  email: string;
  idToken: string;
  displayName?: string;
};

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


const normalizeProfilePayload = (email: string, name?: string | null) => {
  const normalizedEmail = email.trim();
  const normalizedName = (name ?? '').trim();

  return {
    email: normalizedEmail,
    name: normalizedName || normalizedEmail,
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


const isNonBlockingProfileSyncError = (error: unknown): boolean => {
  const firebaseError = error as Partial<AuthError> & { message?: string; code?: string };
  const normalizedCode = firebaseError?.code?.replace(/^auth\//, '') ?? firebaseError?.code ?? '';
  const normalizedMessage = firebaseError?.message?.toLowerCase() ?? '';

  return (
    normalizedCode === 'unavailable'
    || normalizedCode === 'network-request-failed'
    || normalizedMessage.includes('client is offline')
    || normalizedMessage.includes('network-request-failed')
  );
};

const syncUserProfileSafely = async (firebaseUser: User): Promise<void> => {
  if (!firebaseUser.email) {
    return;
  }

  try {
    const profilePayload = normalizeProfilePayload(firebaseUser.email, firebaseUser.displayName);
    await ensureUserDocument(firebaseUser.uid, profilePayload);
  } catch (error) {
    if (isNonBlockingProfileSyncError(error)) {
      console.warn('No se pudo sincronizar perfil en Firestore durante login, se continuará con sesión autenticada.', error);
      return;
    }

    throw error;
  }
};

export const ensureUserDocument = async (
  uid: string,
  payload: {
    email: string;
    name: string;
  },
) => {
  const firestoreClient = getFirestoreClient();
  const userRef = doc(firestoreClient, 'users', uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      uid,
      email: payload.email,
      name: payload.name || payload.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      online: true,
    });
    return;
  }

  const currentData = userSnapshot.data();
  const currentName = typeof currentData?.name === 'string' ? currentData.name.trim() : '';

  await updateDoc(userRef, {
    email: payload.email,
    ...(currentName ? {} : { name: payload.name || payload.email }),
    online: true,
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
};

export const registerUser = async (email: string, password: string, name: string): Promise<AppUser> => {
  try {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error('El nombre es obligatorio.');
    }

    const authClient = getAuthClient();
    const credentials = await createUserWithEmailAndPassword(authClient, normalizedEmail, password);

    const profilePayload = normalizeProfilePayload(credentials.user.email ?? normalizedEmail, normalizedName);

    await setDoc(doc(getFirestoreClient(), 'users', credentials.user.uid), {
      uid: credentials.user.uid,
      email: profilePayload.email,
      name: profilePayload.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      online: true,
    });

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

  if (uid) {
    await updateDoc(doc(getFirestoreClient(), 'users', uid), {
      online: false,
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
  }

  await signOut(authClient);
};


export const syncAuthenticatedUserProfile = async (firebaseUser: User | null): Promise<void> => {
  if (!firebaseUser?.uid || !firebaseUser.email) {
    return;
  }

  await syncUserProfileSafely(firebaseUser);
};

export const getCurrentUser = async (): Promise<AppUser | null> => {
  return mapFirebaseUser(getAuthClient().currentUser);
};
