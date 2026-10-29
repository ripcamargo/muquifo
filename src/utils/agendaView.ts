// Cálculos de visualização da agenda (semana/mês), usados pelo painel e pelo agendamento do cliente.
import type { AvailabilitySettings, CalendarDay, ISODate, TimeInterval } from '../types';
import { addDays, formatTime, minutesToTime, timeToMinutes, weekdayOf } from './datetime';
import { openWindows } from './slots';

export type CalendarView = 'semana' | 'mes';

/** Faixa de horas (cheias) exibida na grade: cobre o expediente da semana e, se houver, os eventos. */
export function hourRange(
  dates: ISODate[],
  settings: AvailabilitySettings | null,
  days: Map<ISODate, CalendarDay>,
  events: { startMin: number; endMin: number }[] = [],
): { startHour: number; endHour: number } {
  let min = Infinity;
  let max = -Infinity;
  if (settings) {
    for (const date of dates) {
      for (const w of openWindows(date, settings, days.get(date))) {
        min = Math.min(min, timeToMinutes(w.start));
        max = Math.max(max, timeToMinutes(w.end));
      }
    }
  }
  for (const e of events) {
    min = Math.min(min, e.startMin);
    max = Math.max(max, e.endMin);
  }
  if (!Number.isFinite(min)) return { startHour: 8, endHour: 22 };
  let startHour = Math.max(0, Math.floor(min / 60));
  let endHour = Math.min(24, Math.ceil(max / 60));
  while (endHour - startHour < 6) {
    if (endHour < 24) endHour++;
    else if (startHour > 0) startHour--;
    else break;
  }
  return { startHour, endHour };
}

/** Trechos da faixa [from, to] (minutos) que ficam fora do expediente. */
export function closedRanges(windows: TimeInterval[], from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  let cursor = from;
  for (const w of [...windows].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))) {
    const s = Math.max(from, timeToMinutes(w.start));
    const e = Math.min(to, timeToMinutes(w.end));
    if (e <= from || s >= to) continue;
    if (s > cursor) out.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}

/** Domingo da semana da data. */
export const weekStart = (date: ISODate): ISODate => addDays(date, -weekdayOf(date));

export function weekDates(anchor: ISODate): ISODate[] {
  const first = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Todas as datas exibidas no mês, de domingo a sábado (inclui dias dos meses vizinhos). */
export function monthCells(month: string): ISODate[][] {
  const first = weekStart(`${month}-01`);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1));
  const last = addDays(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`, -1);
  const weeks: ISODate[][] = [];
  for (let d = first; d <= last; d = addDays(d, 7)) weeks.push(weekDates(d));
  return weeks;
}

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function dayMonthShort(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

/** "26 out – 1 nov 2026" */
export function formatWeekTitle(dates: ISODate[]): string {
  const a = dates[0];
  const b = dates[dates.length - 1];
  return `${dayMonthShort(a)} – ${dayMonthShort(b)} ${b.slice(0, 4)}`;
}

export const timeLabel = (min: number): string => formatTime(minutesToTime(min));
