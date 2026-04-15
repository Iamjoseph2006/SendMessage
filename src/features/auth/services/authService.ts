import {
  AuthError,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigError } from '@/src/config/firebase';

export type AppUser = {
  uid: string;
  email: string;
  idToken: string;
  displayName?: string;
};

let currentUser: AppUser | null = null;
let authSubscriptionInitialized = false;
let unsubscribeAuthState: (() => void) | null = null;
const listeners = new Set<(user: AppUser | null) => void>();

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

const notify = () => {
  listeners.forEach((callback) => callback(currentUser));
};

const authErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Correo inválido',
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/email-already-in-use': 'El correo ya está registrado',
  'auth/invalid-credential': 'Correo o contraseña incorrectos',
  'auth/weak-password': 'La contraseña es demasiado débil',
};

const normalizeAuthError = (error: unknown): Error => {
  const authError = error as Partial<AuthError>;
  if (authError?.code && authErrorMessages[authError.code]) {
    return new Error(authErrorMessages[authError.code]);
  }

  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error('No fue posible completar la autenticación.');
};

const ensureUserDocument = async (
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
      online: true,
    });
    return;
  }

  await updateDoc(userRef, {
    email: payload.email,
    name: payload.name || payload.email,
    online: true,
  }).catch(() => undefined);
};

const ensureAuthSubscription = () => {
  if (!auth || authSubscriptionInitialized) {
    return;
  }

  authSubscriptionInitialized = true;
  unsubscribeAuthState = onAuthStateChanged(auth, async (firebaseUser) => {
    currentUser = await mapFirebaseUser(firebaseUser);

    if (firebaseUser?.uid && firebaseUser.email) {
      try {
        await ensureUserDocument(firebaseUser.uid, {
          email: firebaseUser.email,
          name: firebaseUser.displayName?.trim() || firebaseUser.email,
        });
      } catch {
        // ignore non-critical online update errors
      }
    }

    notify();
  });
};

export const registerUser = async (email: string, password: string, name: string): Promise<AppUser> => {
  try {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('El nombre es obligatorio.');
    }

    const authClient = getAuthClient();
    const credentials = await createUserWithEmailAndPassword(authClient, email.trim(), password);

    await setDoc(doc(getFirestoreClient(), 'users', credentials.user.uid), {
      uid: credentials.user.uid,
      email: credentials.user.email,
      name: normalizedName,
      createdAt: serverTimestamp(),
      online: true,
    });

    console.log('[auth/registerUser] Usuario guardado en Firestore', {
      uid: credentials.user.uid,
      email: credentials.user.email,
      name: normalizedName,
    });

    const mappedUser = await mapFirebaseUser(credentials.user);
    if (!mappedUser) {
      throw new Error('No fue posible crear la sesión del usuario.');
    }

    currentUser = mappedUser;
    notify();
    return mappedUser;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const loginUser = async (email: string, password: string): Promise<AppUser> => {
  try {
    const authClient = getAuthClient();
    const credentials = await signInWithEmailAndPassword(authClient, email.trim(), password);
    if (credentials.user.email) {
      await ensureUserDocument(credentials.user.uid, {
        email: credentials.user.email,
        name: credentials.user.displayName?.trim() || credentials.user.email,
      });
    }

    const mappedUser = await mapFirebaseUser(credentials.user);

    if (!mappedUser) {
      throw new Error('No fue posible iniciar sesión con este usuario.');
    }

    currentUser = mappedUser;
    console.log('[auth/loginUser] Usuario autenticado', {
      uid: mappedUser.uid,
      email: mappedUser.email,
    });
    notify();
    return mappedUser;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const logoutUser = async (): Promise<void> => {
  const authClient = getAuthClient();
  const uid = currentUser?.uid ?? authClient.currentUser?.uid;

  if (uid) {
    await updateDoc(doc(getFirestoreClient(), 'users', uid), {
      online: false,
    }).catch(() => undefined);
  }

  await signOut(authClient);
  currentUser = null;
  notify();
};

export const getCurrentUser = (): AppUser | null => {
  if (!currentUser && auth?.currentUser?.email) {
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      idToken: '',
      displayName: auth.currentUser.displayName ?? undefined,
    };
  }

  return currentUser;
};

export const observeAuthState = (callback: (user: AppUser | null) => void) => {
  listeners.add(callback);

  if (!auth) {
    currentUser = null;
    callback(currentUser);

    return () => {
      listeners.delete(callback);
    };
  }

  ensureAuthSubscription();
  callback(currentUser);

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0 && unsubscribeAuthState) {
      unsubscribeAuthState();
      unsubscribeAuthState = null;
      authSubscriptionInitialized = false;
    }
  };
};
