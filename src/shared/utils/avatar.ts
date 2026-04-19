export const getAvatarInitials = (value?: string | null): string => {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return '?';
  }

  const words = normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (!words.length) {
    return '?';
  }

  if (words.length === 1) {
    return words[0][0]?.toUpperCase() ?? '?';
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase() || '?';
};
