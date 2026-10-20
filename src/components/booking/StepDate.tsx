import { CalendarX } from 'lucide-react';
import { useMemo } from 'react';
import { serviceInfo } from '../../config/studio';
import type { useAvailability } from '../../hooks/useAvailability';
import type { ISODate } from '../../types';
import { addDays, addMonths, formatDateLong, formatMonth, monthOf, monthRange, zonedNow } from '../../utils/datetime';
import { bookableRange, dayAvailability } from '../../utils/slots';
import { MonthCalendar, type DayView } from '../calendar/MonthCalendar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { AvailabilityGate, BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  availability: ReturnType<typeof useAvailability>;
  month: string;
  setMonth: (month: string) => void;
  onPick: (date: ISODate) => void;
}

export function StepDate({ draft, goTo, availability, month, setMonth, onPick }: Props) {
  const { settings, days, status } = availability;
  const service = draft.service!;
  const now = new Date();
  const today = zonedNow(settings?.timezone, now).date;

  const range = settings ? bookableRange(settings, now) : null;

  const describe = useMemo(() => {
    return (date: ISODate): DayView => {
      const label = formatDateLong(date);
      if (!settings) return { enabled: false, label };
      const a = dayAvailability(date, service, settings, days.get(date), now);
      switch (a.state) {
        case 'disponivel':
          return {
            enabled: true,
            className: 'is-available',
            label: `${label}: ${a.available} ${a.available === 1 ? 'horário livre' : 'horários livres'}`,
          };
        case 'lotado':
          return { enabled: false, className: 'is-full', label: `${label}: lotado` };
        case 'fechado':
          return { enabled: false, label: `${label}: fechado` };
        default:
          return { enabled: false, label: `${label}: indisponível` };
      }
    };
    // `now` fica de fora de propósito: a agenda é recalculada quando os dados mudam.
  }, [settings, days, service]);

  const freeThisMonth = useMemo(() => {
    if (status !== 'ready') return 0;
    const { first, last } = monthRange(month);
    let count = 0;
    for (let d = first; d <= last; d = addDays(d, 1)) if (describe(d).enabled) count++;
    return count;
  }, [describe, month, status]);

  const maxMonth = range ? monthOf(range.last) : undefined;
  const canGoNext = !!maxMonth && month < maxMonth;

  return (
    <div>
      <StepTitle>Escolha o dia</StepTitle>
      <p className="mq-wizard__lead">
        Dias com marcação têm horário livre para <strong>{serviceInfo(service).name.toLowerCase()}</strong>.
      </p>

      <AvailabilityGate status={status} error={availability.error} retry={availability.retry}>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          minMonth={monthOf(today)}
          maxMonth={maxMonth}
          today={today}
          selected={draft.date}
          onSelect={onPick}
          describeDay={describe}
          caption={`Dias disponíveis em ${formatMonth(month)}`}
        />
        <div className="mq-cal-legend" aria-hidden="true">
          <span>
            <i /> Com horário livre
          </span>
          <span>
            <i className="is-full" /> Lotado
          </span>
          <span>
            <i className="is-closed" /> Fechado ou indisponível
          </span>
        </div>
        {freeThisMonth === 0 && (
          <EmptyState
            icon={CalendarX}
            title={`Nenhum dia livre em ${formatMonth(month).split(' de ')[0]}`}
            actions={
              canGoNext && (
                <Button size="sm" onClick={() => setMonth(addMonths(month, 1))}>
                  Ver próximo mês
                </Button>
              )
            }
          >
            {canGoNext ? 'Tente o mês seguinte.' : 'Novos horários são liberados em breve. Volte mais tarde ou chame no WhatsApp.'}
          </EmptyState>
        )}
      </AvailabilityGate>

      <div className="mq-wizard__footer">
        <BackButton onClick={() => goTo('servico')} />
      </div>
    </div>
  );
}
