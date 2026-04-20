import { StatusItem } from '@/src/features/status/services/statusService';
import { toSafeMillis } from '@/src/shared/utils/date';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const getRelativeStatusTime = (status: StatusItem): string => {
  const createdAtMillis = toSafeMillis(status.createdAt);

  if (!createdAtMillis) {
    return 'Hace un momento';
  }

  const elapsed = Date.now() - createdAtMillis;

  if (elapsed < MINUTE) {
    return 'Ahora mismo';
  }

  if (elapsed < HOUR) {
    const minutes = Math.max(1, Math.floor(elapsed / MINUTE));
    return `Hace ${minutes} min`;
  }

  if (elapsed < DAY) {
    const hours = Math.max(1, Math.floor(elapsed / HOUR));
    return `Hace ${hours} h`;
  }

  const days = Math.max(1, Math.floor(elapsed / DAY));
  return `Hace ${days} d`;
};

export const buildMyStatusSubtitle = (myStatuses: StatusItem[]): string => {
  if (!myStatuses.length) {
    return 'Toca para añadir una actualización';
  }

  if (myStatuses.length === 1) {
    return `1 actualización · ${getRelativeStatusTime(myStatuses[0])}`;
  }

  return `${myStatuses.length} actualizaciones · ${getRelativeStatusTime(myStatuses[0])}`;
};

export const getStatusPreview = (status: StatusItem): string => {
  const parts: string[] = [];

  if (status.content?.trim()) {
    parts.push(status.content.trim());
  }

  if (status.imageUri) {
    parts.push('📷 Foto');
  }

  if (status.audioUri) {
    parts.push('🎤 Audio');
  }

  if (status.location) {
    parts.push('📍 Ubicación');
  }

  if (status.emojis?.length) {
    parts.push(status.emojis.join(' '));
  }

  return parts.join(' · ') || 'Actualización';
};
