import { ArrowRight } from 'lucide-react';
import { photos } from '../../config/photos';
import { studio } from '../../config/studio';
import { useHeroLogoDock } from '../../hooks/useHeroLogoDock';
import { requestBooking } from '../../utils/bookingIntent';
import { Button, ButtonLink } from '../ui/Button';
import { Picture } from '../ui/Picture';

const HOW_IT_WORKS = ['Deixe seu contato e escolha o serviço', 'Veja os dias e horários livres', 'Envie o pedido pelo WhatsApp'];

export function Hero() {
  const logoRef = useHeroLogoDock<HTMLImageElement>();

  return (
    <section className="mq-hero" aria-labelledby="hero-title">
      <div className="mq-hero__media">
        <Picture photo={photos.bateria} priority sizes="100vw" />
      </div>

      <div className="container">
        <div className="mq-hero__content">
          <p className="mq-hero__eyebrow mq-label">
            
            {studio.hero.eyebrow}
          </p>

          <h1 id="hero-title" className="mq-hero__title">
            <img ref={logoRef} className="mq-hero__logo" src="/img/logo-lockup.webp" width={963} height={400} alt={studio.name} />
          </h1>

          <p className="mq-hero__subtitle">{studio.hero.subtitle}</p>

          <div className="mq-hero__actions">
            <Button variant="primary" size="lg" onClick={() => requestBooking()} iconRight={<ArrowRight size={20} aria-hidden="true" />}>
              Agendar horário
            </Button>
            <ButtonLink href="#estudio" size="lg">
              Conhecer o estúdio
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="mq-hero__steps mq-label" aria-label="Como funciona">
        {HOW_IT_WORKS.map((text, i) => (
          <div key={text}>
            <b>0{i + 1}</b>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
