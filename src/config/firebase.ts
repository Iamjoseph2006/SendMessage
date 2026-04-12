/* eslint-disable import/no-unresolved */
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const requiredKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

export const isFirebaseConfigured = missingKeys.length === 0;

if (!isFirebaseConfigured) {
  console.warn(`Firebase incompleto: faltan ${missingKeys.join(', ')}`);
}

const app: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const auth: Auth | null = app ? getAuth(app) : null;
const db: Firestore | null = app ? getFirestore(app) : null;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Configura las variables EXPO_PUBLIC_FIREBASE_* (faltan: ${missingKeys.join(', ')}).`;

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

export { app, auth, db, firebaseConfig };
