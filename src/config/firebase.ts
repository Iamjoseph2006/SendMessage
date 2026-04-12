/* eslint-disable import/no-unresolved */
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

type FirebaseEnvKey =
  | 'EXPO_PUBLIC_FIREBASE_API_KEY'
  | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
  | 'EXPO_PUBLIC_FIREBASE_APP_ID'
  | 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID';

const getRequiredEnv = (key: FirebaseEnvKey): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${key}.`);
  }

  return value;
};

const getOptionalEnv = (key: FirebaseEnvKey): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const firebaseConfig = {
  apiKey: getRequiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  projectId: getRequiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: getRequiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  authDomain: getOptionalEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  storageBucket: getOptionalEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getOptionalEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export const isFirebaseConfigured = true;
export const firebaseConfigError = null;

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

export { app, auth, db, firebaseConfig };
