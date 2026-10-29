import type { CSSProperties } from 'react';
import type { AvailabilitySettings, CalendarDay, ISODate } from '../../types';
import { closedRanges, hourRange } from '../../utils/agendaView';
import { formatDateLong, formatDuration, formatTime, timeToMinutes, WEEKDAY_SHORT, weekdayOf } from '../../utils/datetime';
import { dayAvailability, dayTimeline, openWindows } from '../../utils/slots';

interface Props {
  dates: ISODate[];
  settings: AvailabilitySettings;
  days: Map<ISODate, CalendarDay>;
  today: ISODate;
  selected: ISODate | null;
  onPick: (date: ISODate) => void;
}

const pos = (min: number, from: number) => `calc(var(--mq-hour) * ${(min - from) / 60})`;

/**
 * Semana em grade de horas, para ver de relance onde há horário livre. Cada coluna é um botão:
 * tocar num dia com horário livre segue para a escolha do horário. Estados têm textura além de cor.
 */
export function WeekAvailability({ dates, settings, days, today, selected, onPick }: Props) {
  const now = new Date();
  const { startHour, endHour } = hourRange(dates, settings, days);
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className="mq-week" style={{ '--mq-rows': hours.length } as CSSProperties}>
      <div className="mq-week__head">
        <span />
        {dates.map((date) => (
          <div key={date} className={`mq-week__dayhead${date === today ? ' is-today' : ''}${date < today ? ' is-past' : ''}`}>
            <small>{WEEKDAY_SHORT[weekdayOf(date)]}</small>
            <b>{Number(date.slice(8))}</b>
          </div>
        ))}
      </div>

      <div className="mq-week__body">
        <div className="mq-week__hours" aria-hidden="true">
          {hours.map((h) => (
            <span key={h} style={{ top: pos(h * 60, startMin) }}>
              {h}h
            </span>
          ))}
        </div>

        {dates.map((date) => {
          const day = days.get(date);
          const a = dayAvailability(date, settings, day, now);
          const enabled = a.state === 'disponivel';
          const windows = openWindows(date, settings, day);
          const segments = a.state === 'passado' || a.state === 'fora_da_janela' ? [] : dayTimeline(date, settings, day, now);
          const label =
            a.state === 'disponivel'
              ? `${formatDateLong(date)}: ${formatDuration(a.available)} livres. Escolher este dia`
              : `${formatDateLong(date)}: ${a.state === 'lotado' ? 'lotado' : a.state === 'fechado' ? 'fechado' : 'indisponível'}`;
          return (
            <button
              key={date}
              type="button"
              className={`mq-week__col${date === today ? ' is-today' : ''}`}
              disabled={!enabled}
              aria-pressed={date === selected}
              aria-label={label}
              onClick={() => onPick(date)}
            >
              {closedRanges(a.state === 'passado' || a.state === 'fora_da_janela' ? [] : windows, startMin, endMin).map(([s, e]) => (
                <span key={s} className="mq-week__seg is-off" style={{ top: pos(s, startMin), height: pos(e, s) }} />
              ))}
              {segments.map((seg) => {
                const s = Math.max(startMin, timeToMinutes(seg.start));
                const e = Math.min(endMin, timeToMinutes(seg.end));
                if (e <= s) return null;
                return (
                  <span key={seg.start} className={`mq-week__seg is-${seg.state}`} style={{ top: pos(s, startMin), height: pos(e, s) }}>
                    {seg.state === 'livre' && e - s >= 60 && (
                      <em>
                        {formatTime(seg.start)}
                        <br />
                        {formatTime(seg.end)}
                      </em>
                    )}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
