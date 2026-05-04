import { createDoc, getCollectionDocs } from '@/src/config/firestoreClient';
import { Squad } from '../types';
import { getNumber, getString, stringField } from './firestoreMappers';

const COLLECTION = 'squads';
const MOCK_SQUADS: Squad[] = [
  { id: 's1', name: 'Night Raiders', game: 'Valorant', neededRole: 'Controller', currentMembers: 4, maxMembers: 5 },
];

export async function listSquads(idToken?: string): Promise<Squad[]> {
  if (!idToken) return MOCK_SQUADS;
  const docs = await getCollectionDocs(COLLECTION, idToken);

  return docs.map((doc: any) => {
    const fields = doc.fields ?? {};
    return {
      id: doc.name?.split('/').pop() ?? Math.random().toString(),
      name: getString(fields.name),
      game: getString(fields.game),
      neededRole: getString(fields.neededRole),
      currentMembers: getNumber(fields.currentMembers),
      maxMembers: getNumber(fields.maxMembers),
    };
  });
}

export async function createSquad(payload: Omit<Squad, 'id'>, idToken: string) {
  return createDoc(
    COLLECTION,
    {
      name: stringField(payload.name),
      game: stringField(payload.game),
      neededRole: stringField(payload.neededRole),
      currentMembers: stringField(String(payload.currentMembers)),
      maxMembers: stringField(String(payload.maxMembers)),
    },
    idToken,
  );
}
