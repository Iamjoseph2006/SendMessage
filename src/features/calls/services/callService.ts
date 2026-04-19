import { FirestoreError, Timestamp, addDoc, collection, getDocs, onSnapshot, or, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';

export type CallType = 'voice' | 'video';
export type CallStatus = 'missed' | 'completed' | 'rejected';

export type CallLog = {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  createdAt?: Timestamp | null;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firestore no está configurado correctamente.');
  }

  return db;
};

const mapCallsError = (error: unknown): Error => {
  const firestoreError = error as Partial<FirestoreError>;
  if (firestoreError?.code === 'failed-precondition') {
    return new Error('Falta un índice de Firestore para consultas de llamadas/historial. Despliega firestore.indexes.json.');
  }

  return mapFirebaseErrorToSpanish(error, 'No se pudo consultar el historial de llamadas.');
};

const mapCallLog = (docSnapshot: { id: string; data: () => Record<string, unknown> }): CallLog => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    callerId: data.callerId as string,
    receiverId: data.receiverId as string,
    type: (data.type as CallType | undefined) ?? 'voice',
    status: (data.status as CallStatus | undefined) ?? 'completed',
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  };
};

const buildCallHistoryQuery = (userId: string) =>
  query(
    collection(requireDb(), 'calls'),
    or(where('callerId', '==', userId), where('receiverId', '==', userId)),
    orderBy('createdAt', 'desc'),
  );

export const createCall = async (
  callerId: string,
  receiverId: string,
  type: CallType,
  status: CallStatus = 'completed',
): Promise<string> => {
  const firestore = requireDb();

  const snapshot = await addDoc(collection(firestore, 'calls'), {
    callerId,
    receiverId,
    type,
    status,
    createdAt: serverTimestamp(),
  });

  return snapshot.id;
};

export const getCallHistory = async (userId: string): Promise<CallLog[]> => {
  try {
    const snapshot = await getDocs(buildCallHistoryQuery(userId));
    return snapshot.docs.map(mapCallLog);
  } catch (error) {
    throw mapCallsError(error);
  }
};

export const listenCallHistory = (
  userId: string,
  callback: (calls: CallLog[]) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    buildCallHistoryQuery(userId),
    (snapshot) => callback(snapshot.docs.map(mapCallLog)),
    (error) => onError?.(mapCallsError(error)),
  );
