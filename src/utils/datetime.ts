import type { HHMM, ISODate } from '../types';

export const STUDIO_TIMEZONE = 'America/Sao_Paulo';

const pad = (n: number) => String(n).padStart(2, '0');

/** Data e minuto atuais no fuso do estúdio, independentemente do fuso do aparelho. */
export function zonedNow(timeZone = STUDIO_TIMEZONE, now = new Date()): { date: ISODate; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

// Datas de calendário são tratadas como dias "puros" em UTC só para aritmética,
// assim nunca há deslocamento de dia por causa do fuso do aparelho.
function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt: Date): ISODate {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUTC(toUTC(value)) === value;
}

export function addDays(date: ISODate, days: number): ISODate {
  const dt = toUTC(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUTC(dt);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(date: ISODate): number {
  return toUTC(date).getUTCDay();
}

/** "YYYY-MM" */
export function monthOf(date: ISODate): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

export function monthRange(month: string): { first: ISODate; last: ISODate } {
  const first = `${month}-01`;
  return { first, last: addDays(`${addMonths(month, 1)}-01`, -1) };
}

/** Semanas do mês (domingo a sábado); posições fora do mês são null. */
export function monthGrid(month: string): (ISODate | null)[][] {
  const { first, last } = monthRange(month);
  const cells: (ISODate | null)[] = Array(weekdayOf(first)).fill(null);
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function timeToMinutes(time: HHMM): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): HHMM {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function isHHMM(value: string): boolean {
  if (value === '24:00') return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "19:00" → "19h", "19:30" → "19h30". */
export function formatTime(time: HHMM): string {
  const [h, m] = time.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function formatTimeRange(start: HHMM, end: HHMM): string {
  return `${formatTime(start)} às ${formatTime(end)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function weekdayName(index: number): string {
  return WEEKDAYS[index];
}

/** "sábado, 25 de outubro" */
export function formatDateLong(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(date)]}, ${d} de ${MONTHS[m - 1]}`;
}

/** "25/10/2026 (sábado)" */
export function formatDateWithWeekday(date: ISODate): string {
  return `${formatDateShort(date)} (${WEEKDAYS[weekdayOf(date)]})`;
}

/** "25/10/2026" */
export function formatDateShort(date: ISODate): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** "outubro de 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** Data/hora absoluta (ex.: createdAt) exibida no fuso do estúdio. */
export function formatTimestamp(value: Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

/** Data local (no fuso do estúdio) de um instante. */
export function zonedDateOf(value: Date): ISODate {
  return zonedNow(STUDIO_TIMEZONE, value).date;
}
