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

type EnsureUserProfilePayload = {
  email: string;
  name: string;
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
    await ensureUserDocument(firebaseUser.uid, {
      email: firebaseUser.email,
      name: firebaseUser.displayName?.trim() || firebaseUser.email,
    });
  } catch (error) {
    if (isNonBlockingProfileSyncError(error)) {
      console.warn('No se pudo sincronizar perfil en Firestore durante login, se continuará con sesión autenticada.', error);
      return;
    }

    throw error;
  }
};

const hasMissingRequiredFields = (data: Record<string, unknown> | undefined, expectedUid: string) => {
  if (!data) {
    return true;
  }

  const uid = typeof data.uid === 'string' ? data.uid.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';

  return !uid || uid !== expectedUid || !email || !name || !data.createdAt;
};

export const ensureUserDocument = async (uid: string, payload: EnsureUserProfilePayload) => {
  const firestoreClient = getFirestoreClient();
  const normalizedProfile = normalizeProfilePayload(uid, payload);
  const userRef = doc(firestoreClient, 'users', normalizedProfile.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      uid: normalizedProfile.uid,
      email: normalizedProfile.email,
      name: normalizedProfile.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      online: true,
    });
    console.log(`[authService] Perfil users/${normalizedProfile.uid} creado desde Auth.`);
    return;
  }

  const currentData = userSnapshot.data();
  const requiresRepair = hasMissingRequiredFields(currentData, normalizedProfile.uid);

  if (requiresRepair) {
    await setDoc(
      userRef,
      {
        uid: normalizedProfile.uid,
        email: normalizedProfile.email,
        name: normalizedProfile.name,
        online: Boolean(currentData?.online),
        createdAt: currentData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    console.warn(`[authService] Perfil users/${normalizedProfile.uid} reparado por campos faltantes.`);
    return;
  }

  const currentName = typeof currentData?.name === 'string' ? currentData.name.trim() : '';
  const currentEmail = typeof currentData?.email === 'string' ? currentData.email.trim() : '';

  await updateDoc(userRef, {
    ...(currentEmail !== normalizedProfile.email ? { email: normalizedProfile.email } : {}),
    ...(currentName ? {} : { name: normalizedProfile.name }),
    ...(currentData?.uid ? {} : { uid: normalizedProfile.uid }),
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

    await ensureUserDocument(credentials.user.uid, {
      email: credentials.user.email ?? normalizedEmail,
      name: normalizedName,
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
