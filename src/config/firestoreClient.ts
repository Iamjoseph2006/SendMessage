import { firestoreBaseUrl } from '@/src/config/firebase';

export type FirestoreValue =
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { nullValue: null };

const jsonHeaders = { 'Content-Type': 'application/json' };

export const getCollectionDocs = async (collectionPath: string, idToken: string) => {
  const response = await fetch(`${firestoreBaseUrl}/${collectionPath}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener ${collectionPath}.`);
  }

  const data = await response.json();
  return data.documents ?? [];
};

export const createDoc = async (
  collectionPath: string,
  fields: Record<string, FirestoreValue>,
  idToken: string,
  docId?: string,
) => {
  const url = docId ? `${firestoreBaseUrl}/${collectionPath}?documentId=${docId}` : `${firestoreBaseUrl}/${collectionPath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...jsonHeaders, Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo crear documento en ${collectionPath}.`);
  }

  return response.json();
};

export const patchDoc = async (documentPath: string, fields: Record<string, FirestoreValue>, idToken: string) => {
  const response = await fetch(`${firestoreBaseUrl}/${documentPath}`, {
    method: 'PATCH',
    headers: { ...jsonHeaders, Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo actualizar ${documentPath}.`);
  }

  return response.json();
};

export const onSnapshot = <T>(
  fetcher: () => Promise<T>,
  callback: (payload: T) => void,
  options?: { intervalMs?: number },
) => {
  let mounted = true;

  const run = async () => {
    if (!mounted) return;

    try {
      const payload = await fetcher();
      if (mounted) callback(payload);
    } catch (error) {
      console.error('onSnapshot fallback error', error);
    }
  };

  run();
  const interval = setInterval(run, options?.intervalMs ?? 1600);

  return () => {
    mounted = false;
    clearInterval(interval);
  };
};
