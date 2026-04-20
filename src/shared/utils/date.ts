export type FirestoreTimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

export type DateInput = FirestoreTimestampLike | Date | number | string | null | undefined;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
};

export const toSafeMillis = (value: DateInput): number => {
  if (value == null) {
    return 0;
  }

  const directNumber = toFiniteNumber(value);
  if (directNumber !== null) {
    return directNumber;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }

  if (!isObject(value)) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    try {
      const millis = value.toMillis();
      return Number.isFinite(millis) ? millis : 0;
    } catch {
      return 0;
    }
  }

  const seconds = toFiniteNumber(value.seconds) ?? toFiniteNumber(value._seconds);
  if (seconds !== null) {
    const nanos = toFiniteNumber(value.nanoseconds) ?? toFiniteNumber(value._nanoseconds) ?? 0;
    return Math.floor(seconds * 1000 + nanos / 1_000_000);
  }

  if (typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      if (date instanceof Date) {
        const time = date.getTime();
        return Number.isFinite(time) ? time : 0;
      }
    } catch {
      return 0;
    }
  }

  return 0;
};

export const toSafeDate = (value: DateInput): Date | null => {
  const millis = toSafeMillis(value);
  return millis > 0 ? new Date(millis) : null;
};
