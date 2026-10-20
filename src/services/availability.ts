import {
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  SERVICE_TYPES,
  type AvailabilitySettings,
  type BlockReason,
  type CalendarDay,
  type DayBlock,
  type DayMode,
  type ISODate,
  type Occupation,
  type BookingRules,
  type ServiceType,
  type TimeInterval,
} from '../types';
import { isHHMM, STUDIO_TIMEZONE } from '../utils/datetime';
import { emptyDay } from '../utils/slots';
import { col, COLLECTIONS, db, num, ref, SETTINGS_DOC, str } from './firebase/db';
import { withTimeout } from './firebase/errors';

// ── Leitura e saneamento ─────────────────────────────────────────────────────

const intervals = (value: unknown): TimeInterval[] =>
  Array.isArray(value)
    ? value
        .map((i) => ({ start: str(i?.start), end: str(i?.end) }))
        .filter((i) => isHHMM(i.start) && isHHMM(i.end))
    : [];

const BLOCK_REASONS: BlockReason[] = ['pessoal', 'manutencao', 'compromisso', 'outro'];

function bookingRules(value: unknown): BookingRules {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    minDurationMin: Math.max(15, num(v.minDurationMin, num(v.durationMin, 60))),
    maxDurationMin: Math.max(15, num(v.maxDurationMin, num(v.durationMin, 240))),
    stepMin: Math.max(15, num(v.stepMin, 60)),
    bufferMin: Math.max(0, num(v.bufferMin, 0)),
  };
}

export function parseSettings(data: Record<string, unknown>): AvailabilitySettings {
  const weeklyRaw = (data.weekly ?? {}) as Record<string, unknown>;
  const weekly: Record<string, TimeInterval[]> = {};
  for (let d = 0; d < 7; d++) weekly[String(d)] = intervals(weeklyRaw[String(d)]);
  // Versões anteriores guardavam regras por serviço; nesse caso aproveita as do ensaio.
  const legacy = ((data.services ?? {}) as Record<string, unknown>).ensaio;
  return {
    timezone: str(data.timezone, STUDIO_TIMEZONE) || STUDIO_TIMEZONE,
    weekly,
    booking: bookingRules(data.booking ?? legacy),
    minAdvanceHours: Math.max(0, num(data.minAdvanceHours, 0)),
    maxDaysAhead: Math.min(365, Math.max(1, num(data.maxDaysAhead, 60))),
  };
}

const occupations = (value: unknown): Occupation[] =>
  Array.isArray(value)
    ? value
        .map((o) => ({
          ref: str(o?.ref),
          start: str(o?.start),
          end: str(o?.end),
          service: (SERVICE_TYPES.includes(o?.service) ? o.service : 'ensaio') as ServiceType,
        }))
        .filter((o) => isHHMM(o.start) && isHHMM(o.end))
    : [];

export function parseDay(date: ISODate, data: Record<string, unknown> | undefined): CalendarDay {
  if (!data) return emptyDay(date);
  const mode = (['padrao', 'fechado', 'especial'].includes(data.mode as string) ? data.mode : 'padrao') as DayMode;
  const blocks: DayBlock[] = Array.isArray(data.blocks)
    ? data.blocks
        .map((b) => ({
          id: str(b?.id) || `${b?.start}-${b?.end}`,
          start: str(b?.start),
          end: str(b?.end),
          reason: (BLOCK_REASONS.includes(b?.reason) ? b.reason : 'outro') as BlockReason,
        }))
        .filter((b) => isHHMM(b.start) && isHHMM(b.end))
    : [];
  return {
    date,
    mode,
    intervals: intervals(data.intervals),
    extraIntervals: intervals(data.extraIntervals),
    blocks,
    booked: occupations(data.booked),
    holds: occupations(data.holds),
  };
}

// ── Assinaturas em tempo real (sempre devolvem a função de cancelamento) ──────

const settingsRef = () => ref(COLLECTIONS.settings, SETTINGS_DOC);
export const dayRef = (date: ISODate) => ref(COLLECTIONS.calendarDays, date);

/** null = a disponibilidade ainda não foi publicada pelo administrador. */
export function subscribeSettings(
  onData: (settings: AvailabilitySettings | null) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    settingsRef(),
    (snap) => onData(snap.exists() ? parseSettings(snap.data()) : null),
    onError,
  );
}

export function subscribeDays(
  first: ISODate,
  last: ISODate,
  onData: (days: Map<ISODate, CalendarDay>) => void,
  onError: (err: unknown) => void,
): () => void {
  const q = query(col(COLLECTIONS.calendarDays), where('date', '>=', first), where('date', '<=', last));
  return onSnapshot(
    q,
    (snap) => {
      const days = new Map<ISODate, CalendarDay>();
      snap.forEach((d) => days.set(d.id, parseDay(d.id, d.data())));
      onData(days);
    },
    onError,
  );
}

/** Leitura direto do servidor (ignora cache), usada na checagem final antes do envio. */
export async function fetchAvailabilityFresh(
  date: ISODate,
): Promise<{ settings: AvailabilitySettings | null; day: CalendarDay }> {
  const [s, d] = await withTimeout(Promise.all([getDocFromServer(settingsRef()), getDocFromServer(dayRef(date))]));
  return { settings: s.exists() ? parseSettings(s.data()) : null, day: parseDay(date, d.data()) };
}

// ── Escrita (somente administrador; garantido pelas regras) ───────────────────

export function saveSettings(settings: AvailabilitySettings): Promise<void> {
  return withTimeout(setDoc(settingsRef(), { ...settings, updatedAt: serverTimestamp() }));
}

export type DayOverrides = Pick<CalendarDay, 'mode' | 'intervals' | 'extraIntervals' | 'blocks'>;

/** Salva só as exceções da data, sem tocar na ocupação (booked/holds). */
export function saveDayOverrides(date: ISODate, overrides: DayOverrides): Promise<void> {
  return withTimeout(
    setDoc(dayRef(date), { date, ...overrides, updatedAt: serverTimestamp() }, { merge: true }),
  );
}

/** Fecha ou restaura vários dias de uma vez. */
export async function setDaysMode(dates: ISODate[], mode: 'fechado' | 'padrao'): Promise<void> {
  for (let i = 0; i < dates.length; i += 400) {
    const batch = writeBatch(db());
    for (const date of dates.slice(i, i + 400)) {
      const overrides =
        mode === 'fechado'
          ? { mode }
          : { mode, intervals: [], extraIntervals: [], blocks: [] };
      batch.set(dayRef(date), { date, ...overrides, updatedAt: serverTimestamp() }, { merge: true });
    }
    await withTimeout(batch.commit());
  }
}
