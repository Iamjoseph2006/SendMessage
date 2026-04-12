import { Timestamp, addDoc, collection, getDocs, or, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

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
  const firestore = requireDb();
  const callsQuery = query(
    collection(firestore, 'calls'),
    or(where('callerId', '==', userId), where('receiverId', '==', userId)),
    orderBy('createdAt', 'desc'),
  );

  const snapshot = await getDocs(callsQuery);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();

    return {
      id: docSnapshot.id,
      callerId: data.callerId as string,
      receiverId: data.receiverId as string,
      type: (data.type as CallType | undefined) ?? 'voice',
      status: (data.status as CallStatus | undefined) ?? 'completed',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
    } as CallLog;
  });
};
