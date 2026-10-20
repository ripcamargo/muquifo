import type { AvailabilitySettings } from '../types';
import { STUDIO_TIMEZONE } from '../utils/datetime';

/**
 * Valores de EXEMPLO que aparecem no painel antes da primeira configuração.
 * O site público nunca usa estes valores: enquanto o administrador não salvar a
 * disponibilidade no painel, o calendário mostra "agenda ainda não publicada".
 */
export const EXAMPLE_SETTINGS: AvailabilitySettings = {
  timezone: STUDIO_TIMEZONE,
  weekly: {
    '0': [],
    '1': [],
    '2': [{ start: '18:00', end: '22:00' }],
    '3': [{ start: '18:00', end: '22:00' }],
    '4': [{ start: '18:00', end: '22:00' }],
    '5': [{ start: '18:00', end: '23:00' }],
    '6': [{ start: '09:00', end: '23:00' }],
  },
  services: {
    ensaio: { enabled: true, minDurationMin: 60, maxDurationMin: 300, stepMin: 60, bufferMin: 0 },
    gravacao: { enabled: true, minDurationMin: 60, maxDurationMin: 360, stepMin: 60, bufferMin: 30 },
    locacao: { enabled: true, minDurationMin: 60, maxDurationMin: 480, stepMin: 60, bufferMin: 30 },
  },
  minAdvanceHours: 12,
  maxDaysAhead: 60,
};
