import { describe, expect, it } from 'vitest';
import type { AvailabilitySettings, CalendarDay } from '../types';
import { addDays, monthGrid, weekdayOf, zonedNow } from './datetime';
import {
  dayAvailability,
  dayTimeline,
  durationOptions,
  emptyDay,
  findConflicts,
  freePeriods,
  isBookable,
  mergeIntervals,
  openWindows,
  startTimes,
  validateIntervals,
} from './slots';

const settings: AvailabilitySettings = {
  timezone: 'America/Sao_Paulo',
  weekly: {
    '0': [],
    '1': [],
    '2': [{ start: '18:00', end: '22:00' }],
    '3': [],
    '4': [],
    '5': [],
    '6': [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
  },
  booking: { minDurationMin: 60, maxDurationMin: 240, stepMin: 60, bufferMin: 0 },
  minAdvanceHours: 12,
  maxDaysAhead: 60,
};

// 2026-10-20 é terça-feira. "Agora" = 20/10/2026 08:00 em São Paulo (11:00 UTC).
const NOW = new Date('2026-10-20T11:00:00Z');
const SAT = '2026-10-24';
const TUE_NEXT = '2026-10-27';

const day = (patch: Partial<CalendarDay>, date = SAT): CalendarDay => ({ ...emptyDay(date), ...patch });
const periods = (...args: Parameters<typeof freePeriods>) => freePeriods(...args).map((p) => `${p.start}-${p.end}`);

describe('datas no fuso do estúdio', () => {
  it('usa o dia de São Paulo, não o do aparelho', () => {
    // 01:30 UTC de 21/10 ainda é 20/10 em São Paulo (UTC-3).
    expect(zonedNow('America/Sao_Paulo', new Date('2026-10-21T01:30:00Z'))).toEqual({ date: '2026-10-20', minutes: 22 * 60 + 30 });
  });
  it('calcula dia da semana e soma dias sem deslocamento', () => {
    expect(weekdayOf('2026-10-20')).toBe(2);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('monta a grade do mês começando no domingo', () => {
    const grid = monthGrid('2026-10');
    expect(grid[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[0][4]).toBe('2026-10-01');
  });
});

describe('expediente', () => {
  it('une intervalos encostados', () => {
    expect(mergeIntervals([{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }, { start: '12:00', end: '13:00' }])).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '16:00' },
    ]);
  });
  it('exceção de data prevalece sobre a semana', () => {
    expect(openWindows(SAT, settings, day({ mode: 'fechado' }))).toEqual([]);
    expect(openWindows(SAT, settings, day({ mode: 'especial', intervals: [{ start: '15:00', end: '19:00' }] }))).toEqual([
      { start: '15:00', end: '19:00' },
    ]);
    expect(openWindows('2026-10-26', settings, day({ extraIntervals: [{ start: '10:00', end: '12:00' }] }, '2026-10-26'))).toEqual([
      { start: '10:00', end: '12:00' },
    ]);
  });
  it('detecta intervalos inválidos e sobrepostos', () => {
    expect(validateIntervals([{ start: '18:00', end: '17:00' }])).toMatch(/termina antes/);
    expect(validateIntervals([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }])).toMatch(/sobrepõem/);
    expect(validateIntervals([{ start: '09:00', end: '12:00' }, { start: '12:00', end: '13:00' }])).toBeNull();
  });
});

const withBuffer = { ...settings, booking: { ...settings.booking, bufferMin: 30 } };

describe('duração flexível', () => {
  it('mostra os períodos livres e os inícios possíveis', () => {
    expect(periods(SAT, settings, null, NOW)).toEqual(['09:00-13:00', '14:00-18:00']);
    expect(startTimes(SAT, settings, null, NOW)).toEqual(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']);
  });

  it('oferece da duração mínima até o fim do período ou o máximo', () => {
    expect(durationOptions(SAT, '09:00', settings, null, NOW)).toEqual([60, 120, 180, 240]);
    expect(durationOptions(SAT, '10:00', settings, null, NOW)).toEqual([60, 120, 180]);
    // Início fora da grade ou dentro de trecho fechado não tem duração possível.
    expect(durationOptions(SAT, '13:00', settings, null, NOW)).toEqual([]);
    expect(durationOptions(SAT, '09:30', settings, null, NOW)).toEqual([]);
  });

  it('respeita o máximo mesmo com o dia todo livre, e o mínimo', () => {
    const long = day({ mode: 'especial', intervals: [{ start: '08:00', end: '23:00' }] });
    expect(Math.max(...durationOptions(SAT, '08:00', settings, long, NOW))).toBe(240);
    const twoHoursMin = { ...settings, booking: { ...settings.booking, minDurationMin: 120 } };
    expect(startTimes(SAT, twoHoursMin, null, NOW)).toEqual(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
  });

  it('valida o período escolhido', () => {
    expect(isBookable(SAT, { start: '14:00', end: '17:00' }, settings, null, NOW)).toBe(true);
    expect(isBookable(SAT, { start: '15:00', end: '16:30' }, settings, null, NOW)).toBe(false); // fora da grade
    expect(isBookable(SAT, { start: '12:00', end: '14:00' }, settings, null, NOW)).toBe(false); // atravessa o intervalo
    expect(isBookable(SAT, { start: '09:00', end: '14:00' }, settings, null, NOW)).toBe(false); // acima do máximo
  });

  it('respeita a antecedência mínima e esconde o que já passou', () => {
    // Hoje (terça) 08:00 + 12h = 20:00 → só sobra 20h–22h.
    expect(startTimes('2026-10-20', settings, null, NOW)).toEqual(['20:00', '21:00']);
    expect(durationOptions('2026-10-20', '20:00', settings, null, NOW)).toEqual([60, 120]);
  });
});

describe('sala única: a modalidade não muda a agenda', () => {
  it('uma reserva de qualquer modalidade ocupa o período para todos', () => {
    for (const service of ['ensaio', 'gravacao', 'locacao'] as const) {
      const d = day({ booked: [{ ref: 'a', start: '10:00', end: '12:00', service }] });
      expect(periods(SAT, settings, d, NOW)).toEqual(['09:00-10:00', '12:00-13:00', '14:00-18:00']);
      expect(isBookable(SAT, { start: '10:00', end: '12:00' }, settings, d, NOW)).toBe(false);
    }
  });

  it('a preparação entre reservas vale para todos', () => {
    const d = day({ booked: [{ ref: 'a', start: '10:00', end: '12:00', service: 'locacao' }] });
    // 30 min de folga: a manhã inteira fica sem espaço para 1h.
    expect(periods(SAT, withBuffer, d, NOW)).toEqual(['14:00-18:00']);
  });

  it('pedido em análise e bloqueio também ocupam a sala', () => {
    const d = day({
      holds: [{ ref: 'b', start: '14:00', end: '16:00', service: 'gravacao' }],
      blocks: [{ id: 'x', start: '09:00', end: '13:00', reason: 'pessoal' }],
    });
    expect(periods(SAT, settings, d, NOW)).toEqual(['16:00-18:00']);
  });

  it('a linha do tempo mostra ocupado, em análise e livre', () => {
    const d = day({
      booked: [{ ref: 'a', start: '10:00', end: '12:00', service: 'locacao' }],
      holds: [{ ref: 'b', start: '15:00', end: '16:00', service: 'gravacao' }],
    });
    expect(dayTimeline(SAT, settings, d, NOW).map((s) => `${s.start}-${s.end}:${s.state}`)).toEqual([
      '09:00-10:00:livre',
      '10:00-12:00:ocupado',
      '12:00-13:00:livre',
      '14:00-15:00:livre',
      '15:00-16:00:em_analise',
      '16:00-18:00:livre',
    ]);
  });
});

describe('estado do dia no calendário', () => {
  it('classifica passado, fechado, lotado, disponível e fora da janela', () => {
    expect(dayAvailability('2026-10-19', settings, null, NOW).state).toBe('passado');
    expect(dayAvailability('2026-10-21', settings, null, NOW).state).toBe('fechado');
    expect(dayAvailability(TUE_NEXT, settings, null, NOW)).toEqual({ state: 'disponivel', available: 240 });
    const full = day({ booked: [{ ref: 'a', start: '18:00', end: '22:00', service: 'gravacao' }] }, TUE_NEXT);
    expect(dayAvailability(TUE_NEXT, settings, full, NOW).state).toBe('lotado');
    expect(dayAvailability('2027-02-02', settings, null, NOW).state).toBe('fora_da_janela');
  });
});

describe('conflitos na confirmação', () => {
  const d = day({
    booked: [{ ref: 'a', start: '14:00', end: '16:00', service: 'locacao' }],
    blocks: [{ id: 'x', start: '09:00', end: '10:00', reason: 'manutencao' }],
  });
  it('acusa reserva de qualquer serviço, bloqueio e dia fechado', () => {
    expect(findConflicts(d, { start: '15:00', end: '17:00' }, 0)).toHaveLength(1);
    expect(findConflicts(d, { start: '09:30', end: '11:00' }, 0)).toHaveLength(1);
    expect(findConflicts(day({ mode: 'fechado' }), { start: '10:00', end: '12:00' }, 0)).toHaveLength(1);
  });
  it('considera a preparação e ignora o próprio pedido', () => {
    expect(findConflicts(d, { start: '16:00', end: '18:00' }, 0)).toHaveLength(0);
    expect(findConflicts(d, { start: '16:00', end: '18:00' }, 30)).toHaveLength(1);
    expect(findConflicts(d, { start: '14:00', end: '16:00' }, 0, 'a')).toHaveLength(0);
  });
});
