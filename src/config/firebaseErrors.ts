import { FirestoreError } from 'firebase/firestore';

const firestoreErrorMessages: Record<string, string> = {
  'permission-denied': 'Firestore bloqueó la operación por reglas de seguridad (permission-denied). Revisa Firestore Rules en Firebase Console.',
  unavailable: 'Sin conexión con Firestore. Revisa internet e inténtalo nuevamente.',
  'network-request-failed': 'Falló la conexión de red. Revisa internet e inténtalo nuevamente.',
};

const normalizeFirebaseLikeCode = (code?: string): string => code?.replace(/^auth\//, '') ?? code ?? '';

export const isPermissionDeniedFirestoreError = (error: unknown): boolean => {
  const firebaseError = error as Partial<FirestoreError> & { message?: string; code?: string };
  const normalizedCode = normalizeFirebaseLikeCode(firebaseError?.code);
  const normalizedMessage = firebaseError?.message?.toLowerCase() ?? '';

  return normalizedCode === 'permission-denied' || normalizedMessage.includes('permission-denied');
};

export const mapFirebaseErrorToSpanish = (
  error: unknown,
  fallback = 'Ocurrió un error inesperado al comunicarse con Firebase.',
): Error => {
  const firebaseError = error as Partial<FirestoreError> & { message?: string; code?: string };
  const normalizedCode = normalizeFirebaseLikeCode(firebaseError?.code);

  if (normalizedCode && firestoreErrorMessages[normalizedCode]) {
    return new Error(firestoreErrorMessages[normalizedCode]);
  }

  const normalizedMessage = firebaseError?.message?.toLowerCase() ?? '';

  if (normalizedMessage.includes('client is offline')) {
    return new Error('No se pudo completar la operación porque el cliente está sin conexión. Verifica internet y vuelve a intentar.');
  }

  if (normalizedMessage.includes('network-request-failed')) {
    return new Error(firestoreErrorMessages['network-request-failed']);
  }

  if (isPermissionDeniedFirestoreError(error)) {
    return new Error(firestoreErrorMessages['permission-denied']);
  }

  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error(fallback);
};
