import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { ISODate } from '../../types';
import { addDays, addMonths, formatMonth, monthGrid, WEEKDAY_INITIALS, WEEKDAY_SHORT } from '../../utils/datetime';

export interface DayView {
  /** Pode ser selecionado? */
  enabled: boolean;
  className?: string;
  /** Descrição completa para leitores de tela (ex.: "25 de outubro, 3 horários livres"). */
  label: string;
  /** Conteúdo extra abaixo do número. */
  extra?: ReactNode;
}

interface MonthCalendarProps {
  month: string;
  onMonthChange: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
  today: ISODate;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
  describeDay: (date: ISODate) => DayView;
  caption?: string;
}

/** Calendário mensal acessível: botões reais, setas do teclado e estados que não dependem só de cor. */
export function MonthCalendar({
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  today,
  selected,
  onSelect,
  describeDay,
  caption,
}: MonthCalendarProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const canPrev = !minMonth || month > minMonth;
  const canNext = !maxMonth || month < maxMonth;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: ISODate) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const target = addDays(date, delta);
    const btn = tableRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`);
    btn?.focus();
  };

  return (
    <div className="mq-cal">
      <div className="mq-cal__head">
        <button
          type="button"
          className="mq-icon-btn mq-cal__nav"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={!canPrev}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={20} />
        </button>
        <h4 className="mq-cal__month" aria-live="polite">
          {formatMonth(month)}
        </h4>
        <button
          type="button"
          className="mq-icon-btn mq-cal__nav"
          onClick={() => onMonthChange(addMonths(month, 1))}
          disabled={!canNext}
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <table className="mq-cal__table" ref={tableRef} aria-label={caption ?? formatMonth(month)}>
        <thead>
          <tr>
            {WEEKDAY_INITIALS.map((d, i) => (
              <th key={i} scope="col" abbr={WEEKDAY_SHORT[i]}>
                <span aria-hidden="true">{d}</span>
                <span className="visually-hidden">{WEEKDAY_SHORT[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, w) => (
            <tr key={w}>
              {week.map((date, i) => {
                if (!date) return <td key={i} />;
                const view = describeDay(date);
                const isSelected = date === selected;
                return (
                  <td key={date}>
                    <button
                      type="button"
                      data-date={date}
                      className={`mq-day ${view.className ?? ''} ${date === today ? 'is-today' : ''}`}
                      disabled={!view.enabled}
                      aria-pressed={isSelected}
                      aria-label={`${view.label}${date === today ? ' (hoje)' : ''}`}
                      aria-current={date === today ? 'date' : undefined}
                      onClick={() => onSelect(date)}
                      onKeyDown={(e) => onKeyDown(e, date)}
                    >
                      <span className="mq-day__num">{Number(date.slice(8))}</span>
                      {view.extra ?? <span className="mq-day__mark" aria-hidden="true" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
