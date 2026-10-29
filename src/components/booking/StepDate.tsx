import { CalendarX, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { useAvailability } from '../../hooks/useAvailability';
import type { ISODate } from '../../types';
import { formatWeekTitle, monthCells, weekDates, type CalendarView } from '../../utils/agendaView';
import { addDays, addMonths, formatDateLong, formatDuration, formatMonth, monthOf, monthRange, zonedNow } from '../../utils/datetime';
import { bookableRange, dayAvailability } from '../../utils/slots';
import { downloadBlob, renderAgendaImage, shareImage } from '../calendar/agendaImage';
import { MonthCalendar, type DayView } from '../calendar/MonthCalendar';
import { WeekAvailability } from '../calendar/WeekAvailability';
import { Button } from '../ui/Button';
import { friendlyError } from '../../services/firebase/errors';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { AvailabilityGate, BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  availability: ReturnType<typeof useAvailability>;
  month: string;
  setMonth: (month: string) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  weekAnchor: ISODate;
  setWeekAnchor: (date: ISODate) => void;
  onPick: (date: ISODate) => void;
}

export function StepDate({ draft, goTo, availability, month, setMonth, view, setView, weekAnchor, setWeekAnchor, onPick }: Props) {
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const { settings, days, status } = availability;
  const now = new Date();
  const today = zonedNow(settings?.timezone, now).date;

  const range = settings ? bookableRange(settings, now) : null;

  const describe = useMemo(() => {
    return (date: ISODate): DayView => {
      const label = formatDateLong(date);
      if (!settings) return { enabled: false, label };
      const a = dayAvailability(date, settings, days.get(date), now);
      switch (a.state) {
        case 'disponivel':
          return {
            enabled: true,
            className: 'is-available',
            label: `${label}: ${formatDuration(a.available)} ${a.available <= 60 ? 'livre' : 'livres'}`,
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
  }, [settings, days]);

  const freeThisMonth = useMemo(() => {
    if (status !== 'ready') return 0;
    const { first, last } = monthRange(month);
    let count = 0;
    for (let d = first; d <= last; d = addDays(d, 1)) if (describe(d).enabled) count++;
    return count;
  }, [describe, month, status]);

  const maxMonth = range ? monthOf(range.last) : undefined;
  const canGoNext = !!maxMonth && month < maxMonth;

  const week = useMemo(() => weekDates(weekAnchor), [weekAnchor]);
  const canWeekPrev = week[0] > today;
  const canWeekNext = !!range && week[6] < range.last;
  const freeThisWeek = useMemo(
    () => (status === 'ready' ? week.filter((d) => describe(d).enabled).length : 0),
    [describe, week, status],
  );

  function switchView(next: CalendarView) {
    if (next === view) return;
    if (next === 'mes') setMonth(monthOf(weekAnchor));
    else {
      const picked = draft.date && monthOf(draft.date) === month ? draft.date : null;
      setWeekAnchor(picked ?? (monthOf(today) === month ? today : `${month}-01`));
    }
    setView(next);
  }

  async function share() {
    if (!settings) return;
    setSharing(true);
    try {
      const dates = view === 'semana' ? week : monthCells(month).flat();
      const title = view === 'semana' ? formatWeekTitle(week) : formatMonth(month);
      const blob = await renderAgendaImage({ view, dates, month, title, settings, days, lastBookable: range?.last });
      const name = `agenda-muquifo-${view === 'semana' ? week[0] : month}.png`;
      if (!(await shareImage(blob, name, 'Agenda do Muquifo'))) {
        downloadBlob(blob, name);
        toast('Imagem da agenda baixada.');
      }
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <StepTitle>Escolha o dia</StepTitle>
      <p className="mq-wizard__lead">
        {view === 'semana'
          ? 'Veja os horários livres da semana e toque no dia que deseja agendar:'
          : 'Selecione a data que deseja agendar:'}
      </p>

      <AvailabilityGate status={status} error={availability.error} retry={availability.retry}>
        <div className="mq-view-switch">
          <div className="mq-view-switch__tabs" role="radiogroup" aria-label="Tipo de visualização">
            <button type="button" role="radio" aria-checked={view === 'semana'} onClick={() => switchView('semana')}>
              Semana
            </button>
            <button type="button" role="radio" aria-checked={view === 'mes'} onClick={() => switchView('mes')}>
              Mês
            </button>
          </div>
          <Button size="sm" icon={<Share2 size={16} aria-hidden="true" />} onClick={share} loading={sharing}>
            Compartilhar agenda
          </Button>
        </div>

        {view === 'semana' && settings ? (
          <>
            <div className="mq-week-nav">
              <button type="button" className="mq-icon-btn" onClick={() => setWeekAnchor(addDays(week[0], -7))} disabled={!canWeekPrev} aria-label="Semana anterior">
                <ChevronLeft size={20} />
              </button>
              <h4 aria-live="polite">{formatWeekTitle(week)}</h4>
              <button type="button" className="mq-icon-btn" onClick={() => setWeekAnchor(addDays(week[0], 7))} disabled={!canWeekNext} aria-label="Próxima semana">
                <ChevronRight size={20} />
              </button>
            </div>
            <WeekAvailability dates={week} settings={settings} days={days} today={today} selected={draft.date} onPick={onPick} />
          </>
        ) : (
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
        )}
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
        {view === 'semana' && freeThisWeek === 0 && status === 'ready' && (
          <EmptyState
            icon={CalendarX}
            title="Nenhum dia livre nesta semana"
            actions={
              canWeekNext && (
                <Button size="sm" onClick={() => setWeekAnchor(addDays(week[0], 7))}>
                  Ver próxima semana
                </Button>
              )
            }
          >
            {canWeekNext ? 'Tente a semana seguinte.' : 'Novos horários são liberados em breve. Volte mais tarde ou chame no WhatsApp.'}
          </EmptyState>
        )}
        {view === 'mes' && freeThisMonth === 0 && (
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
