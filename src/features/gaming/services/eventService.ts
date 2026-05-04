import { createDoc, getCollectionDocs } from '@/src/config/firestoreClient';
import { GameEvent } from '../types';
import { getNumber, getString, stringField } from './firestoreMappers';

const COLLECTION = 'events';
const MOCK_EVENTS: GameEvent[] = [
  { id: 'e1', title: 'Scrim nocturna', game: 'Valorant', startsAt: '2026-05-08T01:00:00Z', mode: '5v5', slots: 10 },
];

export async function listEvents(idToken?: string): Promise<GameEvent[]> {
  if (!idToken) return MOCK_EVENTS;
  const docs = await getCollectionDocs(COLLECTION, idToken);

  return docs.map((doc: any) => {
    const fields = doc.fields ?? {};
    return {
      id: doc.name?.split('/').pop() ?? Math.random().toString(),
      title: getString(fields.title),
      game: getString(fields.game),
      startsAt: getString(fields.startsAt),
      mode: getString(fields.mode),
      slots: getNumber(fields.slots),
    };
  });
}

export async function createEvent(payload: Omit<GameEvent, 'id'>, idToken: string) {
  return createDoc(
    COLLECTION,
    {
      title: stringField(payload.title),
      game: stringField(payload.game),
      startsAt: stringField(payload.startsAt),
      mode: stringField(payload.mode),
      slots: stringField(String(payload.slots)),
    },
    idToken,
  );
}
