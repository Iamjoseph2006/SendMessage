import { FirestoreError } from 'firebase/firestore';

const firestoreErrorMessages: Record<string, string> = {
  'permission-denied': 'No tienes permisos para realizar esta acción. Verifica tus reglas de Firestore e inicia sesión de nuevo.',
  unavailable: 'Sin conexión con Firestore. Revisa internet e inténtalo nuevamente.',
  'network-request-failed': 'Falló la conexión de red. Revisa internet e inténtalo nuevamente.',
};

export const mapFirebaseErrorToSpanish = (
  error: unknown,
  fallback = 'Ocurrió un error inesperado al comunicarse con Firebase.',
): Error => {
  const firebaseError = error as Partial<FirestoreError> & { message?: string; code?: string };
  const normalizedCode = firebaseError?.code?.replace(/^auth\//, '') ?? firebaseError?.code;

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

  if (normalizedMessage.includes('permission-denied')) {
    return new Error(firestoreErrorMessages['permission-denied']);
  }

  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error(fallback);
};
