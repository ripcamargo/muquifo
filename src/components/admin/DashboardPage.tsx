import { CalendarCheck, Inbox, Users } from 'lucide-react';
import { Link } from 'react-router';
import { serviceInfo } from '../../config/studio';
import { ACTIVE_REQUEST_STATUSES } from '../../config/status';
import type { BookingRequest } from '../../types';
import { formatTimeRange, formatTimestamp, WEEKDAY_SHORT, weekdayOf, zonedNow } from '../../utils/datetime';
import { formatNormalizedPhone } from '../../utils/phone';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { useAdminData } from './AdminData';

export function DashboardPage() {
  const { requests, leads, openRequest } = useAdminData();
  const today = zonedNow().date;
  const weekAgo = Date.now() - 7 * 86_400_000;

  if (!requests || !leads) return <LoadingCards />;

  const pending = requests
    .filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status))
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  const upcoming = requests
    .filter((r) => r.status === 'confirmado' && r.requestedDate >= today)
    .sort((a, b) => (a.requestedDate + a.startTime).localeCompare(b.requestedDate + b.startTime));
  const recentLeads = leads.filter((l) => (l.createdAt?.getTime() ?? 0) >= weekAgo);

  return (
    <>
      <div className="adm-page-title">
        <div>
          <h1 className="mq-display">Visão geral</h1>
          <p>O que precisa da sua atenção agora.</p>
        </div>
      </div>

      <div className="adm-kpis">
        <Kpi label="Pedidos recebidos" value={requests.length} hint="Total registrado pelo site" />
        <Kpi label="Aguardando você" value={pending.length} hint="Preparados ou em análise" alert={pending.length > 0} />
        <Kpi label="Confirmados" value={upcoming.length} hint="Próximas sessões" />
        <Kpi label="Leads (7 dias)" value={recentLeads.length} hint="Contatos deixados no site" />
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card__head">
            <h2>Pedidos para responder</h2>
            <Link to="/admin/pedidos" className="mq-label">
              Ver todos
            </Link>
          </div>
          {pending.length ? (
            <RequestList items={pending.slice(0, 6)} onOpen={openRequest} showStatus />
          ) : (
            <EmptyState icon={Inbox} title="Nada pendente">
              Novos pedidos aparecem aqui assim que o visitante clica em enviar.
            </EmptyState>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h2>Próximas sessões</h2>
          </div>
          {upcoming.length ? (
            <RequestList items={upcoming.slice(0, 6)} onOpen={openRequest} />
          ) : (
            <EmptyState icon={CalendarCheck} title="Nenhuma sessão confirmada" />
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h2>Leads recentes</h2>
            <Link to="/admin/leads" className="mq-label">
              Ver todos
            </Link>
          </div>
          {leads.length ? (
            <ul className="adm-list">
              {leads.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <div className="adm-list__item" style={{ cursor: 'default' }}>
                    <div className="adm-list__body">
                      <div className="adm-list__title">{l.name}</div>
                      <div className="adm-list__meta">
                        {formatNormalizedPhone(l.whatsappNormalized)} · {formatTimestamp(l.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Nenhum lead ainda" />
          )}
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, alert }: { label: string; value: number; hint: string; alert?: boolean }) {
  return (
    <div className={`adm-kpi ${alert ? 'adm-kpi--alert' : ''}`}>
      <div className="mq-label mq-muted">{label}</div>
      <div className="adm-kpi__value">{value}</div>
      <div className="adm-kpi__hint">{hint}</div>
    </div>
  );
}

export function RequestList({
  items,
  onOpen,
  showStatus,
}: {
  items: BookingRequest[];
  onOpen: (id: string) => void;
  showStatus?: boolean;
}) {
  return (
    <ul className="adm-list">
      {items.map((r) => (
        <li key={r.id}>
          <button type="button" className="adm-list__item" onClick={() => onOpen(r.id)}>
            <span className="adm-list__date" aria-hidden="true">
              <b>{Number(r.requestedDate.slice(8))}</b>
              <small>
                {WEEKDAY_SHORT[weekdayOf(r.requestedDate)]} · {r.requestedDate.slice(5, 7)}
              </small>
            </span>
            <span className="adm-list__body">
              <span className="adm-list__title d-block">{r.name}</span>
              <span className="adm-list__meta d-block">
                {serviceInfo(r.serviceType).name} · {formatTimeRange(r.startTime, r.endTime)}
              </span>
            </span>
            {showStatus && <StatusBadge status={r.status} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LoadingCards() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mq-skeleton" style={{ height: 48, width: 240, marginBottom: 24 }} />
      <div className="adm-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mq-skeleton" style={{ height: 110 }} />
        ))}
      </div>
      <div className="mq-skeleton" style={{ height: 280 }} />
    </div>
  );
}

