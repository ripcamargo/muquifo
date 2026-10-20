import { CalendarCheck, Clock, MessageCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { isFirebaseConfigured } from '../../services/firebase/config';
import { BOOKING_SECTION_ID, onBookingRequest } from '../../utils/bookingIntent';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { ButtonLink } from '../ui/Button';
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
    if (!node || !('IntersectionObserver' in window)) {
      setLoad(true);
      return off;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setLoad(true), {
      rootMargin: '800px 0px',
    });
    io.observe(node);
    return () => {
      off();
      io.disconnect();
    };
  }, [load]);

  return (
    <section id={BOOKING_SECTION_ID} ref={ref} className="mq-section mq-booking-section" aria-labelledby="agendar-title">
      <div className="container">
        <div className="mq-booking-section__layout">
          <div className="mq-booking-section__aside">
            <SectionHead index="04" eyebrow="Agendamento" title="Reserve seu horário" id="agendar-title">
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
              <div className="mq-wizard">
                <div className="mq-wizard__body">
                  <Alert
                    tone="warning"
                    title="Agendamento online indisponível no momento"
                    actions={
                      <ButtonLink variant="primary" href={studioWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                        Agendar pelo WhatsApp
                      </ButtonLink>
                    }
                  >
                    Fale direto com o estúdio pelo WhatsApp.
                  </Alert>
                </div>
              </div>
            ) : load ? (
              <Suspense fallback={<WizardSkeleton />}>
                <BookingWizard />
              </Suspense>
            ) : (
              <WizardSkeleton />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WizardSkeleton() {
  return (
    <div className="mq-wizard mq-wizard-skeleton" aria-busy="true">
      <span className="mq-spinner" aria-label="Carregando agendamento" />
    </div>
  );
}
