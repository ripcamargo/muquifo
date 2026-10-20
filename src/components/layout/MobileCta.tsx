import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BOOKING_SECTION_ID, requestBooking } from '../../utils/bookingIntent';
import { Button } from '../ui/Button';

/**
 * Botão fixo no rodapé do celular. Aparece depois da primeira dobra e some
 * quando a seção de agendamento (que já tem o botão grande) está na tela.
 */
export function MobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const section = document.getElementById(BOOKING_SECTION_ID);
    let io: IntersectionObserver | undefined;
    if (section && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => setBookingVisible(entry.isIntersecting), { threshold: 0 });
      io.observe(section);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
    };
  }, []);

  const visible = pastHero && !bookingVisible;

  return (
    <div className={`mq-sticky-cta ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <Button
        variant="primary"
        size="lg"
        block
        tabIndex={visible ? 0 : -1}
        onClick={() => requestBooking()}
        iconRight={<ArrowRight size={18} aria-hidden="true" />}
      >
        Agendar horário
      </Button>
    </div>
  );
}
