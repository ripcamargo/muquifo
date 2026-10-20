import { MessageCircle, Search, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { serviceInfo } from '../../config/studio';
import { STATUS_LABELS } from '../../config/status';
import { deleteBookingData } from '../../services/bookings';
import { friendlyError } from '../../services/firebase/errors';
import { markLeadsAbandoned, setLeadStatus } from '../../services/leads';
import type { BookingStep, Lead, LeadStatus } from '../../types';
import { formatTimestamp } from '../../utils/datetime';
import { formatNormalizedPhone } from '../../utils/phone';
import { firstName } from '../../utils/text';
import { whatsappUrl } from '../../utils/whatsapp';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';
import { useAdminData } from './AdminData';
import { LoadingCards } from './DashboardPage';

const STEP_LABELS: Record<BookingStep, string> = {
  contato: 'Contato',
  servico: 'Escolhendo serviço',
  data: 'Escolhendo dia',
  horario: 'Escolhendo horário',
  detalhes: 'Preenchendo detalhes',
  revisao: 'Revisando',
  enviado: 'Enviou pedido',
};

const INACTIVE_MS = 48 * 60 * 60 * 1000;
const OPEN: LeadStatus[] = ['novo', 'em_andamento'];

type Filter = 'todos' | 'sem_pedido' | 'com_pedido' | 'inativos';

export function LeadsPage() {
  const { leads, openRequest } = useAdminData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [confirm, setConfirm] = useState<{ kind: 'delete'; lead: Lead } | { kind: 'abandon' } | null>(null);
  const [busy, setBusy] = useState(false);

  const isInactive = (l: Lead) =>
    OPEN.includes(l.status) && Date.now() - (l.lastActivityAt?.getTime() ?? 0) > INACTIVE_MS;

  const inactive = useMemo(() => (leads ?? []).filter(isInactive), [leads]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return (leads ?? []).filter((l) => {
      if (filter === 'sem_pedido' && l.bookingRequestId) return false;
      if (filter === 'com_pedido' && !l.bookingRequestId) return false;
      if (filter === 'inativos' && !isInactive(l)) return false;
      if (!term) return true;
      return l.name.toLowerCase().includes(term) || (digits.length >= 3 && l.whatsappNormalized.includes(digits));
    });
  }, [leads, q, filter]);

  if (!leads) return <LoadingCards />;

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      toast(success);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <div className="adm-page-title">
        <div>
          <h1 className="mq-display">Leads</h1>
          <p>Todo mundo que deixou nome e WhatsApp, mesmo sem terminar o pedido.</p>
        </div>
        {inactive.length > 0 && (
          <Button size="sm" onClick={() => setConfirm({ kind: 'abandon' })}>
            Marcar {inactive.length} parados há 48h+ como abandonados
          </Button>
        )}
      </div>

      <div className="adm-filters adm-filters--2">
        <div className="mq-field adm-search">
          <label className="mq-field__label" htmlFor="l-q">
            Buscar
          </label>
          <Search size={18} aria-hidden="true" />
          <input
            id="l-q"
            className="mq-input"
            type="search"
            placeholder="Nome ou telefone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mq-field">
          <label className="mq-field__label" htmlFor="l-f">
            Mostrar
          </label>
          <select id="l-f" className="mq-input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="todos">Todos</option>
            <option value="sem_pedido">Sem pedido enviado</option>
            <option value="com_pedido">Com pedido</option>
            <option value="inativos">Parados há 48h+</option>
          </select>
        </div>
      </div>

      <p className="adm-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={leads.length ? 'Nenhum lead com esses filtros' : 'Nenhum lead ainda'} />
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Serviço</th>
              <th>Onde parou</th>
              <th>Última atividade</th>
              <th>Status</th>
              <th>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={{ cursor: l.bookingRequestId ? 'pointer' : 'default' }} onClick={() => l.bookingRequestId && openRequest(l.bookingRequestId)}>
                <td className="adm-table__primary" data-label="">
                  <div>
                    <div className="adm-table__name">{l.name}</div>
                    <div className="adm-table__sub">
                      {formatNormalizedPhone(l.whatsappNormalized)} · desde {formatTimestamp(l.createdAt)}
                    </div>
                  </div>
                </td>
                <td data-label="Serviço">
                  <span>{l.serviceType ? serviceInfo(l.serviceType).name : '—'}</span>
                </td>
                <td data-label="Onde parou">
                  <span>{STEP_LABELS[l.currentStep] ?? l.currentStep}</span>
                </td>
                <td data-label="Atividade">
                  <span>{formatTimestamp(l.lastActivityAt)}</span>
                </td>
                <td data-label="Status">
                  {l.bookingRequestId ? (
                    <span>
                      <StatusBadge status={l.status} />
                    </span>
                  ) : (
                    <select
                      className="mq-input"
                      style={{ minHeight: 40, fontSize: '0.875rem', maxWidth: 180 }}
                      value={l.status}
                      aria-label={`Status de ${l.name}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        run(() => setLeadStatus(l.id, e.target.value as LeadStatus), 'Status atualizado.')
                      }
                      disabled={busy}
                    >
                      {(['novo', 'em_andamento', 'abandonado'] as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td data-label="">
                  <span className="d-inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <a
                      className="mq-icon-btn"
                      href={whatsappUrl(l.whatsappNormalized, `Olá, ${firstName(l.name)}! Aqui é do Muquifo Home Studio. Vi que você começou um agendamento pelo site — posso ajudar?`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp de ${l.name}`}
                      title="Abrir conversa no WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                    <button
                      type="button"
                      className="mq-icon-btn"
                      onClick={() => setConfirm({ kind: 'delete', lead: l })}
                      aria-label={`Excluir dados de ${l.name}`}
                      title="Excluir dados"
                    >
                      <Trash2 size={18} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        title="Excluir dados?"
        confirmLabel="Excluir definitivamente"
        danger
        loading={busy}
        onConfirm={() => confirm?.kind === 'delete' && run(() => deleteBookingData(confirm.lead.id), 'Dados excluídos.')}
        onCancel={() => setConfirm(null)}
      >
        {confirm?.kind === 'delete' && (
          <>O lead de {confirm.lead.name} e o pedido ligado a ele (se houver) serão apagados. Não é possível desfazer.</>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.kind === 'abandon'}
        title="Marcar como abandonados?"
        confirmLabel="Marcar"
        loading={busy}
        onConfirm={() => run(() => markLeadsAbandoned(inactive.map((l) => l.id)), 'Leads atualizados.')}
        onCancel={() => setConfirm(null)}
      >
        {inactive.length} leads sem atividade há mais de 48 horas e sem pedido enviado serão marcados como “
        {STATUS_LABELS.abandonado}”.
      </ConfirmDialog>
    </>
  );
}
