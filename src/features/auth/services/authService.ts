/* eslint-disable import/no-unresolved */
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigError } from '@/src/config/firebase';

export type AppUser = {
  uid: string;
  email: string;
  idToken: string;
  displayName?: string;
};

let currentUser: AppUser | null = null;
const listeners = new Set<(user: AppUser | null) => void>();

const getFirebaseClients = () => {
  if (!auth || !db) {
    throw new Error(firebaseConfigError ?? 'Firebase no está configurado.');
  }

  return { auth, db };
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

const normalizeAuthError = (error: unknown): Error => {
  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error('No fue posible completar la autenticación.');
};

export const registerUser = async (name: string, email: string, password: string): Promise<AppUser> => {
  try {
    const { auth, db } = getFirebaseClients();
    const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);

    await setDoc(doc(db, 'users', credentials.user.uid), {
      uid: credentials.user.uid,
      name: name.trim(),
      email: credentials.user.email,
      createdAt: serverTimestamp(),
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
    const { auth } = getFirebaseClients();
    const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
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
  const { auth } = getFirebaseClients();
  await signOut(auth);
  currentUser = null;
  notify();
};

export const getCurrentUser = (): AppUser | null => currentUser;

export const observeAuthState = (callback: (user: AppUser | null) => void) => {
  listeners.add(callback);

  const { auth } = getFirebaseClients();

  const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
    currentUser = await mapFirebaseUser(firebaseUser);
    notify();
  });

  callback(currentUser);

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      unsubscribeFirebase();
    }
  };
};
