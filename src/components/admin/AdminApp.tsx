import './admin.scss';

import type { User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router';
import { adminSignOut, isAdminUser, watchAuth } from '../../services/firebase/auth';
import { isFirebaseConfigured } from '../../services/firebase/config';
import { friendlyError } from '../../services/firebase/errors';
import { Alert } from '../ui/Alert';
import { AdminDataProvider } from './AdminData';
import { AdminLayout } from './AdminLayout';
import { AvailabilityPage } from './availability/AvailabilityPage';
import { DashboardPage } from './DashboardPage';
import { LeadsPage } from './LeadsPage';
import { LoginScreen } from './LoginScreen';
import { RequestsPage } from './RequestsPage';

type AuthState =
  | { kind: 'checking' }
  | { kind: 'signedOut'; notice?: string }
  | { kind: 'denied'; user: User }
  | { kind: 'admin'; user: User };

export default function AdminApp() {
  const [state, setState] = useState<AuthState>({ kind: 'checking' });
  const wasAdmin = useRef(false);
  const signingOut = useRef(false);

  useEffect(() => {
    document.title = 'Painel · Muquifo';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return watchAuth(async (user) => {
      if (!user || user.isAnonymous) {
        const expired = wasAdmin.current && !signingOut.current;
        wasAdmin.current = false;
        signingOut.current = false;
        setState({ kind: 'signedOut', notice: expired ? 'Sua sessão expirou. Entre novamente.' : undefined });
        return;
      }
      try {
        const ok = await isAdminUser(user);
        wasAdmin.current = ok;
        setState(ok ? { kind: 'admin', user } : { kind: 'denied', user });
      } catch (err) {
        setState({ kind: 'signedOut', notice: friendlyError(err) });
      }
    });
  }, []);

  const signOut = async () => {
    signingOut.current = true;
    await adminSignOut();
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="adm-login">
        <div className="adm-login__card">
          <Alert tone="warning" title="Firebase não configurado">
            Preencha as variáveis VITE_FIREBASE_* no arquivo .env.local (veja o README).
          </Alert>
        </div>
      </div>
    );
  }

  if (state.kind === 'checking') {
    return (
      <div className="adm-login" aria-busy="true">
        <span className="mq-spinner" aria-label="Verificando acesso" />
      </div>
    );
  }

  if (state.kind !== 'admin') {
    return (
      <LoginScreen
        notice={state.kind === 'signedOut' ? state.notice : undefined}
        deniedEmail={state.kind === 'denied' ? state.user.email ?? '' : undefined}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AdminDataProvider>
      <AdminLayout email={state.user.email ?? ''} onSignOut={signOut}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="pedidos" element={<RequestsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="disponibilidade" element={<AvailabilityPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AdminLayout>
    </AdminDataProvider>
  );
}
