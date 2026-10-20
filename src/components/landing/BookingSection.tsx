import { ArrowRight, CalendarCheck, Clock, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { peekDraftInProgress } from '../../hooks/useBookingDraft';
import { isFirebaseConfigured } from '../../services/firebase/config';
import { BOOKING_SECTION_ID, loadBookingWizard, requestBooking } from '../../utils/bookingIntent';
import { firstName } from '../../utils/text';
import { Button } from '../ui/Button';
import { SectionHead } from './SectionHead';

const STEPS = [
  { title: 'Seu contato', text: 'Nome e WhatsApp, nada mais.' },
  { title: 'Dia e horário', text: 'Veja os períodos livres e escolha quantas horas quer.' },
  { title: 'Envio pelo WhatsApp', text: 'O pedido chega pronto e o estúdio confirma.' },
];

/** Chamada para o agendamento. O fluxo em si abre numa janela por cima da página (BookingModal). */
export function BookingSection() {
  const { hash } = useLocation();
  // Relido sempre que a janela abre/fecha, para oferecer "continuar" a quem parou no meio.
  const [inProgress, setInProgress] = useState(peekDraftInProgress);
  useEffect(() => setInProgress(peekDraftInProgress()), [hash]);

  // Baixa o fluxo em segundo plano depois que a página carrega: a janela abre na hora.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let idle: number | undefined;
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const prefetch = () => {
      idle = hasIdle
        ? window.requestIdleCallback(() => void loadBookingWizard(), { timeout: 2500 })
        : window.setTimeout(() => void loadBookingWizard(), 800);
    };
    if (document.readyState === 'complete') prefetch();
    else window.addEventListener('load', prefetch, { once: true });
    return () => {
      window.removeEventListener('load', prefetch);
      if (idle !== undefined) (hasIdle ? window.cancelIdleCallback(idle) : window.clearTimeout(idle));
    };
  }, []);

  return (
    <section id={BOOKING_SECTION_ID} className="mq-section mq-booking-section" aria-labelledby="reservar-title">
      <div className="container">
        <div className="mq-booking-section__layout">
          <div className="mq-booking-section__aside">
            <SectionHead index="03" eyebrow="Agendamento" title="Reserve seu horário" id="reservar-title">
              Em poucos passos você escolhe o dia, vê os períodos livres e manda o pedido para o estúdio.
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

          <div className="mq-booking-cta">
            <ol className="mq-booking-cta__steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <b aria-hidden="true">0{i + 1}</b>
                  <span>
                    <strong>{s.title}</strong>
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => requestBooking()}
              iconRight={<ArrowRight size={20} aria-hidden="true" />}
            >
              {inProgress ? 'Continuar meu pedido' : 'Começar agendamento'}
            </Button>
            {inProgress?.name && (
              <p className="mq-booking-cta__resume">{firstName(inProgress.name)}, seu pedido ficou salvo neste aparelho.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
