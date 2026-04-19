import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';

type FirebaseEnvKey =
  | 'EXPO_PUBLIC_FIREBASE_API_KEY'
  | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
  | 'EXPO_PUBLIC_FIREBASE_APP_ID'
  | 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID';

const getEnv = (key: FirebaseEnvKey): string => process.env[key]?.trim() ?? '';

const requiredEnvKeys: FirebaseEnvKey[] = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missingKeys = requiredEnvKeys.filter((key) => getEnv(key).length === 0);

export const isFirebaseConfigured = missingKeys.length === 0;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Configura las variables EXPO_PUBLIC_FIREBASE_* (faltan: ${missingKeys.join(', ')}).`;

const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || undefined,
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || undefined,
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || undefined,
};

const app: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const createAuth = (firebaseApp: FirebaseApp): Auth => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
};

const FIRESTORE_INSTANCE_KEY = '__SENDMESSAGE_FIRESTORE_INSTANCE__';

const createFirestore = (firebaseApp: FirebaseApp): Firestore => {
  const globalScope = globalThis as typeof globalThis & {
    [FIRESTORE_INSTANCE_KEY]?: Firestore;
  };

  if (globalScope[FIRESTORE_INSTANCE_KEY]) {
    return globalScope[FIRESTORE_INSTANCE_KEY];
  }

  const firestore = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
    // @ts-expect-error useFetchStreams is supported by Firestore Web SDK at runtime and prevents stream abort loops in Expo/WebView.
    useFetchStreams: false,
  });

  globalScope[FIRESTORE_INSTANCE_KEY] = firestore;
  return firestore;
};

const auth: Auth | null = app ? createAuth(app) : null;
const db: Firestore | null = app ? createFirestore(app) : null;

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

export { app, auth, db, firebaseConfig };
