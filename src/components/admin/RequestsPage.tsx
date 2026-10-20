import { Inbox, MessageCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { serviceInfo } from '../../config/studio';
import { ACTIVE_REQUEST_STATUSES, REQUEST_STATUS_FLOW, STATUS_LABELS } from '../../config/status';
import type { BookingRequest, RequestStatus } from '../../types';
import { formatDateShort, formatTimeRange, formatTimestamp, WEEKDAY_SHORT, weekdayOf } from '../../utils/datetime';
import { formatNormalizedPhone } from '../../utils/phone';
import { whatsappUrl } from '../../utils/whatsapp';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { useAdminData } from './AdminData';
import { LoadingCards } from './DashboardPage';
import { clientMessage } from './RequestDrawer';

type StatusFilter = 'todos' | 'ativos' | RequestStatus;
type Sort = 'recebido' | 'sessao_asc' | 'sessao_desc';

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function RequestsPage() {
  const { requests, openRequest } = useAdminData();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<Sort>('recebido');

  const filtered = useMemo(() => {
    if (!requests) return [];
    const term = normalize(q.trim());
    const digits = q.replace(/\D/g, '');
    const list = requests.filter((r) => {
      if (status === 'ativos' && !ACTIVE_REQUEST_STATUSES.includes(r.status)) return false;
      if (status !== 'ativos' && status !== 'todos' && r.status !== status) return false;
      if (from && r.requestedDate < from) return false;
      if (to && r.requestedDate > to) return false;
      if (!term) return true;
      return (
        normalize(r.name).includes(term) ||
        normalize(r.projectName).includes(term) ||
        (digits.length >= 3 && r.whatsappNormalized.includes(digits))
      );
    });
    const key = (r: BookingRequest) => r.requestedDate + r.startTime;
    return list.sort((a, b) =>
      sort === 'recebido'
        ? (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        : sort === 'sessao_asc'
          ? key(a).localeCompare(key(b))
          : key(b).localeCompare(key(a)),
    );
  }, [requests, q, status, from, to, sort]);

  if (!requests) return <LoadingCards />;

  return (
    <>
      <div className="adm-page-title">
        <div>
          <h1 className="mq-display">Pedidos</h1>
          <p>Toque num pedido para ver detalhes, mudar o status ou chamar no WhatsApp.</p>
        </div>
      </div>

      <div className="adm-filters">
        <div className="mq-field adm-search">
          <label className="mq-field__label" htmlFor="f-q">
            Buscar
          </label>
          <Search size={18} aria-hidden="true" />
          <input
            id="f-q"
            className="mq-input"
            type="search"
            placeholder="Nome, projeto ou telefone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mq-field">
          <label className="mq-field__label" htmlFor="f-status">
            Status
          </label>
          <select id="f-status" className="mq-input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="todos">Todos</option>
            <option value="ativos">Aguardando ação</option>
            {REQUEST_STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="mq-field">
          <label className="mq-field__label" htmlFor="f-from">
            Sessão de
          </label>
          <input id="f-from" className="mq-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="mq-field">
          <label className="mq-field__label" htmlFor="f-to">
            até
          </label>
          <input id="f-to" className="mq-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="mq-field">
          <label className="mq-field__label" htmlFor="f-sort">
            Ordenar
          </label>
          <select id="f-sort" className="mq-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recebido">Recebidos (recentes)</option>
            <option value="sessao_asc">Data da sessão ↑</option>
            <option value="sessao_desc">Data da sessão ↓</option>
          </select>
        </div>
      </div>

      <p className="adm-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'pedido' : 'pedidos'}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title={requests.length ? 'Nenhum pedido com esses filtros' : 'Nenhum pedido ainda'} />
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Sessão</th>
              <th>Recebido</th>
              <th>Status</th>
              <th>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => openRequest(r.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openRequest(r.id))}
                tabIndex={0}
                aria-label={`Abrir pedido de ${r.name}`}
              >
                <td className="adm-table__primary" data-label="">
                  <div>
                    <div className="adm-table__name">{r.name}</div>
                    <div className="adm-table__sub">{formatNormalizedPhone(r.whatsappNormalized)}</div>
                  </div>
                </td>
                <td data-label="Serviço">
                  <span>{serviceInfo(r.serviceType).name}</span>
                </td>
                <td data-label="Sessão">
                  <span>
                    {WEEKDAY_SHORT[weekdayOf(r.requestedDate)]} {formatDateShort(r.requestedDate)} ·{' '}
                    {formatTimeRange(r.startTime, r.endTime)}
                  </span>
                </td>
                <td data-label="Recebido">
                  <span>{formatTimestamp(r.createdAt)}</span>
                </td>
                <td data-label="Status">
                  <span>
                    <StatusBadge status={r.status} />
                  </span>
                </td>
                <td data-label="">
                  <a
                    className="mq-icon-btn"
                    href={whatsappUrl(r.whatsappNormalized, clientMessage(r))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`WhatsApp de ${r.name}`}
                    title="Abrir conversa no WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
