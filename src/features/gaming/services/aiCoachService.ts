import { GamerProfile } from '../types';

export type SquadTip = {
  summary: string;
  recommendations: string[];
};

const rankBuckets: Record<string, number> = {
  iron: 1, bronze: 2, silver: 3, gold: 4, platinum: 5, diamond: 6, ascendant: 7, immortal: 8, radiant: 9,
};

export function buildFreeSquadTip(profile: Pick<GamerProfile, 'favoriteGame' | 'rank' | 'role' | 'region'>): SquadTip {
  const rankScore = rankBuckets[profile.rank.toLowerCase()] ?? 3;
  const pace = rankScore >= 6 ? 'alto rendimiento' : 'aprendizaje y constancia';

  return {
    summary: `Para ${profile.favoriteGame}, tu enfoque recomendado es ${pace}.`,
    recommendations: [
      `Busca squads de tu región (${profile.region}) para reducir lag y mejorar coordinación.`,
      `Prioriza equipos que necesiten ${profile.role} para entrar más rápido a partidas.`,
      rankScore >= 6
        ? 'Haz VOD review 20 min después de cada sesión y define 1 ajuste por mapa.'
        : 'Enfócate en mecánicas base (aim/posicionamiento) con bloques de 30 min diarios.',
    ],
  };
}
