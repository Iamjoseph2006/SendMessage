import { createDoc, getCollectionDocs } from '@/src/config/firestoreClient';
import { GamerProfile } from '../types';
import { getString, stringField } from './firestoreMappers';

const COLLECTION = 'profiles';

const MOCK_PROFILES: GamerProfile[] = [
  { id: 'p1', gamerTag: 'NeoAim', favoriteGame: 'Valorant', rank: 'Diamond', role: 'Duelist', region: 'LATAM', platform: 'PC' },
];

export async function listDiscoverProfiles(idToken?: string): Promise<GamerProfile[]> {
  if (!idToken) return MOCK_PROFILES;
  const docs = await getCollectionDocs(COLLECTION, idToken);

  return docs.map((doc: any) => {
    const fields = doc.fields ?? {};
    return {
      id: doc.name?.split('/').pop() ?? Math.random().toString(),
      gamerTag: getString(fields.gamerTag),
      favoriteGame: getString(fields.favoriteGame),
      rank: getString(fields.rank),
      role: getString(fields.role),
      region: getString(fields.region),
      platform: (getString(fields.platform) || 'PC') as GamerProfile['platform'],
    };
  });
}

export async function createDiscoverProfile(profile: Omit<GamerProfile, 'id'>, idToken: string) {
  return createDoc(
    COLLECTION,
    {
      gamerTag: stringField(profile.gamerTag),
      favoriteGame: stringField(profile.favoriteGame),
      rank: stringField(profile.rank),
      role: stringField(profile.role),
      region: stringField(profile.region),
      platform: stringField(profile.platform),
    },
    idToken,
  );
}
