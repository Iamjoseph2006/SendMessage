import { authBaseUrl, firebaseConfig, firestoreBaseUrl } from './firebaseConfig';

type FirestoreValue =
  | { stringValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { timestampValue: string }
  | { nullValue: null };

const jsonHeaders = { 'Content-Type': 'application/json' };

export class FirebaseDataSource {
  async signUp(email: string, password: string) {
    const response = await fetch(`${authBaseUrl}/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!response.ok) throw new Error('No fue posible registrar la cuenta.');
    return response.json();
  }

  async signIn(email: string, password: string) {
    const response = await fetch(`${authBaseUrl}/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!response.ok) throw new Error('No fue posible iniciar sesión.');
    return response.json();
  }

  async getDocuments(collection: string, idToken: string) {
    const response = await fetch(`${firestoreBaseUrl}/${collection}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) throw new Error('No se pudo obtener información del chat.');
    const data = await response.json();
    return data.documents ?? [];
  }

  async createDocument(collection: string, body: Record<string, FirestoreValue>, idToken: string) {
    const response = await fetch(`${firestoreBaseUrl}/${collection}`, {
      method: 'POST',
      headers: { ...jsonHeaders, Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: body }),
    });

    if (!response.ok) throw new Error('No se pudo guardar la información.');
    return response.json();
  }
}

export const firebaseDataSource = new FirebaseDataSource();
