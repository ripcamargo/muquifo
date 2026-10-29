import { Ban, Lock } from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { serviceInfo } from '../../../config/studio';
import { STATUS_LABELS } from '../../../config/status';
import type { AvailabilitySettings, CalendarDay, ISODate } from '../../../types';
import { formatTime, minutesToTime, timeToMinutes, WEEKDAY_SHORT, weekdayOf } from '../../../utils/datetime';
import { openWindows } from '../../../utils/slots';
import { closedRanges, hourRange, layoutLanes, timeLabel, type CalEvent } from './calendarModel';

const BLOCK_LABELS = { pessoal: 'Pessoal', manutencao: 'Manutenção', compromisso: 'Compromisso', outro: 'Bloqueio' } as const;

interface Props {
  dates: ISODate[];
  settings: AvailabilitySettings | null;
  days: Map<ISODate, CalendarDay>;
  events: CalEvent[];
  today: ISODate;
  nowMin: number;
  onSlot: (date: ISODate, start: string) => void;
  onOpen: (id: string) => void;
}

const pos = (min: number, startMin: number) => `calc(var(--adm-hour) * ${(min - startMin) / 60})`;

export function WeekView({ dates, settings, days, events, today, nowMin, onSlot, onOpen }: Props) {
  const { startHour, endHour } = hourRange(dates, settings, days, events);
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const step = settings?.booking.stepMin ?? 60;

  function pickSlot(date: ISODate, e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = startMin + ((e.clientY - rect.top) / rect.height) * (endMin - startMin);
    const snapped = Math.min(endMin - step, Math.max(startMin, Math.floor(raw / step) * step));
    onSlot(date, minutesToTime(snapped));
  }

  return (
    <div className="adm-week">
      <div className="adm-week__inner">
        <div className="adm-week__head">
          <span />
          {dates.map((date) => (
            <div key={date} className={`adm-week__dayhead${date === today ? ' is-today' : ''}${date < today ? ' is-past' : ''}`}>
              <small>{WEEKDAY_SHORT[weekdayOf(date)]}</small>
              <b>{Number(date.slice(8))}</b>
            </div>
          ))}
        </div>

        <div className="adm-week__body" style={{ '--adm-rows': hours.length } as CSSProperties}>
          <div className="adm-week__hours" aria-hidden="true">
            {hours.map((h) => (
              <span key={h} style={{ top: pos(h * 60, startMin) }}>
                {h}h
              </span>
            ))}
          </div>

          {dates.map((date) => {
            const day = days.get(date);
            const windows = settings ? openWindows(date, settings, day) : null;
            const dayEvents = events.filter((e) => e.date === date);
            const lanes = layoutLanes(dayEvents);
            const closed = windows ? closedRanges(windows, startMin, endMin) : [];
            const fullyClosed = windows !== null && windows.length === 0;
            return (
              <div
                key={date}
                className={`adm-week__col${date === today ? ' is-today' : ''}${date < today ? ' is-past' : ''}`}
                onClick={(e) => pickSlot(date, e)}
                title="Clique num horário vazio para agendar"
              >
                {closed.map(([s, e]) => (
                  <div key={s} className="adm-ev adm-ev--closed" style={{ top: pos(s, startMin), height: pos(e, s) }} />
                ))}
                {fullyClosed && (
                  <span className="adm-week__closedtag">
                    <Lock size={12} aria-hidden="true" /> Fechado
                  </span>
                )}

                {(day?.blocks ?? []).map((b) => {
                  const s = Math.max(startMin, timeToMinutes(b.start));
                  const e = Math.min(endMin, timeToMinutes(b.end));
                  if (e <= s) return null;
                  return (
                    <div
                      key={b.id}
                      className="adm-ev adm-ev--block"
                      style={{ top: pos(s, startMin), height: pos(e, s) }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <Ban size={12} aria-hidden="true" /> {BLOCK_LABELS[b.reason]}
                      <small>
                        {formatTime(b.start)}–{formatTime(b.end)}
                      </small>
                    </div>
                  );
                })}

                {dayEvents.map((ev) => {
                  const { lane, lanes: n } = lanes.get(ev.id) ?? { lane: 0, lanes: 1 };
                  const s = Math.max(startMin, ev.startMin);
                  const e = Math.min(endMin, ev.endMin);
                  const short = e - s <= 60;
                  return (
                    <button
                      key={`${ev.status}-${ev.id}`}
                      type="button"
                      className={`adm-ev adm-ev--${ev.status}${short ? ' is-short' : ''}`}
                      style={{
                        top: pos(s, startMin),
                        height: pos(e, s),
                        left: `calc(${(lane / n) * 100}% + 2px)`,
                        width: `calc(${100 / n}% - 4px)`,
                      }}
                      disabled={ev.orphan}
                      onClick={(c) => {
                        c.stopPropagation();
                        onOpen(ev.id);
                      }}
                      title={`${ev.title} · ${serviceInfo(ev.service).name} · ${formatTime(ev.start)}–${formatTime(ev.end)} · ${STATUS_LABELS[ev.status]}`}
                    >
                      <strong>{ev.title}</strong>
                      <small>
                        {formatTime(ev.start)}–{formatTime(ev.end)}
                        {!short && ` · ${serviceInfo(ev.service).name}`}
                      </small>
                    </button>
                  );
                })}

                {date === today && nowMin >= startMin && nowMin <= endMin && (
                  <div className="adm-week__now" style={{ top: pos(nowMin, startMin) }} aria-label={`Agora: ${timeLabel(nowMin)}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
