import {
  AuthError,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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

const ensureAuthSubscription = () => {
  if (!auth || authSubscriptionInitialized) {
    return;
  }

  authSubscriptionInitialized = true;
  unsubscribeAuthState = onAuthStateChanged(auth, async (firebaseUser) => {
    currentUser = await mapFirebaseUser(firebaseUser);

    if (firebaseUser?.uid) {
      try {
        await updateDoc(doc(getFirestoreClient(), 'users', firebaseUser.uid), {
          online: true,
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
    const authClient = getAuthClient();
    const firestoreClient = getFirestoreClient();
    const credentials = await createUserWithEmailAndPassword(authClient, email.trim(), password);

    await setDoc(doc(firestoreClient, 'users', credentials.user.uid), {
      uid: credentials.user.uid,
      email: credentials.user.email,
      name: name.trim(),
      photoURL: credentials.user.photoURL ?? null,
      createdAt: serverTimestamp(),
      online: true,
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

    await updateDoc(doc(getFirestoreClient(), 'users', credentials.user.uid), {
      online: true,
    }).catch(() => undefined);

    const mappedUser = await mapFirebaseUser(credentials.user);

    if (!mappedUser) {
      throw new Error('No fue posible iniciar sesión con este usuario.');
    }

    currentUser = mappedUser;
    notify();
    return mappedUser;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const logoutUser = async (): Promise<void> => {
  const authClient = getAuthClient();

  if (currentUser?.uid) {
    await updateDoc(doc(getFirestoreClient(), 'users', currentUser.uid), {
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
