import { useEffect, useState } from 'react';
import { subscribeDays, subscribeSettings } from '../services/availability';
import type { AvailabilitySettings, CalendarDay, ISODate } from '../types';

export type AvailabilityStatus = 'loading' | 'ready' | 'unpublished' | 'error';

/**
 * Disponibilidade em tempo real do intervalo pedido (normalmente um mês).
 * Os listeners do Firestore só existem enquanto `enabled` for true e são cancelados ao desmontar.
 */
export function useAvailability(first: ISODate, last: ISODate, enabled = true) {
  const [settings, setSettings] = useState<AvailabilitySettings | null | undefined>(undefined);
  const [days, setDays] = useState<{ key: string; map: Map<ISODate, CalendarDay> } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${first}|${last}`;

  useEffect(() => {
    if (!enabled) return;
    setError(null);
    return subscribeSettings(setSettings, setError);
  }, [enabled, attempt]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeDays(first, last, (map) => setDays({ key, map }), setError);
  }, [enabled, first, last, key, attempt]);

  const daysReady = days?.key === key;
  let status: AvailabilityStatus = 'loading';
  if (error) status = 'error';
  else if (settings === null) status = 'unpublished';
  else if (settings && daysReady) status = 'ready';

  return {
    status,
    error,
    settings: settings ?? null,
    days: daysReady ? days.map : new Map<ISODate, CalendarDay>(),
    retry: () => setAttempt((n) => n + 1),
  };
}
