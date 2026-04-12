import { authBaseUrl, firebaseConfig } from '@/src/config/firebase';

export type AppUser = {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
};

let currentUser: AppUser | null = null;
const listeners = new Set<(user: AppUser | null) => void>();

const notify = () => {
  listeners.forEach((callback) => callback(currentUser));
};

const authRequest = async (endpoint: 'accounts:signUp' | 'accounts:signInWithPassword', email: string, password: string) => {
  const response = await fetch(`${authBaseUrl}/${endpoint}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Error de autenticación.');
  }

  const payload = await response.json();
  currentUser = {
    uid: payload.localId,
    email: payload.email,
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
  };
  notify();
  return currentUser;
};

export const registerUser = async (email: string, password: string): Promise<AppUser> =>
  authRequest('accounts:signUp', email, password);

export const loginUser = async (email: string, password: string): Promise<AppUser> =>
  authRequest('accounts:signInWithPassword', email, password);

export const logoutUser = async (): Promise<void> => {
  currentUser = null;
  notify();
};

export const getCurrentUser = (): AppUser | null => currentUser;

export const observeAuthState = (callback: (user: AppUser | null) => void) => {
  listeners.add(callback);
  callback(currentUser);

  return () => {
    listeners.delete(callback);
  };
};
