import { collection, doc, Timestamp } from 'firebase/firestore';
import { firebase } from './app';

/** Nomes das coleções num só lugar (os mesmos usados em firestore.rules). */
export const COLLECTIONS = {
  leads: 'leads',
  bookingRequests: 'bookingRequests',
  calendarDays: 'calendarDays',
  settings: 'settings',
  visitorThrottle: 'visitorThrottle',
} as const;

export const SETTINGS_DOC = 'availability';

export const db = () => firebase().db;
export const col = (name: string) => collection(db(), name);
export const ref = (name: string, id: string) => doc(db(), name, id);

export function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

export const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
export const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
