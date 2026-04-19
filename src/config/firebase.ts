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
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
];

const missingKeys = requiredEnvKeys.filter((key) => getEnv(key).length === 0);
const hasAuthDomain = getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN').length > 0;
const appId = getEnv('EXPO_PUBLIC_FIREBASE_APP_ID');
const isAndroidAppId = appId.includes(':android:');
const isWebAppId = appId.includes(':web:');

const firebaseConfigWarnings: string[] = [];

if (isAndroidAppId) {
  firebaseConfigWarnings.push(
    `EXPO_PUBLIC_FIREBASE_APP_ID parece de Android (${appId}). Debes copiar el appId de una Web App desde Firebase Console (termina en :web:...).`,
  );
}

if (!isWebAppId && appId) {
  firebaseConfigWarnings.push(
    `EXPO_PUBLIC_FIREBASE_APP_ID no tiene formato de Web App (:web:). Valor actual: ${appId}. Este proyecto Expo solo acepta appId web.`,
  );
}

if (!hasAuthDomain) {
  firebaseConfigWarnings.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN está vacío.');
}

export const isFirebaseConfigured = missingKeys.length === 0 && !isAndroidAppId && hasAuthDomain && isWebAppId;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : [
    missingKeys.length > 0 ? `Faltan variables: ${missingKeys.join(', ')}.` : null,
    ...firebaseConfigWarnings,
  ]
    .filter(Boolean)
    .join(' ');

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
  console.error(`[firebase] Firebase NO configurado correctamente. ${firebaseConfigError}`);
  console.warn(
    '[firebase] WARN: posible inconsistencia de backend Firebase entre dispositivos. Si un cliente usa appId Android y otro Web, no compartirán correctamente el mismo backend de Firestore/Auth para el SDK JS y verás docs_crudos=1 en ambos lados.',
  );
  console.log('[firebase] config:', {
    projectId: firebaseConfig.projectId || 'N/D',
    appId: firebaseConfig.appId || 'N/D',
    authDomain: firebaseConfig.authDomain || 'N/D',
  });
} else {
  console.log('[firebase] config:', {
    projectId: firebaseConfig.projectId || 'N/D',
    appId: firebaseConfig.appId || 'N/D',
    authDomain: firebaseConfig.authDomain || 'N/D',
  });
  console.log('[firebase] Firebase inicializado correctamente para SDK Web en Expo.');
}

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

export { app, auth, db, firebaseConfig };
