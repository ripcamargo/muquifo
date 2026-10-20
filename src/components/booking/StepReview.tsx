import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { serviceInfo } from '../../config/studio';
import { fetchAvailabilityFresh } from '../../services/availability';
import { submitBookingRequest } from '../../services/bookings';
import { friendlyError } from '../../services/firebase/errors';
import type { BookingStep } from '../../types';
import { formatDateLong, formatTimeRange } from '../../utils/datetime';
import { generateSlots } from '../../utils/slots';
import { cleanMultiline, collapseSpaces } from '../../utils/text';
import { buildBookingMessage, studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { BackButton, StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  onSlotLost: () => void;
}

export function StepReview({ draft, update, goTo, onSlotLost }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = draft.service!;
  const date = draft.date!;
  const slot = draft.slot!;
  const info = serviceInfo(service);

  const projectName = collapseSpaces(draft.projectName).slice(0, 120);
  const description = info.fields.askDescription ? cleanMultiline(draft.description, 1000) : '';
  const notes = cleanMultiline(draft.notes, 1000);
  const peopleCount = info.fields.askPeople && draft.peopleCount ? Number(draft.peopleCount) : null;

  const rows: { label: string; value: string; step: BookingStep }[] = [
    { label: 'Nome', value: draft.name, step: 'contato' },
    { label: 'WhatsApp', value: draft.whatsapp, step: 'contato' },
    { label: 'Serviço', value: info.name, step: 'servico' },
    { label: 'Data', value: formatDateLong(date), step: 'data' },
    { label: 'Horário', value: formatTimeRange(slot.start, slot.end), step: 'horario' },
  ];
  if (projectName) rows.push({ label: info.fields.projectLabel, value: projectName, step: 'detalhes' });
  if (peopleCount) rows.push({ label: 'Pessoas', value: String(peopleCount), step: 'detalhes' });
  if (description) rows.push({ label: info.fields.descriptionLabel ?? 'Descrição', value: description, step: 'detalhes' });
  if (notes) rows.push({ label: 'Observações', value: notes, step: 'detalhes' });

  async function send() {
    if (sending) return;
    setSending(true);
    setError(null);

    // A aba precisa ser aberta no clique; depois de operações assíncronas o navegador bloqueia.
    const win = window.open('', '_blank');
    if (win) {
      win.opener = null;
      win.document.title = 'Abrindo o WhatsApp…';
      win.document.body.style.cssText = 'background:#120d0f;color:#ece7d3;font:16px system-ui;padding:24px';
      win.document.body.textContent = 'Abrindo o WhatsApp…';
    }

    try {
      // 1. Confere de novo, direto no servidor, se o horário segue livre.
      const fresh = await fetchAvailabilityFresh(date);
      const current = fresh.settings
        ? generateSlots(date, service, fresh.settings, fresh.day).find((s) => s.start === slot.start && s.end === slot.end)
        : undefined;
      if (!current || current.state !== 'disponivel') {
        win?.close();
        update({ slot: null });
        onSlotLost();
        return;
      }
    } catch (err) {
      win?.close();
      setError(friendlyError(err));
      setSending(false);
      return;
    }

    // 2. Registra o pedido como "preparado para envio" (não é uma reserva).
    let saveFailed = false;
    try {
      await submitBookingRequest(
        {
          leadId: draft.sessionId,
          name: draft.name,
          whatsapp: draft.whatsapp,
          whatsappNormalized: draft.whatsappNormalized,
          serviceType: service,
          projectName,
          peopleCount,
          description,
          notes,
          requestedDate: date,
          startTime: slot.start,
          endTime: slot.end,
        },
        draft.requestCreated,
      );
    } catch (err) {
      console.warn('Falha ao registrar o pedido', err);
      saveFailed = true;
    }

    // 3. Abre o WhatsApp com a mensagem pronta. O envio de fato acontece no app.
    const url = studioWhatsappUrl(
      buildBookingMessage({
        name: draft.name,
        whatsapp: draft.whatsapp,
        service,
        date,
        start: slot.start,
        end: slot.end,
        projectName,
        peopleCount,
        description,
        notes,
      }),
    );
    if (win && !win.closed) win.location.href = url;

    update({
      step: 'enviado',
      sentUrl: url,
      sentSaveFailed: saveFailed,
      requestCreated: draft.requestCreated || !saveFailed,
    });
  }

  return (
    <div>
      <StepTitle>Confere aí</StepTitle>
      <p className="mq-wizard__lead">Revise o pedido antes de enviar. Toque em “alterar” para corrigir.</p>

      <dl className="mq-summary">
        {rows.map((r) => (
          <div className="mq-summary__row" key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
            <button type="button" className="mq-link-btn mq-summary__edit" onClick={() => goTo(r.step)} aria-label={`Alterar ${r.label.toLowerCase()}`}>
              alterar
            </button>
          </div>
        ))}
      </dl>

      <Alert tone="info" title="Isto é um pedido, não uma reserva">
        O horário só fica garantido depois que o estúdio confirmar pelo WhatsApp.
      </Alert>

      {error && (
        <Alert tone="error" title="Não foi possível enviar agora" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mq-wizard__footer">
        <BackButton onClick={() => goTo('detalhes')} />
        <Button variant="primary" size="lg" onClick={send} loading={sending} icon={<MessageCircle size={18} aria-hidden="true" />}>
          Enviar pedido pelo WhatsApp
        </Button>
      </div>
    </div>
  );
}
