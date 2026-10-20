import type { AvailabilitySettings, TimeInterval } from '../../../types';
import { weekdayName } from '../../../utils/datetime';
import { IntervalsEditor } from './IntervalsEditor';

// Semana começando na segunda, como o estúdio pensa a agenda.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  settings: AvailabilitySettings;
  onChange: (s: AvailabilitySettings) => void;
}

export function WeeklyEditor({ settings, onChange }: Props) {
  const setDay = (day: number, intervals: TimeInterval[]) =>
    onChange({ ...settings, weekly: { ...settings.weekly, [String(day)]: intervals } });

  return (
    <section className="adm-card">
      <div className="adm-card__head">
        <h2>Horário de funcionamento habitual</h2>
      </div>
      <p className="mq-muted" style={{ fontSize: '0.9375rem' }}>
        Vale para todas as semanas. Um dia pode ter vários intervalos (ex.: manhã e noite). Para mudar uma data
        específica — feriado, folga, horário extra — use a aba “Datas e bloqueios”.
      </p>
      {ORDER.map((day) => {
        const intervals = settings.weekly[String(day)] ?? [];
        const open = intervals.length > 0;
        const name = weekdayName(day);
        return (
          <div className="adm-week-row" key={day}>
            <div className="adm-week-row__day">
              <strong>{name}</strong>
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={(e) => setDay(day, e.target.checked ? [{ start: '18:00', end: '22:00' }] : [])}
                />
                {open ? 'Aberto' : 'Fechado'}
              </label>
            </div>
            {open ? (
              <IntervalsEditor label={name} value={intervals} onChange={(v) => setDay(day, v)} />
            ) : (
              <div className="adm-week-row__closed">Fechado</div>
            )}
          </div>
        );
      })}
    </section>
  );
}
