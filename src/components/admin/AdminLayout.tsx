import { CalendarCog, Inbox, LayoutDashboard, LogOut, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { ACTIVE_REQUEST_STATUSES } from '../../config/status';
import { friendlyError, isPermissionDenied } from '../../services/firebase/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { useAdminData } from './AdminData';
import { RequestDrawer } from './RequestDrawer';

interface Props {
  email: string;
  onSignOut: () => void;
  children: ReactNode;
}

export function AdminLayout({ email, onSignOut, children }: Props) {
  const { requests, error } = useAdminData();
  const pending = requests?.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length ?? 0;

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="container adm-top__bar">
          <Link to="/admin" className="adm-top__brand">
            <img src="/img/logo-wordmark.webp" width={529} height={160} alt="Muquifo" />
            <span className="mq-label">Painel</span>
          </Link>
          <span className="adm-top__user">{email}</span>
          <Button variant="ghost" size="sm" onClick={onSignOut} icon={<LogOut size={18} aria-hidden="true" />}>
            Sair
          </Button>
        </div>
      </header>

      <nav className="adm-nav" aria-label="Seções do painel">
        <div className="container adm-nav__list">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} aria-hidden="true" /> Visão geral
          </NavLink>
          <NavLink to="/admin/pedidos">
            <Inbox size={18} aria-hidden="true" /> Pedidos
            {pending > 0 && (
              <span className="adm-badge" aria-label={`${pending} aguardando`}>
                {pending}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/leads">
            <Users size={18} aria-hidden="true" /> Leads
          </NavLink>
          <NavLink to="/admin/disponibilidade">
            <CalendarCog size={18} aria-hidden="true" /> Disponibilidade
          </NavLink>
        </div>
      </nav>

      <main className="container adm-main">
        {error != null && (
          <Alert
            tone="error"
            className="mb-4"
            title={isPermissionDenied(error) ? 'Acesso negado aos dados' : 'Falha ao carregar os dados'}
            actions={
              isPermissionDenied(error) ? (
                <Button size="sm" onClick={onSignOut}>
                  Entrar novamente
                </Button>
              ) : (
                <Button size="sm" onClick={() => window.location.reload()}>
                  Recarregar
                </Button>
              )
            }
          >
            {isPermissionDenied(error)
              ? 'Sua sessão pode ter expirado ou esta conta perdeu a permissão de administrador.'
              : friendlyError(error)}
          </Alert>
        )}
        {children}
      </main>

      <RequestDrawer />
    </div>
  );
}
