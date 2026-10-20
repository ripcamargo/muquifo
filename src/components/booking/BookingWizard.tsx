import { useCallback, useEffect, useRef, useState } from 'react';
import { useAvailability } from '../../hooks/useAvailability';
import { useBookingDraft } from '../../hooks/useBookingDraft';
import { updateLeadProgress, type LeadProgress } from '../../services/leads';
import type { BookingStep, ISODate, ServiceType } from '../../types';
import { onBookingRequest, takePendingService } from '../../utils/bookingIntent';
import { monthOf, monthRange, zonedNow } from '../../utils/datetime';
import { firstName } from '../../utils/text';
import { StepContact } from './StepContact';
import { StepDate } from './StepDate';
import { StepDetails } from './StepDetails';
import { StepReview } from './StepReview';
import { StepSent } from './StepSent';
import { StepService } from './StepService';
import { StepTime } from './StepTime';

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 'contato', label: 'Contato' },
  { id: 'servico', label: 'Serviço' },
  { id: 'data', label: 'Dia' },
  { id: 'horario', label: 'Horário' },
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'revisao', label: 'Revisão' },
];

/** Fluxo guiado de agendamento. Carregado sob demanda (inclui o SDK do Firebase). */
export default function BookingWizard() {
  const { draft, restored, update, reset, dismissRestored } = useBookingDraft();
  const [month, setMonth] = useState(() => monthOf(draft.date ?? zonedNow().date));
  const [slotLost, setSlotLost] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Etapas que dependem de dados ainda não preenchidos voltam ao ponto certo (ex.: retomada).
  const step: BookingStep =
    draft.step !== 'contato' && !draft.leadSaved ? 'contato'
    : ['data', 'horario', 'detalhes', 'revisao'].includes(draft.step) && !draft.service ? 'servico'
    : ['horario', 'detalhes', 'revisao'].includes(draft.step) && !draft.date ? 'data'
    : ['detalhes', 'revisao'].includes(draft.step) && !draft.slot ? 'horario'
    : draft.step;

  const { first, last } = monthRange(month);
  const availability = useAvailability(first, last, step === 'data' || step === 'horario');

  // Atualiza o lead em segundo plano; falhas não travam o visitante (o envio final grava tudo).
  const syncLead = useCallback(
    (progress: LeadProgress) => {
      if (!draft.leadSaved) return;
      updateLeadProgress(draft.sessionId, progress).catch((err) => console.warn('Lead não atualizado', err));
    },
    [draft.leadSaved, draft.sessionId],
  );

  const goTo = useCallback((next: BookingStep) => update({ step: next }), [update]);

  // Ao trocar de etapa: foco no título (leitores de tela) e rolagem até o topo do card.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    if (root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    root.querySelector<HTMLElement>('[data-step-title]')?.focus({ preventScroll: true });
  }, [step]);

  const chooseService = useCallback(
    (service: ServiceType) => {
      update((d) => ({
        service,
        step: 'data',
        ...(d.service !== service ? { date: null, slot: null } : {}),
      }));
      syncLead({ serviceType: service, status: 'em_andamento', currentStep: 'data' });
    },
    [update, syncLead],
  );

  // CTAs da página ("Agendar ensaio", "Agendar gravação") pré-selecionam o serviço.
  useEffect(() => {
    const apply = (service?: ServiceType) => {
      if (!service) return;
      takePendingService();
      if (step === 'enviado') return;
      if (step === 'contato') update({ service });
      else if (step === 'servico' || draft.service !== service) chooseService(service);
    };
    apply(takePendingService());
    return onBookingRequest(apply);
  }, [step, draft.service, update, chooseService]);

  const pickDate = (date: ISODate) => {
    update((d) => ({ date, step: 'horario', ...(d.date !== date ? { slot: null } : {}) }));
    setSlotLost(false);
    syncLead({ currentStep: 'horario' });
  };

  const restart = () => {
    reset(true);
    setSlotLost(false);
  };

  const props = { draft, update, goTo };
  const index = STEPS.findIndex((s) => s.id === step);
  const current = STEPS[index];

  return (
    <div className="mq-wizard" ref={rootRef}>
      {restored && step !== 'enviado' && (
        <div className="mq-wizard__resume">
          <span>Continuando seu pedido{draft.name ? `, ${firstName(draft.name)}` : ''}.</span>
          <button type="button" className="mq-link-btn" onClick={() => { reset(); dismissRestored(); }}>
            Começar do zero
          </button>
        </div>
      )}

      {current && (
        <div className="mq-wizard__progress">
          <div className="mq-wizard__progress-text mq-label">
            <span>
              Etapa <strong>{index + 1}</strong> de {STEPS.length}
            </span>
            <strong>{current.label}</strong>
          </div>
          <div className="mq-wizard__bars" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
            ))}
          </div>
        </div>
      )}

      <div className="mq-wizard__body" aria-live="off">
        {step === 'contato' && <StepContact {...props} />}
        {step === 'servico' && <StepService {...props} onChoose={chooseService} />}
        {step === 'data' && (
          <StepDate {...props} availability={availability} month={month} setMonth={setMonth} onPick={pickDate} />
        )}
        {step === 'horario' && (
          <StepTime
            key={`${draft.date}-${slotLost}`}
            {...props}
            availability={availability}
            slotLost={slotLost}
            onContinue={() => {
              goTo('detalhes');
              syncLead({ currentStep: 'detalhes' });
            }}
          />
        )}
        {step === 'detalhes' && (
          <StepDetails
            {...props}
            onContinue={() => {
              goTo('revisao');
              syncLead({ currentStep: 'revisao' });
            }}
          />
        )}
        {step === 'revisao' && (
          <StepReview
            {...props}
            onSlotLost={() => {
              setSlotLost(true);
              setMonth(monthOf(draft.date!));
              goTo('horario');
            }}
          />
        )}
        {step === 'enviado' && <StepSent {...props} onRestart={restart} />}
      </div>
    </div>
  );
}
