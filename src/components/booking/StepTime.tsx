import { ArrowRight, Ban, CalendarDays, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { serviceInfo } from '../../config/studio';
import type { useAvailability } from '../../hooks/useAvailability';
import type { HHMM } from '../../types';
import { formatDateLong, formatDuration, formatTime, formatTimeRange, minutesToTime, timeToMinutes } from '../../utils/datetime';
import { dayTimeline, durationOptions, freePeriods, isBookable, startTimes } from '../../utils/slots';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { DayTimeline } from './DayTimeline';
import { AvailabilityGate, BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  availability: ReturnType<typeof useAvailability>;
  onContinue: () => void;
  /** Avisa que o período escolhido foi perdido na verificação final do envio. */
  slotLost?: boolean;
}

export function StepTime({ draft, update, goTo, availability, onContinue, slotLost }: Props) {
  const { settings, days, status } = availability;
  const service = draft.service!;
  const date = draft.date!;
  const day = days.get(date);
  const [lostNotice, setLostNotice] = useState(!!slotLost);

  const { periods, starts, timeline } = useMemo(() => {
    if (!settings) return { periods: [], starts: [], timeline: [] };
    return {
      periods: freePeriods(date, settings, day),
      starts: startTimes(date, settings, day),
      timeline: dayTimeline(date, settings, day),
    };
  }, [settings, day, date]);

  const selected = draft.slot;
  const durations = useMemo(
    () => (settings && selected ? durationOptions(date, selected.start, settings, day) : []),
    [settings, day, date, selected],
  );
  const currentDuration = selected ? timeToMinutes(selected.end) - timeToMinutes(selected.start) : 0;

  // Se o período escolhido deixar de estar livre enquanto a pessoa decide, desmarca e avisa.
  useEffect(() => {
    if (status !== 'ready' || !settings || !selected) return;
    if (!isBookable(date, selected, settings, day)) {
      update({ slot: null });
      setLostNotice(true);
    }
  }, [status, settings, day, date, selected, update]);

  const choose = (start: HHMM, duration: number) => {
    setLostNotice(false);
    update({ slot: { start, end: minutesToTime(timeToMinutes(start) + duration) } });
  };

  const pickStart = (start: HHMM) => {
    if (!settings) return;
    const options = durationOptions(date, start, settings, day);
    // Mantém a duração escolhida se ainda couber; senão, a maior possível até ela.
    const keep = options.filter((d) => d <= (currentDuration || options[0])).pop() ?? options[0];
    choose(start, keep);
  };

  const rules = settings?.booking;

  return (
    <div>
      <StepTitle>Escolha o horário</StepTitle>
      <div className="mq-picked">
        <button type="button" className="mq-picked__chip" onClick={() => goTo('data')} aria-label="Trocar o dia">
          <CalendarDays size={16} aria-hidden="true" /> {formatDateLong(date)}
        </button>
        <button type="button" className="mq-picked__chip" onClick={() => goTo('servico')} aria-label="Trocar o serviço">
          {serviceInfo(service).name}
        </button>
      </div>

      {lostNotice && (
        <Alert tone="warning" title="Esse horário acabou de ficar indisponível" className="mb-3">
          Alguém reservou antes ou o estúdio fechou o período. Escolha outro horário abaixo.
        </Alert>
      )}

      <AvailabilityGate status={status} error={availability.error} retry={availability.retry}>
        {periods.length === 0 ? (
          <EmptyState
            icon={Ban}
            title="Sem período livre neste dia"
            actions={
              <Button size="sm" onClick={() => goTo('data')}>
                Escolher outro dia
              </Button>
            }
          />
        ) : (
          <>
            <section className="mq-time-block" aria-labelledby="livre-title">
              <h4 id="livre-title" className="mq-time-block__title mq-label">
                Livre neste dia
              </h4>
              <DayTimeline segments={timeline} />
              <p className="mq-free-list">
                {periods.map((p) => formatTimeRange(p.start, p.end)).join(' · ')}
              </p>
            </section>

            <fieldset className="mq-time-block">
              <legend className="mq-time-block__title mq-label">Começar às</legend>
              <div className="mq-chips" role="radiogroup" aria-label="Horário de início">
                {starts.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected?.start === t}
                    className="mq-chip"
                    onClick={() => pickStart(t)}
                  >
                    {formatTime(t)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mq-time-block" disabled={!selected}>
              <legend className="mq-time-block__title mq-label">Por quanto tempo?</legend>
              {selected ? (
                <div className="mq-chips" role="radiogroup" aria-label="Duração">
                  {durations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={d === currentDuration}
                      className="mq-chip"
                      onClick={() => choose(selected.start, d)}
                    >
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mq-muted mb-0">Escolha primeiro o horário de início.</p>
              )}
              {rules && (
                <p className="mq-field__hint mt-2 mb-0">
                  Reservas de {formatDuration(rules.minDurationMin)} a {formatDuration(rules.maxDurationMin)}.
                </p>
              )}
            </fieldset>

            {selected && (
              <p className="mq-time-summary" role="status">
                <Clock size={18} aria-hidden="true" />
                <span>
                  Sua reserva: <strong>{formatTimeRange(selected.start, selected.end)}</strong> · {formatDuration(currentDuration)}
                </span>
              </p>
            )}
          </>
        )}
      </AvailabilityGate>

      <div className="mq-wizard__footer">
        <BackButton onClick={() => goTo('data')} />
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          onClick={onContinue}
          iconRight={<ArrowRight size={18} aria-hidden="true" />}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
