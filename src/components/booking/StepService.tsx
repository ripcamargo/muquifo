import { ArrowRight, Check } from 'lucide-react';
import { services } from '../../config/studio';
import type { ServiceType } from '../../types';
import { Button } from '../ui/Button';
import { BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  onChoose: (service: ServiceType) => void;
}

export function StepService({ draft, goTo, onChoose }: Props) {
  return (
    <div>
      <StepTitle>O que vai ser?</StepTitle>
      <p className="mq-wizard__lead">Escolha o tipo de sessão. Os horários mudam conforme o serviço.</p>

      <div className="mq-choice-list" role="radiogroup" aria-label="Serviço">
        {services.map((s) => {
          const checked = draft.service === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={checked}
              className="mq-choice"
              onClick={() => onChoose(s.id)}
            >
              <span className="mq-choice__icon" aria-hidden="true">
                <s.icon size={24} />
              </span>
              <span className="mq-choice__text">
                <strong>{s.name}</strong>
                <small>{s.audience}</small>
              </span>
              <span className="mq-choice__check" aria-hidden="true">
                {checked && <Check size={18} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mq-wizard__footer">
        <BackButton onClick={() => goTo('contato')} />
        {draft.service && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => onChoose(draft.service!)}
            iconRight={<ArrowRight size={18} aria-hidden="true" />}
          >
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
