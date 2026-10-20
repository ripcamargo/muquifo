import { CalendarCheck, Clock, MessageCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { isFirebaseConfigured } from '../../services/firebase/config';
import { BOOKING_SECTION_ID, onBookingRequest } from '../../utils/bookingIntent';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { SectionHead } from './SectionHead';

// O fluxo (e o SDK do Firebase) só é baixado quando a seção se aproxima da tela ou alguém clica em "Agendar".
const BookingWizard = lazy(() => import('../booking/BookingWizard'));

export function BookingSection() {
  const ref = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (load) return;
    const off = onBookingRequest(() => setLoad(true));
    const node = ref.current;
    let io: IntersectionObserver | undefined;
    let idle: number | undefined;
    const hasIdle = typeof window.requestIdleCallback === 'function';
    // A seção fica logo abaixo do hero: espera a página terminar de carregar (foto, fontes)
    // antes de baixar o SDK do Firebase, para não atrasar a primeira tela.
    const observe = () => {
      if (!node || !('IntersectionObserver' in window)) return setLoad(true);
      io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setLoad(true), {
        rootMargin: '600px 0px',
      });
      io.observe(node);
    };
    const afterLoad = () => {
      idle = hasIdle ? window.requestIdleCallback(observe, { timeout: 1500 }) : window.setTimeout(observe, 300);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      off();
      io?.disconnect();
      window.removeEventListener('load', afterLoad);
      if (idle !== undefined) (hasIdle ? window.cancelIdleCallback(idle) : window.clearTimeout(idle));
    };
  }, [load]);

  return (
    <section id={BOOKING_SECTION_ID} ref={ref} className="mq-section mq-booking-section" aria-labelledby="agendar-title">
      <div className="container">
        <div className="mq-booking-section__layout">
          <div className="mq-booking-section__aside">
            <SectionHead index="01" eyebrow="Agendamento" title="Reserve seu horário" id="agendar-title">
              Em poucos passos você escolhe o dia e o horário livre e manda o pedido para o estúdio.
            </SectionHead>
            <ul className="mq-booking-section__notes">
              <li>
                <CalendarCheck size={20} aria-hidden="true" />
                <span>A agenda mostra os horários livres em tempo real.</span>
              </li>
              <li>
                <MessageCircle size={20} aria-hidden="true" />
                <span>O pedido chega ao estúdio pelo WhatsApp, com tudo preenchido.</span>
              </li>
              <li>
                <Clock size={20} aria-hidden="true" />
                <span>O horário fica garantido quando o estúdio confirmar.</span>
              </li>
            </ul>
          </div>

          <div>
            {!isFirebaseConfigured ? (
              <WizardUnavailable />
            ) : load ? (
              <ErrorBoundary fallback={(retry) => <WizardUnavailable onRetry={retry} />}>
                <Suspense fallback={<WizardSkeleton />}>
                  <BookingWizard />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <WizardSkeleton />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Agendamento online fora do ar (sem configuração ou erro inesperado): oferece o WhatsApp. */
function WizardUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mq-wizard">
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
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="mq-wizard mq-wizard-skeleton" aria-busy="true">
      <span className="mq-spinner" aria-label="Carregando agendamento" />
    </div>
  );
}
