export function getPingTier(region: string): 'low' | 'mid' | 'high' {
  if (['NA', 'LAS'].includes(region.toUpperCase())) return 'low';
  if (['LATAM', 'EU'].includes(region.toUpperCase())) return 'mid';
  return 'high';
}
