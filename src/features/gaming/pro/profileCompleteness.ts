export function getProfileCompleteness(input: Record<string, string>): number {
  const keys = Object.keys(input);
  const complete = keys.filter((k) => input[k]?.trim().length > 1).length;
  return Math.round((complete / Math.max(1, keys.length)) * 100);
}
