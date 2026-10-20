import { Copy, MessageCircle, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { serviceInfo } from '../../config/studio';
import { REQUEST_STATUS_FLOW, STATUS_HINTS, STATUS_LABELS } from '../../config/status';
import { useModal } from '../../hooks/useModal';
import { changeRequestStatus, deleteBookingData, saveRequestAdminNotes, SlotConflictError } from '../../services/bookings';
import { friendlyError } from '../../services/firebase/errors';
import type { BookingRequest, RequestStatus } from '../../types';
import { copyText } from '../../utils/clipboard';
import { formatDateLong, formatDateWithWeekday, formatTimeRange, formatTimestamp } from '../../utils/datetime';
import { formatNormalizedPhone } from '../../utils/phone';
import { firstName } from '../../utils/text';
import { whatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';
import { useAdminData } from './AdminData';

/** Status que liberam o horário e por isso pedem confirmação. */
const RELEASING: RequestStatus[] = ['recusado', 'cancelado', 'abandonado'];

export function clientMessage(r: BookingRequest): string {
  return `Olá, ${firstName(r.name)}! Aqui é do Muquifo Home Studio, sobre o seu pedido de ${serviceInfo(r.serviceType).name.toLowerCase()} para ${formatDateLong(r.requestedDate)}, das ${formatTimeRange(r.startTime, r.endTime)}.`;
}

export function requestSummary(r: BookingRequest): string {
  return [
    `Pedido de ${serviceInfo(r.serviceType).name}`,
    `Nome: ${r.name}`,
    `WhatsApp: ${formatNormalizedPhone(r.whatsappNormalized)}`,
    `Data: ${formatDateWithWeekday(r.requestedDate)}`,
    `Horário: ${formatTimeRange(r.startTime, r.endTime)}`,
    r.projectName && `Projeto/banda: ${r.projectName}`,
    r.peopleCount && `Pessoas: ${r.peopleCount}`,
    r.description && `${serviceInfo(r.serviceType).fields.descriptionShort ?? 'Descrição'}: ${r.description}`,
    r.notes && `Observações: ${r.notes}`,
    `Status: ${STATUS_LABELS[r.status]}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function RequestDrawer() {
  const { requests, openRequestId, openRequest } = useAdminData();
  const request = requests?.find((r) => r.id === openRequestId) ?? null;
  const close = () => openRequest(null);
  const ref = useModal<HTMLDivElement>(!!request, close);

  if (!request) return null;
  return (
    <div className="adm-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <RequestDetail key={request.id} request={request} onClose={close} />
      </div>
    </div>
  );
}

function RequestDetail({ request: r, onClose }: { request: BookingRequest; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<RequestStatus | 'delete' | 'notes' | null>(null);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<RequestStatus | 'delete' | null>(null);
  const [notes, setNotes] = useState(r.adminNotes);


  async function setStatus(next: RequestStatus) {
    setBusy(next);
    setConflicts(null);
    try {
      await changeRequestStatus(r.id, next);
      toast(`Status alterado para “${STATUS_LABELS[next]}”.`);
    } catch (err) {
      if (err instanceof SlotConflictError) setConflicts(err.conflicts);
      else toast(friendlyError(err), 'error');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  async function saveNotes() {
    setBusy('notes');
    try {
      await saveRequestAdminNotes(r.id, notes);
      toast('Anotação salva.');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    try {
      await deleteBookingData(r.leadId);
      toast('Dados excluídos.');
      onClose();
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(null);
      setConfirm(null);
    }
  }

  const info = serviceInfo(r.serviceType);

  return (
    <>
      <div className="adm-drawer__head">
        <div>
          <h2 id="drawer-title" className="mq-display">
            {r.name}
          </h2>
          <StatusBadge status={r.status} />
        </div>
        <button type="button" className="mq-icon-btn" onClick={onClose} aria-label="Fechar detalhes">
          <X size={22} />
        </button>
      </div>

      <div className="adm-drawer__body">
        <section className="adm-drawer__section">
          <div className="adm-drawer__actions">
            <ButtonLink
              variant="primary"
              size="sm"
              href={whatsappUrl(r.whatsappNormalized, clientMessage(r))}
              target="_blank"
              rel="noopener noreferrer"
              icon={<MessageCircle size={16} aria-hidden="true" />}
            >
              Conversar no WhatsApp
            </ButtonLink>
            <Button
              size="sm"
              icon={<Copy size={16} aria-hidden="true" />}
              onClick={async () => {
                const ok = await copyText(requestSummary(r));
                toast(ok ? 'Dados copiados.' : 'Não foi possível copiar.', ok ? 'success' : 'error');
              }}
            >
              Copiar dados
            </Button>
          </div>
        </section>

        <section className="adm-drawer__section">
          <h3>Pedido</h3>
          <dl className="adm-dl">
            <dt>Serviço</dt>
            <dd>{info.name}</dd>
            <dt>Data</dt>
            <dd>{formatDateLong(r.requestedDate)}</dd>
            <dt>Horário</dt>
            <dd>{formatTimeRange(r.startTime, r.endTime)}</dd>
            <dt>WhatsApp</dt>
            <dd>{formatNormalizedPhone(r.whatsappNormalized)}</dd>
            {r.projectName && (
              <>
                <dt>{info.fields.projectLabel}</dt>
                <dd>{r.projectName}</dd>
              </>
            )}
            {r.peopleCount && (
              <>
                <dt>Pessoas</dt>
                <dd>{r.peopleCount}</dd>
              </>
            )}
            {r.description && (
              <>
                <dt>{info.fields.descriptionShort ?? 'Descrição'}</dt>
                <dd>{r.description}</dd>
              </>
            )}
            {r.notes && (
              <>
                <dt>Observações</dt>
                <dd>{r.notes}</dd>
              </>
            )}
            <dt>Recebido</dt>
            <dd>{formatTimestamp(r.createdAt)}</dd>
            <dt>Atualizado</dt>
            <dd>{formatTimestamp(r.updatedAt)}</dd>
            {r.confirmedAt && (
              <>
                <dt>Confirmado</dt>
                <dd>{formatTimestamp(r.confirmedAt)}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="adm-drawer__section">
          <h3>Status</h3>
          <p className="mq-muted" style={{ fontSize: '0.875rem' }}>
            {STATUS_HINTS[r.status]}
          </p>
          {conflicts && (
            <Alert tone="error" title="Não dá para confirmar: o horário não está livre" className="mb-3">
              <ul className="mb-0 ps-3">
                {conflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              Combine outro horário com o cliente ou libere o conflito na agenda.
            </Alert>
          )}
          <div className="adm-status-grid">
            {REQUEST_STATUS_FLOW.map((s) => (
              <Button
                key={s}
                size="sm"
                aria-pressed={r.status === s}
                disabled={r.status === s || busy !== null}
                loading={busy === s}
                onClick={() => (RELEASING.includes(s) ? setConfirm(s) : setStatus(s))}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </section>

        <section className="adm-drawer__section">
          <h3>Anotações internas</h3>
          <textarea
            className="mq-input"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Anotações internas"
          />
          <div className="mt-2">
            <Button size="sm" onClick={saveNotes} loading={busy === 'notes'} disabled={notes === r.adminNotes}>
              Salvar anotação
            </Button>
          </div>
        </section>

        <section className="adm-drawer__section">
          <h3>Dados pessoais</h3>
          <Button variant="danger" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('delete')}>
            Excluir lead e pedido
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Excluir dados?"
        confirmLabel="Excluir definitivamente"
        danger
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      >
        O lead e o pedido de {r.name} serão apagados e o horário liberado na agenda. Não é possível desfazer.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm !== null && confirm !== 'delete'}
        title={confirm && confirm !== 'delete' ? `Marcar como “${STATUS_LABELS[confirm]}”?` : ''}
        confirmLabel="Confirmar"
        danger
        loading={busy !== null && busy !== 'notes'}
        onConfirm={() => confirm && confirm !== 'delete' && setStatus(confirm)}
        onCancel={() => setConfirm(null)}
      >
        O horário de {formatDateLong(r.requestedDate)} ({formatTimeRange(r.startTime, r.endTime)}) volta a ficar livre na agenda.
      </ConfirmDialog>
    </>
  );
}
