export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey.length > 0 && firebaseConfig.projectId.length > 0;

export const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
export const authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';
