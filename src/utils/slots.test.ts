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
  services: {
    ensaio: { enabled: true, minDurationMin: 60, maxDurationMin: 240, stepMin: 60, bufferMin: 0 },
    gravacao: { enabled: true, minDurationMin: 60, maxDurationMin: 360, stepMin: 60, bufferMin: 30 },
    locacao: { enabled: true, minDurationMin: 120, maxDurationMin: 480, stepMin: 60, bufferMin: 0 },
  },
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

describe('duração flexível', () => {
  it('mostra os períodos livres e os inícios possíveis', () => {
    expect(periods(SAT, 'ensaio', settings, null, NOW)).toEqual(['09:00-13:00', '14:00-18:00']);
    expect(startTimes(SAT, 'ensaio', settings, null, NOW)).toEqual(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']);
    // Locação exige no mínimo 2h: 12h e 17h não cabem.
    expect(startTimes(SAT, 'locacao', settings, null, NOW)).toEqual(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
  });

  it('oferece de 1h até o fim do período ou o máximo do serviço', () => {
    expect(durationOptions(SAT, 'ensaio', '09:00', settings, null, NOW)).toEqual([60, 120, 180, 240]);
    expect(durationOptions(SAT, 'ensaio', '10:00', settings, null, NOW)).toEqual([60, 120, 180]);
    expect(durationOptions(SAT, 'locacao', '14:00', settings, null, NOW)).toEqual([120, 180, 240]);
    // Início fora da grade ou dentro de trecho fechado não tem duração possível.
    expect(durationOptions(SAT, 'ensaio', '13:00', settings, null, NOW)).toEqual([]);
    expect(durationOptions(SAT, 'ensaio', '09:30', settings, null, NOW)).toEqual([]);
  });

  it('respeita o máximo do serviço mesmo com o dia todo livre', () => {
    const long = day({ mode: 'especial', intervals: [{ start: '08:00', end: '23:00' }] });
    expect(Math.max(...durationOptions(SAT, 'ensaio', '08:00', settings, long, NOW))).toBe(240);
    expect(Math.max(...durationOptions(SAT, 'locacao', '08:00', settings, long, NOW))).toBe(480);
  });

  it('valida o período escolhido', () => {
    expect(isBookable(SAT, 'ensaio', { start: '14:00', end: '17:00' }, settings, null, NOW)).toBe(true);
    expect(isBookable(SAT, 'ensaio', { start: '15:00', end: '16:30' }, settings, null, NOW)).toBe(false); // fora da grade
    expect(isBookable(SAT, 'ensaio', { start: '12:00', end: '14:00' }, settings, null, NOW)).toBe(false); // atravessa o intervalo
    expect(isBookable(SAT, 'ensaio', { start: '09:00', end: '14:00' }, settings, null, NOW)).toBe(false); // acima do máximo
    expect(isBookable(SAT, 'locacao', { start: '14:00', end: '15:00' }, settings, null, NOW)).toBe(false); // abaixo do mínimo
  });

  it('respeita a antecedência mínima e esconde o que já passou', () => {
    // Hoje (terça) 08:00 + 12h = 20:00 → só sobra 20h–22h.
    expect(startTimes('2026-10-20', 'ensaio', settings, null, NOW)).toEqual(['20:00', '21:00']);
    expect(durationOptions('2026-10-20', 'ensaio', '20:00', settings, null, NOW)).toEqual([60, 120]);
  });

  it('serviço pausado não gera horários', () => {
    const paused = { ...settings, services: { ...settings.services, gravacao: { ...settings.services.gravacao, enabled: false } } };
    expect(startTimes(SAT, 'gravacao', paused, null, NOW)).toEqual([]);
  });
});

describe('sala única: uma reserva ocupa todos os serviços', () => {
  const ensaioConfirmado = day({ booked: [{ ref: 'a', start: '10:00', end: '12:00', service: 'ensaio' }] });

  it('reserva de ensaio bloqueia gravação e locação no mesmo período', () => {
    expect(periods(SAT, 'ensaio', settings, ensaioConfirmado, NOW)).toEqual(['09:00-10:00', '12:00-13:00', '14:00-18:00']);
    // Gravação tem 30 min de preparação: a manhã inteira fica sem espaço para 1h.
    expect(periods(SAT, 'gravacao', settings, ensaioConfirmado, NOW)).toEqual(['14:00-18:00']);
    // Locação exige 2h: as sobras de 1h somem.
    expect(periods(SAT, 'locacao', settings, ensaioConfirmado, NOW)).toEqual(['14:00-18:00']);
    expect(isBookable(SAT, 'locacao', { start: '10:00', end: '12:00' }, settings, ensaioConfirmado, NOW)).toBe(false);
  });

  it('pedido em análise e bloqueio também valem para todos', () => {
    const d = day({
      holds: [{ ref: 'b', start: '14:00', end: '16:00', service: 'gravacao' }],
      blocks: [{ id: 'x', start: '09:00', end: '13:00', reason: 'pessoal' }],
    });
    for (const service of ['ensaio', 'locacao'] as const) {
      expect(periods(SAT, service, settings, d, NOW)).toEqual(['16:00-18:00']);
    }
  });

  it('a linha do tempo mostra ocupado, em análise e livre', () => {
    const d = day({
      booked: [{ ref: 'a', start: '10:00', end: '12:00', service: 'locacao' }],
      holds: [{ ref: 'b', start: '15:00', end: '16:00', service: 'gravacao' }],
    });
    expect(dayTimeline(SAT, 'ensaio', settings, d, NOW).map((s) => `${s.start}-${s.end}:${s.state}`)).toEqual([
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
    expect(dayAvailability('2026-10-19', 'ensaio', settings, null, NOW).state).toBe('passado');
    expect(dayAvailability('2026-10-21', 'ensaio', settings, null, NOW).state).toBe('fechado');
    expect(dayAvailability(TUE_NEXT, 'ensaio', settings, null, NOW)).toEqual({ state: 'disponivel', available: 240 });
    const full = day({ booked: [{ ref: 'a', start: '18:00', end: '22:00', service: 'gravacao' }] }, TUE_NEXT);
    expect(dayAvailability(TUE_NEXT, 'ensaio', settings, full, NOW).state).toBe('lotado');
    expect(dayAvailability(TUE_NEXT, 'locacao', settings, full, NOW).state).toBe('lotado');
    expect(dayAvailability('2027-02-02', 'ensaio', settings, null, NOW).state).toBe('fora_da_janela');
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
