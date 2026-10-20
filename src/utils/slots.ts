// Motor de disponibilidade: única fonte das regras usadas pelo site e pelo painel.
//
// A sala é única e a agenda é a mesma para qualquer modalidade: reservas confirmadas, pedidos em
// análise e bloqueios ocupam o espaço para todos. O visitante escolhe início e duração nos períodos livres.
import type {
  AvailabilitySettings,
  CalendarDay,
  DayAvailability,
  HHMM,
  ISODate,
  BookingRules,
  Occupation,
  TimeInterval,
  TimelineSegment,
} from '../types';
import { diffDays, isHHMM, minutesToTime, timeToMinutes, weekdayOf, zonedNow } from './datetime';

type Range = [number, number];

const toRange = (i: TimeInterval): Range => [timeToMinutes(i.start), timeToMinutes(i.end)];
const toInterval = ([s, e]: Range): TimeInterval => ({ start: minutesToTime(s), end: minutesToTime(e) });
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1];

export function emptyDay(date: ISODate): CalendarDay {
  return { date, mode: 'padrao', intervals: [], extraIntervals: [], blocks: [], booked: [], holds: [] };
}

/** Une intervalos sobrepostos ou encostados e ordena. */
export function mergeIntervals(list: TimeInterval[]): TimeInterval[] {
  return mergeRanges(list.filter((i) => isHHMM(i.start) && isHHMM(i.end)).map(toRange)).map(toInterval);
}

function mergeRanges(list: Range[]): Range[] {
  const ranges = list.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of ranges) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([...r] as Range);
  }
  return out;
}

/** Remove de `base` todos os trechos de `cuts`. */
function subtract(base: Range, cuts: Range[]): Range[] {
  let pieces: Range[] = [base];
  for (const [cs, ce] of mergeRanges(cuts)) {
    pieces = pieces.flatMap(([s, e]): Range[] => {
      if (ce <= s || cs >= e) return [[s, e]];
      const out: Range[] = [];
      if (cs > s) out.push([s, cs]);
      if (ce < e) out.push([ce, e]);
      return out;
    });
  }
  return pieces;
}

/** Expediente do dia, considerando a semana e as exceções da data (as exceções prevalecem). */
export function openWindows(date: ISODate, settings: AvailabilitySettings, day?: CalendarDay | null): TimeInterval[] {
  if (day?.mode === 'fechado') return [];
  const base = day?.mode === 'especial' ? day.intervals : settings.weekly[String(weekdayOf(date))] ?? [];
  return mergeIntervals([...base, ...(day?.extraIntervals ?? [])]);
}

/** Primeiro e último dia que o público pode reservar. */
export function bookableRange(settings: AvailabilitySettings, now = new Date()): { first: ISODate; last: ISODate } {
  const today = zonedNow(settings.timezone, now).date;
  const last = new Date(now);
  last.setUTCDate(last.getUTCDate() + Math.max(0, settings.maxDaysAhead));
  return { first: today, last: zonedNow(settings.timezone, last).date };
}

/** Normaliza as regras de reserva (evita valores incoerentes vindos do banco). */
export function normalizeRules(cfg: BookingRules): BookingRules {
  const stepMin = Math.max(15, cfg.stepMin);
  const minDurationMin = Math.max(15, cfg.minDurationMin);
  return { ...cfg, stepMin, minDurationMin, maxDurationMin: Math.max(minDurationMin, cfg.maxDurationMin) };
}

interface DayPlan {
  cfg: BookingRules;
  windows: Range[];
  /** Trechos que já passaram ou ferem a antecedência mínima. */
  cutoff: number;
  booked: Range[];
  holds: Range[];
  /** Períodos em que dá para começar uma reserva (início alinhado à granularidade). */
  free: Range[];
}

function planDay(date: ISODate, settings: AvailabilitySettings, day: CalendarDay | null | undefined, now: Date): DayPlan {
  const cfg = normalizeRules(settings.booking);
  const { date: today, minutes: nowMin } = zonedNow(settings.timezone, now);
  const cutoff = nowMin + Math.max(0, settings.minAdvanceHours) * 60 - diffDays(date, today) * 1440;

  const pad = (list: Occupation[]): Range[] =>
    list.map((o) => {
      const [s, e] = toRange(o);
      return [s - cfg.bufferMin, e + cfg.bufferMin];
    });
  const blocks = (day?.blocks ?? []).map(toRange);
  const booked = (day?.booked ?? []).map(toRange);
  const holds = (day?.holds ?? []).map(toRange);
  const cuts: Range[] = [...blocks, ...pad(day?.booked ?? []), ...pad(day?.holds ?? []), [-Infinity, cutoff]];

  const windows = openWindows(date, settings, day).map(toRange);
  const free: Range[] = [];
  for (const w of windows) {
    for (const [s, e] of subtract(w, cuts)) {
      // Inícios seguem a grade do expediente (ex.: expediente às 18h30 com passo de 1h → 18h30, 19h30…).
      const aligned = w[0] + Math.ceil((s - w[0]) / cfg.stepMin) * cfg.stepMin;
      if (e - aligned >= cfg.minDurationMin) free.push([aligned, e]);
    }
  }
  return { cfg, windows, cutoff, booked: [...booked, ...blocks], holds, free };
}

/** Períodos livres do dia (onde cabe pelo menos a duração mínima). */
export function freePeriods(
  date: ISODate,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): TimeInterval[] {
  return planDay(date, settings, day, now).free.map(toInterval);
}

/** Horários em que uma reserva pode começar. */
export function startTimes(
  date: ISODate,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): HHMM[] {
  const plan = planDay(date, settings, day, now);
  const out: HHMM[] = [];
  for (const [s, e] of plan.free) {
    for (let t = s; t + plan.cfg.minDurationMin <= e; t += plan.cfg.stepMin) out.push(minutesToTime(t));
  }
  return out;
}

/** Durações possíveis (em minutos) para uma reserva que começa em `start`. */
export function durationOptions(
  date: ISODate,
  start: HHMM,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): number[] {
  const plan = planDay(date, settings, day, now);
  const t = timeToMinutes(start);
  const period = plan.free.find(([s, e]) => t >= s && t < e && (t - s) % plan.cfg.stepMin === 0);
  if (!period) return [];
  const longest = Math.min(plan.cfg.maxDurationMin, period[1] - t);
  const out: number[] = [];
  for (let d = plan.cfg.minDurationMin; d <= longest; d += plan.cfg.stepMin) out.push(d);
  return out;
}

/** O período escolhido continua reservável? (usado ao mudar a agenda e na checagem final do envio) */
export function isBookable(
  date: ISODate,
  interval: TimeInterval,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): boolean {
  const duration = timeToMinutes(interval.end) - timeToMinutes(interval.start);
  return durationOptions(date, interval.start, settings, day, now).includes(duration);
}

/** Linha do tempo do expediente: livre, ocupado, em análise ou indisponível (passado, preparação, sobras). */
export function dayTimeline(
  date: ISODate,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): TimelineSegment[] {
  const plan = planDay(date, settings, day, now);
  const points = new Set<number>();
  for (const list of [plan.windows, plan.booked, plan.holds, plan.free]) {
    for (const [s, e] of list) points.add(s).add(e);
  }
  points.add(plan.cutoff);
  const sorted = [...points].filter(Number.isFinite).sort((a, b) => a - b);
  const inside = (list: Range[], m: number) => list.some(([s, e]) => m >= s && m < e);

  const segments: TimelineSegment[] = [];
  for (let k = 1; k < sorted.length; k++) {
    const [s, e] = [sorted[k - 1], sorted[k]];
    const m = (s + e) / 2;
    if (!inside(plan.windows, m)) continue;
    const state = inside(plan.booked, m)
      ? 'ocupado'
      : inside(plan.holds, m)
        ? 'em_analise'
        : m >= plan.cutoff && inside(plan.free, m)
          ? 'livre'
          : 'indisponivel';
    const last = segments[segments.length - 1];
    if (last && last.state === state && last.end === minutesToTime(s)) last.end = minutesToTime(e);
    else segments.push({ start: minutesToTime(s), end: minutesToTime(e), state });
  }
  return segments;
}

export function dayAvailability(
  date: ISODate,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): DayAvailability {
  const { first, last } = bookableRange(settings, now);
  if (date < first) return { state: 'passado', available: 0 };
  if (date > last) return { state: 'fora_da_janela', available: 0 };
  if (!openWindows(date, settings, day).length) return { state: 'fechado', available: 0 };
  const plan = planDay(date, settings, day, now);
  const available = plan.free.reduce((sum, [s, e]) => sum + (e - s), 0);
  if (available) return { state: 'disponivel', available };
  // Hoje, sem nada livre porque o expediente já passou: "encerrado", não "lotado".
  if (date === first && plan.windows.every(([, e]) => e <= plan.cutoff)) return { state: 'passado', available: 0 };
  return { state: 'lotado', available: 0 };
}

/**
 * Conflitos de um período com o que já está ocupado ou bloqueado na data.
 * Usado na confirmação (dentro de uma transação).
 */
export function findConflicts(
  day: CalendarDay | null | undefined,
  interval: TimeInterval,
  bufferMin: number,
  ignoreRef?: string,
): string[] {
  if (!day) return [];
  const range = toRange(interval);
  const conflicts: string[] = [];
  if (day.mode === 'fechado') conflicts.push('O dia está fechado na agenda.');
  for (const b of day.blocks) {
    if (overlaps(toRange(b), range)) conflicts.push(`Bloqueio das ${b.start} às ${b.end}.`);
  }
  for (const o of day.booked) {
    if (o.ref === ignoreRef) continue;
    const [s, e] = toRange(o);
    if (overlaps([s - bufferMin, e + bufferMin], range)) {
      conflicts.push(`Reserva confirmada das ${o.start} às ${o.end}${bufferMin ? ` (+${bufferMin} min de preparação)` : ''}.`);
    }
  }
  return conflicts;
}

/** Valida uma lista de intervalos digitada no painel. Retorna a mensagem de erro, ou null. */
export function validateIntervals(list: TimeInterval[]): string | null {
  for (const i of list) {
    if (!isHHMM(i.start) || !isHHMM(i.end)) return 'Preencha início e fim de todos os intervalos.';
    if (timeToMinutes(i.end) <= timeToMinutes(i.start)) {
      return `O intervalo ${i.start}–${i.end} termina antes de começar.`;
    }
  }
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
  for (let k = 1; k < sorted.length; k++) {
    if (timeToMinutes(sorted[k].start) < timeToMinutes(sorted[k - 1].end)) {
      return `Os intervalos ${sorted[k - 1].start}–${sorted[k - 1].end} e ${sorted[k].start}–${sorted[k].end} se sobrepõem.`;
    }
  }
  return null;
}
