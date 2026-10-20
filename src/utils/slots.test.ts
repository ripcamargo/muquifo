import { describe, expect, it } from 'vitest';
import type { AvailabilitySettings, CalendarDay } from '../types';
import { addDays, monthGrid, weekdayOf, zonedNow } from './datetime';
import { dayAvailability, emptyDay, findConflicts, generateSlots, mergeIntervals, openWindows, validateIntervals } from './slots';

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
    ensaio: { enabled: true, durationMin: 120, stepMin: 120, bufferMin: 0 },
    gravacao: { enabled: true, durationMin: 180, stepMin: 60, bufferMin: 30 },
  },
  minAdvanceHours: 12,
  maxDaysAhead: 60,
};

// 2026-10-20 é terça-feira. "Agora" = 20/10/2026 08:00 em São Paulo (11:00 UTC).
const NOW = new Date('2026-10-20T11:00:00Z');
const SAT = '2026-10-24';
const TUE_NEXT = '2026-10-27';

const day = (patch: Partial<CalendarDay>, date = SAT): CalendarDay => ({ ...emptyDay(date), ...patch });

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

describe('geração de horários', () => {
  it('nunca ultrapassa o fim do expediente', () => {
    const slots = generateSlots(SAT, 'ensaio', settings, null, NOW);
    expect(slots.map((s) => `${s.start}-${s.end}`)).toEqual(['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00']);
    const rec = generateSlots(SAT, 'gravacao', settings, null, NOW);
    expect(rec.every((s) => s.end <= '18:00')).toBe(true);
    expect(rec.map((s) => s.start)).toEqual(['09:00', '10:00', '14:00', '15:00']);
  });

  it('respeita a antecedência mínima e esconde horários passados', () => {
    // Hoje (terça) 08:00 + 12h = 20:00 → só sobra 20:00-22:00.
    expect(generateSlots('2026-10-20', 'ensaio', settings, null, NOW).map((s) => s.start)).toEqual(['20:00']);
  });

  it('marca ocupados (com preparação), bloqueados e em análise', () => {
    const d = day({
      booked: [{ ref: 'a', start: '09:00', end: '11:00', service: 'ensaio' }],
      holds: [{ ref: 'b', start: '16:00', end: '18:00', service: 'ensaio' }],
      blocks: [{ id: 'x', start: '14:00', end: '15:00', reason: 'pessoal' }],
    });
    const states = Object.fromEntries(generateSlots(SAT, 'ensaio', settings, d, NOW).map((s) => [s.start, s.state]));
    expect(states).toEqual({ '09:00': 'ocupado', '11:00': 'disponivel', '14:00': 'ocupado', '16:00': 'em_analise' });

    // Gravação tem 30 min de preparação: 11:00-14:00 encosta na reserva das 9-11 → ocupado.
    const rec = Object.fromEntries(generateSlots(SAT, 'gravacao', settings, day({ booked: d.booked }), NOW).map((s) => [s.start, s.state]));
    expect(rec['10:00']).toBe('ocupado');
  });

  it('serviço pausado não gera horários', () => {
    const paused = { ...settings, services: { ...settings.services, gravacao: { ...settings.services.gravacao, enabled: false } } };
    expect(generateSlots(SAT, 'gravacao', paused, null, NOW)).toEqual([]);
  });
});

describe('estado do dia no calendário', () => {
  it('classifica passado, fechado, lotado, disponível e fora da janela', () => {
    expect(dayAvailability('2026-10-19', 'ensaio', settings, null, NOW).state).toBe('passado');
    expect(dayAvailability('2026-10-21', 'ensaio', settings, null, NOW).state).toBe('fechado');
    expect(dayAvailability(TUE_NEXT, 'ensaio', settings, null, NOW)).toEqual({ state: 'disponivel', available: 2 });
    const full = day(
      {
        booked: [
          { ref: 'a', start: '18:00', end: '20:00', service: 'ensaio' },
          { ref: 'b', start: '20:00', end: '22:00', service: 'ensaio' },
        ],
      },
      TUE_NEXT,
    );
    expect(dayAvailability(TUE_NEXT, 'ensaio', settings, full, NOW).state).toBe('lotado');
    expect(dayAvailability('2027-02-02', 'ensaio', settings, null, NOW).state).toBe('fora_da_janela');
  });
});

describe('conflitos na confirmação', () => {
  const d = day({
    booked: [{ ref: 'a', start: '14:00', end: '16:00', service: 'ensaio' }],
    blocks: [{ id: 'x', start: '09:00', end: '10:00', reason: 'manutencao' }],
  });
  it('acusa reserva confirmada, bloqueio e dia fechado', () => {
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
