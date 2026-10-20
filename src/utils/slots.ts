// Motor de disponibilidade: única fonte das regras usadas pelo site e pelo painel.
import type {
  AvailabilitySettings,
  CalendarDay,
  DayAvailability,
  ISODate,
  Occupation,
  ServiceType,
  Slot,
  TimeInterval,
} from '../types';
import { diffDays, isHHMM, minutesToTime, timeToMinutes, weekdayOf, zonedNow } from './datetime';

type Range = [number, number];

const toRange = (i: TimeInterval): Range => [timeToMinutes(i.start), timeToMinutes(i.end)];
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1];

export function emptyDay(date: ISODate): CalendarDay {
  return { date, mode: 'padrao', intervals: [], extraIntervals: [], blocks: [], booked: [], holds: [] };
}

/** Une intervalos sobrepostos ou encostados e ordena. */
export function mergeIntervals(list: TimeInterval[]): TimeInterval[] {
  const ranges = list
    .filter((i) => isHHMM(i.start) && isHHMM(i.end))
    .map(toRange)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of ranges) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([...r] as Range);
  }
  return out.map(([s, e]) => ({ start: minutesToTime(s), end: minutesToTime(e) }));
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

/**
 * Horários de um serviço numa data.
 * - Nunca inclui horários que já passaram ou que desrespeitam a antecedência mínima.
 * - Ocupados (reservas confirmadas + tempo de preparação, ou bloqueios) aparecem como "ocupado".
 * - Pedidos em análise pelo administrador aparecem como "em_analise".
 */
export function generateSlots(
  date: ISODate,
  service: ServiceType,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): Slot[] {
  const cfg = settings.services[service];
  if (!cfg?.enabled || cfg.durationMin <= 0) return [];
  const step = cfg.stepMin > 0 ? cfg.stepMin : cfg.durationMin;
  const { date: today, minutes: nowMin } = zonedNow(settings.timezone, now);
  const offsetDays = diffDays(date, today);
  const earliest = nowMin + Math.max(0, settings.minAdvanceHours) * 60;

  const blocks = (day?.blocks ?? []).map(toRange);
  const padded = (list: Occupation[]): Range[] =>
    list.map((o) => {
      const [s, e] = toRange(o);
      return [s - cfg.bufferMin, e + cfg.bufferMin];
    });
  const booked = padded(day?.booked ?? []);
  const holds = padded(day?.holds ?? []);

  const seen = new Set<number>();
  const slots: Slot[] = [];
  for (const window of openWindows(date, settings, day)) {
    const [ws, we] = toRange(window);
    for (let start = ws; start + cfg.durationMin <= we; start += step) {
      if (seen.has(start)) continue;
      seen.add(start);
      if (offsetDays * 1440 + start < earliest) continue;
      const range: Range = [start, start + cfg.durationMin];
      const state = blocks.some((b) => overlaps(b, range)) || booked.some((b) => overlaps(b, range))
        ? 'ocupado'
        : holds.some((h) => overlaps(h, range))
          ? 'em_analise'
          : 'disponivel';
      slots.push({ start: minutesToTime(range[0]), end: minutesToTime(range[1]), state });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export function dayAvailability(
  date: ISODate,
  service: ServiceType,
  settings: AvailabilitySettings,
  day?: CalendarDay | null,
  now = new Date(),
): DayAvailability {
  const { first, last } = bookableRange(settings, now);
  if (date < first) return { state: 'passado', available: 0 };
  if (date > last) return { state: 'fora_da_janela', available: 0 };
  if (!openWindows(date, settings, day).length) return { state: 'fechado', available: 0 };
  const slots = generateSlots(date, service, settings, day, now);
  const available = slots.filter((s) => s.state === 'disponivel').length;
  if (!slots.length && date === first) return { state: 'passado', available: 0 };
  return { state: available ? 'disponivel' : 'lotado', available };
}

/**
 * Conflitos de um período com o que já está ocupado ou bloqueado na data.
 * Usado na confirmação (dentro de uma transação) e na verificação final do visitante.
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
