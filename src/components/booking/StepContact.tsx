import { ArrowRight, MessageCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { createLead, updateLeadProgress } from '../../services/leads';
import { friendlyError, isPermissionDenied } from '../../services/firebase/errors';
import { maskPhone, validatePhone } from '../../utils/phone';
import { newSessionId, validateName } from '../../utils/text';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { Field } from '../ui/Field';
import { StepTitle, type StepProps } from './shared';

export function StepContact({ draft, update }: StepProps) {
  const [name, setName] = useState(draft.name);
  const [phone, setPhone] = useState(draft.whatsapp);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = validateName(name);
    const p = validatePhone(phone);
    setErrors({ name: n.ok ? undefined : n.error, phone: p.ok ? undefined : p.error });
    if (!n.ok || !p.ok) return;

    setName(n.value);
    setPhone(p.display);
    setSaving(true);
    setSaveError(null);
    const contact = { name: n.value, whatsapp: p.display, whatsappNormalized: p.normalized };
    let sessionId = draft.sessionId;
    try {
      if (draft.leadSaved) {
        try {
          await updateLeadProgress(sessionId, contact);
        } catch (err) {
          // Lead de outra sessão do navegador ou já assumido pelo estúdio: abre um novo.
          if (!isPermissionDenied(err)) throw err;
          sessionId = newSessionId();
          await createLead(sessionId, contact, draft.service);
        }
      } else {
        await createLead(sessionId, contact, draft.service);
      }
      update({ ...contact, sessionId, leadSaved: true, requestCreated: sessionId === draft.sessionId && draft.requestCreated, step: 'servico' });
    } catch (err) {
      setSaveError(
        isPermissionDenied(err)
          ? 'Não conseguimos registrar seu contato agora. Aguarde alguns segundos e tente de novo.'
          : friendlyError(err),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepTitle>Bora marcar?</StepTitle>
      <p className="mq-wizard__lead">Deixe seu contato antes de escolher seu horário.</p>

      <Field label="Nome" error={errors.name}>
        <input
          className="mq-input"
          type="text"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={80}
          placeholder="Como podemos te chamar?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field label="WhatsApp" error={errors.phone} hint="Com DDD. Usamos só para falar sobre o seu agendamento.">
        <input
          className="mq-input"
          type="tel"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(15) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          required
        />
      </Field>

      {saveError && (
        <Alert
          tone="error"
          title="Seu contato não foi registrado"
          actions={
            <ButtonLink
              size="sm"
              variant="ghost"
              href={studioWhatsappUrl('Olá! Gostaria de consultar horários no home studio.')}
              target="_blank"
              rel="noopener noreferrer"
              icon={<MessageCircle size={16} aria-hidden="true" />}
            >
              Falar direto pelo WhatsApp
            </ButtonLink>
          }
        >
          {saveError}
        </Alert>
      )}

      <div className="mq-wizard__footer">
        <Button type="submit" variant="primary" size="lg" loading={saving} iconRight={<ArrowRight size={18} aria-hidden="true" />}>
          Continuar
        </Button>
      </div>

       
    </form>
  );
}
