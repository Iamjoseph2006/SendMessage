import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

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
const hasAuthDomain = getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN').length > 0;
const appId = getEnv('EXPO_PUBLIC_FIREBASE_APP_ID');
const isAndroidAppId = appId.includes(':android:');

export const isFirebaseConfigured = missingKeys.length === 0;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Configura las variables EXPO_PUBLIC_FIREBASE_* (faltan: ${missingKeys.join(', ')}).`;

const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId,
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

const createFirestore = (firebaseApp: FirebaseApp): Firestore => {
  console.log(
    `[firebase] Inicializando Firestore con configuración estable (getFirestore). projectId=${firebaseConfig.projectId || 'N/D'}`,
  );
  return getFirestore(firebaseApp);
};

const auth: Auth | null = app ? createAuth(app) : null;
const db: Firestore | null = app ? createFirestore(app) : null;

if (!isFirebaseConfigured) {
  console.error(`[firebase] Firebase NO configurado. Faltan variables: ${missingKeys.join(', ')}.`);
} else {
  console.log(
    `[firebase] Firebase inicializado. projectId=${firebaseConfig.projectId}, appId=${firebaseConfig.appId}, authDomain=${firebaseConfig.authDomain || 'N/D'}`,
  );

  if (isAndroidAppId) {
    console.warn(
      `[firebase] EXPO_PUBLIC_FIREBASE_APP_ID parece de Android (${firebaseConfig.appId}). Para Expo/React Native con SDK Web de Firebase usa el appId de una Web App del mismo proyecto. Si dos dispositivos usan appId/proyecto distintos, users/{uid} se guardará en backends diferentes y el directorio no llegará a docs_crudos=2.`,
    );
  }

  if (!hasAuthDomain) {
    console.warn(
      '[firebase] EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN está vacío. Aunque no siempre bloquea en React Native, se recomienda incluirlo desde la Web App de Firebase para evitar inconsistencias de autenticación entre dispositivos.',
    );
  }
}

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

export { app, auth, db, firebaseConfig };
