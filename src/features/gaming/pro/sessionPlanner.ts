export function buildSessionPlan(rank: string): string[] {
  const high = ['diamond', 'ascendant', 'immortal', 'radiant'];
  return high.includes(rank.toLowerCase())
    ? ['20m warmup', '3 rankeds', '20m VOD review']
    : ['15m aim', '2 rankeds', '10m notes'];
}
