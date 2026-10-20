import { ArrowRight, Ban, CalendarDays, Check, Clock, Hourglass } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { serviceInfo } from '../../config/studio';
import type { useAvailability } from '../../hooks/useAvailability';
import type { Slot } from '../../types';
import { formatDateLong, formatDuration, formatTime } from '../../utils/datetime';
import { generateSlots } from '../../utils/slots';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { AvailabilityGate, BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  availability: ReturnType<typeof useAvailability>;
  onContinue: () => void;
  /** Avisa que o horário escolhido foi perdido na verificação final do envio. */
  slotLost?: boolean;
}

const STATE_TEXT: Record<Slot['state'], string> = {
  disponivel: 'Disponível',
  em_analise: 'Em análise',
  ocupado: 'Ocupado',
};

export function StepTime({ draft, update, goTo, availability, onContinue, slotLost }: Props) {
  const { settings, days, status } = availability;
  const service = draft.service!;
  const date = draft.date!;
  const [lostNotice, setLostNotice] = useState(!!slotLost);

  const slots = useMemo(
    () => (settings ? generateSlots(date, service, settings, days.get(date)) : []),
    [settings, days, date, service],
  );

  // Se o horário escolhido deixar de estar livre enquanto a pessoa decide, desmarca e avisa.
  const selected = draft.slot;
  useEffect(() => {
    if (status !== 'ready' || !selected) return;
    const current = slots.find((s) => s.start === selected.start && s.end === selected.end);
    if (!current || current.state !== 'disponivel') {
      update({ slot: null });
      setLostNotice(true);
    }
  }, [slots, status, selected, update]);

  const duration = settings?.services[service].durationMin ?? 0;
  const available = slots.filter((s) => s.state === 'disponivel');

  return (
    <div>
      <StepTitle>Escolha o horário</StepTitle>
      <div className="mq-picked">
        <button type="button" className="mq-picked__chip" onClick={() => goTo('data')} aria-label="Trocar o dia">
          <CalendarDays size={16} aria-hidden="true" /> {formatDateLong(date)}
        </button>
        {duration > 0 && (
          <span className="mq-picked__chip" style={{ cursor: 'default' }}>
            <Clock size={16} aria-hidden="true" /> {serviceInfo(service).name} · {formatDuration(duration)}
          </span>
        )}
      </div>

      {lostNotice && (
        <Alert tone="warning" title="Esse horário acabou de ficar indisponível" className="mb-3">
          Alguém reservou antes ou o estúdio fechou o período. Escolha outro horário abaixo.
        </Alert>
      )}

      <AvailabilityGate status={status} error={availability.error} retry={availability.retry}>
        {available.length === 0 ? (
          <EmptyState
            icon={Ban}
            title="Sem horários livres neste dia"
            actions={
              <Button size="sm" onClick={() => goTo('data')}>
                Escolher outro dia
              </Button>
            }
          />
        ) : null}
        {slots.length > 0 && (
          <div className="mq-slots" role="group" aria-label="Horários">
            {slots.map((s) => {
              const isSelected = selected?.start === s.start && selected?.end === s.end;
              const free = s.state === 'disponivel';
              return (
                <button
                  key={s.start}
                  type="button"
                  className={`mq-slot ${s.state === 'em_analise' ? 'is-hold' : ''}`}
                  disabled={!free}
                  aria-pressed={isSelected}
                  aria-label={`${formatTime(s.start)} às ${formatTime(s.end)}: ${isSelected ? 'selecionado' : STATE_TEXT[s.state]}`}
                  onClick={() => {
                    setLostNotice(false);
                    update({ slot: { start: s.start, end: s.end } });
                  }}
                >
                  <span className="mq-slot__time">
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </span>
                  <span className="mq-slot__state">
                    {isSelected ? <Check size={13} aria-hidden="true" /> : s.state === 'em_analise' ? <Hourglass size={13} aria-hidden="true" /> : null}
                    {isSelected ? 'Selecionado' : STATE_TEXT[s.state]}
                  </span>
                </button>
              );
            })}
          </div>
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
