import type { AvailabilitySettings, CalendarDay, ISODate } from '../../../types';
import { formatTime, WEEKDAY_SHORT } from '../../../utils/datetime';
import { openWindows } from '../../../utils/slots';
import { monthCells, type CalEvent } from './calendarModel';

const MAX_CHIPS = 3;

interface Props {
  month: string;
  settings: AvailabilitySettings | null;
  days: Map<ISODate, CalendarDay>;
  events: CalEvent[];
  today: ISODate;
  onPickDay: (date: ISODate) => void;
  onOpen: (id: string) => void;
}

export function MonthView({ month, settings, days, events, today, onPickDay, onOpen }: Props) {
  const weeks = monthCells(month);
  const byDate = new Map<ISODate, CalEvent[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <div className="adm-month">
      <div className="adm-month__head">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="adm-month__week">
          {week.map((date) => {
            const list = byDate.get(date) ?? [];
            const closed = settings ? openWindows(date, settings, days.get(date)).length === 0 : false;
            const cls = [
              'adm-month__cell',
              date.slice(0, 7) !== month && 'is-outside',
              date === today && 'is-today',
              date < today && 'is-past',
              closed && 'is-closed',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={date} className={cls} onClick={() => onPickDay(date)}>
                <button type="button" className="adm-month__num" onClick={() => onPickDay(date)} aria-label={`Ver semana de ${date.split('-').reverse().join('/')}`}>
                  {Number(date.slice(8))}
                </button>
                {closed && <span className="adm-month__tag">Fechado</span>}
                <div className="adm-month__events">
                  {list.slice(0, MAX_CHIPS).map((e) => (
                    <button
                      key={`${e.status}-${e.id}`}
                      type="button"
                      className={`adm-chip adm-chip--${e.status}`}
                      disabled={e.orphan}
                      onClick={(c) => {
                        c.stopPropagation();
                        onOpen(e.id);
                      }}
                      title={`${e.title} · ${formatTime(e.start)}–${formatTime(e.end)}`}
                    >
                      <b>{formatTime(e.start)}</b> {e.title}
                    </button>
                  ))}
                  {list.length > MAX_CHIPS && <span className="adm-chip__more">+{list.length - MAX_CHIPS} mais</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
