import { X } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useModal } from '../../hooks/useModal';
import { isFirebaseConfigured } from '../../services/firebase/config';
import { BOOKING_HASH, loadBookingWizard, onBookingRequest } from '../../utils/bookingIntent';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const BookingWizard = lazy(loadBookingWizard);

/**
 * Janela de agendamento: tela cheia no celular, centralizada no desktop.
 * Fica aberta enquanto a URL tiver #agendar — assim o link pode ser compartilhado
 * e o botão "voltar" do celular fecha a janela em vez de sair do site.
 */
export function BookingModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = location.hash === BOOKING_HASH;
  // true quando fomos nós que acrescentamos o #agendar ao histórico (então fechar = voltar).
  const pushed = useRef(false);

  useEffect(
    () =>
      onBookingRequest(() => {
        if (window.location.hash === BOOKING_HASH) return;
        pushed.current = true;
        navigate({ hash: BOOKING_HASH });
      }),
    [navigate],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      navigate(-1);
    } else {
      navigate({ hash: '' }, { replace: true });
    }
  }, [navigate]);

  // Se a pessoa fechar pelo "voltar", o histórico já saiu do #agendar.
  useEffect(() => {
    if (!open) pushed.current = false;
  }, [open]);

  const ref = useModal<HTMLDivElement>(open, close);
  if (!open) return null;

  return (
    <div className="mq-overlay mq-booking-modal" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="mq-booking-modal__dialog" role="dialog" aria-modal="true" aria-label="Agendamento">
        <div className="mq-booking-modal__bar">
          <span className="mq-label">
            <span className="mq-rec" aria-hidden="true" /> Agendamento
          </span>
          <button type="button" className="mq-icon-btn" onClick={close} aria-label="Fechar agendamento">
            <X size={22} />
          </button>
        </div>
        {isFirebaseConfigured ? (
          <ErrorBoundary fallback={(retry) => <Unavailable onRetry={retry} />}>
            <Suspense
              fallback={
                <div className="mq-wizard-skeleton" aria-busy="true">
                  <span className="mq-spinner" aria-label="Carregando agendamento" />
                </div>
              }
            >
              <BookingWizard />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <Unavailable />
        )}
      </div>
    </div>
  );
}

/** Agendamento online fora do ar (sem configuração ou erro inesperado): oferece o WhatsApp. */
function Unavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mq-wizard__body">
      <Alert
        tone="warning"
        title="Agendamento online indisponível no momento"
        actions={
          <>
            <ButtonLink variant="primary" href={studioWhatsappUrl()} target="_blank" rel="noopener noreferrer">
              Agendar pelo WhatsApp
            </ButtonLink>
            {onRetry && (
              <Button variant="ghost" onClick={onRetry}>
                Tentar de novo
              </Button>
            )}
          </>
        }
      >
        Fale direto com o estúdio pelo WhatsApp.
      </Alert>
    </div>
  );
}
