import { FirestoreValue } from '@/src/config/firestoreClient';

export const getString = (field?: FirestoreValue): string => {
  if (!field || !('stringValue' in field)) return '';
  return field.stringValue;
};

export const getNumber = (field?: FirestoreValue): number => {
  const value = getString(field);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const stringField = (value: string): FirestoreValue => ({ stringValue: value });
