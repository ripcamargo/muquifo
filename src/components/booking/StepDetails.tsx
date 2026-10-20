import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { serviceInfo } from '../../config/studio';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  onContinue: () => void;
}

export function StepDetails({ draft, update, goTo, onContinue }: Props) {
  const info = serviceInfo(draft.service!);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (info.fields.askPeople && draft.peopleCount) {
      const n = Number(draft.peopleCount);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        setPeopleError('Informe um número entre 1 e 50, ou deixe em branco.');
        return;
      }
    }
    setPeopleError(null);
    onContinue();
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepTitle>Conta mais um pouco</StepTitle>
      <p className="mq-wizard__lead">Tudo aqui é opcional — ajuda o estúdio a preparar a sala.</p>

      <Field label={info.fields.projectLabel} note="opcional">
        <input
          className="mq-input"
          type="text"
          maxLength={120}
          value={draft.projectName}
          onChange={(e) => update({ projectName: e.target.value })}
        />
      </Field>

      {info.fields.askPeople && (
        <Field label="Quantas pessoas?" note="opcional" error={peopleError}>
          <input
            className="mq-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={draft.peopleCount}
            onChange={(e) => update({ peopleCount: e.target.value.replace(/\D/g, '').slice(0, 2) })}
          />
        </Field>
      )}

      {info.fields.askDescription && (
        <Field label={info.fields.descriptionLabel ?? 'Descrição'} note="opcional" hint={info.fields.descriptionHint}>
          <textarea
            className="mq-input"
            maxLength={1000}
            rows={3}
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>
      )}

      <Field label="Observações" note="opcional">
        <textarea
          className="mq-input"
          maxLength={1000}
          rows={3}
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </Field>

      <div className="mq-wizard__footer">
        <BackButton onClick={() => goTo('horario')} />
        <Button type="submit" variant="primary" size="lg" iconRight={<ArrowRight size={18} aria-hidden="true" />}>
          Revisar pedido
        </Button>
      </div>
    </form>
  );
}
