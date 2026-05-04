import { GamerProfile } from '../types';

export type MatchResult = {
  profile: GamerProfile;
  score: number;
  reasons: string[];
};

export function scoreCompatibility(me: Pick<GamerProfile, 'favoriteGame' | 'rank' | 'role' | 'region'>, other: GamerProfile): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (me.favoriteGame.toLowerCase() === other.favoriteGame.toLowerCase()) {
    score += 40;
    reasons.push('Mismo juego');
  }

  if (me.region.toLowerCase() === other.region.toLowerCase()) {
    score += 25;
    reasons.push('Misma región');
  }

  if (me.role.toLowerCase() !== other.role.toLowerCase()) {
    score += 20;
    reasons.push('Roles complementarios');
  } else {
    score += 10;
    reasons.push('Mismo rol');
  }

  const rankDistance = Math.abs(rankToInt(me.rank) - rankToInt(other.rank));
  score += Math.max(0, 20 - rankDistance * 4);
  reasons.push(rankDistance <= 1 ? 'Rango similar' : 'Rango compatible');

  return { profile: other, score: Math.min(100, score), reasons };
}

export function topMatches(me: Pick<GamerProfile, 'favoriteGame' | 'rank' | 'role' | 'region'>, pool: GamerProfile[], limit = 3): MatchResult[] {
  return pool.map((p) => scoreCompatibility(me, p)).sort((a, b) => b.score - a.score).slice(0, limit);
}

function rankToInt(rank: string): number {
  const m: Record<string, number> = { iron: 1, bronze: 2, silver: 3, gold: 4, platinum: 5, diamond: 6, ascendant: 7, immortal: 8, radiant: 9, master: 7 };
  return m[rank.toLowerCase()] ?? 3;
}
