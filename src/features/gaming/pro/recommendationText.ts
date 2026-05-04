export function explainPercent(score: number): string {
  if (score >= 85) return 'compatibilidad excelente';
  if (score >= 70) return 'compatibilidad alta';
  if (score >= 50) return 'compatibilidad media';
  return 'compatibilidad baja';
}
