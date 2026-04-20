import { FirestoreError, QuerySnapshot, addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { mapFirebaseErrorToSpanish } from '@/src/config/firebaseErrors';
import { DateInput, toSafeMillis } from '@/src/shared/utils/date';

export type CallType = 'voice' | 'video';
export type CallStatus = 'missed' | 'completed' | 'rejected';

export type CallLog = {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  createdAt?: DateInput;
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
    createdAt: (data.createdAt as DateInput | undefined) ?? null,
  };
};

const sortCallsByDateDesc = (calls: CallLog[]) => [...calls].sort((a, b) => toSafeMillis(b.createdAt) - toSafeMillis(a.createdAt));

const dedupeCallLogs = (calls: CallLog[]) => {
  const seen = new Set<string>();
  return calls.filter((call) => {
    if (seen.has(call.id)) {
      return false;
    }
    seen.add(call.id);
    return true;
  });
};

const buildCallerHistoryQuery = (userId: string) =>
  query(collection(requireDb(), 'calls'), where('callerId', '==', userId), orderBy('createdAt', 'desc'));
const buildReceiverHistoryQuery = (userId: string) =>
  query(collection(requireDb(), 'calls'), where('receiverId', '==', userId), orderBy('createdAt', 'desc'));

const mapCallSnapshots = (snapshots: QuerySnapshot[]) =>
  sortCallsByDateDesc(
    dedupeCallLogs(
      snapshots.flatMap((snapshot) => snapshot.docs.map(mapCallLog)),
    ),
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
    const [asCaller, asReceiver] = await Promise.all([getDocs(buildCallerHistoryQuery(userId)), getDocs(buildReceiverHistoryQuery(userId))]);
    return mapCallSnapshots([asCaller, asReceiver]);
  } catch (error) {
    throw mapCallsError(error);
  }
};

export const listenCallHistory = (
  userId: string,
  callback: (calls: CallLog[]) => void,
  onError?: (error: Error) => void,
) => {
  let callerSnapshot: QuerySnapshot | null = null;
  let receiverSnapshot: QuerySnapshot | null = null;

  const pushMergedCalls = () => {
    if (!callerSnapshot || !receiverSnapshot) {
      return;
    }

    callback(mapCallSnapshots([callerSnapshot, receiverSnapshot]));
  };

  const unsubscribeCaller = onSnapshot(
    buildCallerHistoryQuery(userId),
    (snapshot) => {
      callerSnapshot = snapshot;
      pushMergedCalls();
    },
    (error) => onError?.(mapCallsError(error)),
  );
  const unsubscribeReceiver = onSnapshot(
    buildReceiverHistoryQuery(userId),
    (snapshot) => {
      receiverSnapshot = snapshot;
      pushMergedCalls();
    },
    (error) => onError?.(mapCallsError(error)),
  );

  return () => {
    unsubscribeCaller();
    unsubscribeReceiver();
  };
};
