import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import LandingPage from './pages/LandingPage';

const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// O painel (e seu CSS) fica num pacote separado: visitantes nunca o baixam.
const AdminApp = lazy(() => import('./components/admin/AdminApp'));

function PageFallback() {
  return (
    <div className="mq-wizard-skeleton" style={{ minHeight: '100vh' }} aria-busy="true">
      <span className="mq-spinner" aria-label="Carregando" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route
              path="/admin/*"
              element={
                <ErrorBoundary
                  fallback={() => (
                    <div className="mq-wizard-skeleton" style={{ minHeight: '100vh', padding: 24, textAlign: 'center' }}>
                      <div>
                        <p>Algo deu errado no painel.</p>
                        <button type="button" className="mq-btn mq-btn--primary" onClick={() => window.location.reload()}>
                          Recarregar
                        </button>
                      </div>
                    </div>
                  )}
                >
                  <AdminApp />
                </ErrorBoundary>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
