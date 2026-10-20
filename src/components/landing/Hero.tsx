import { ArrowRight } from 'lucide-react';
import { photos } from '../../config/photos';
import { studio } from '../../config/studio';
import { requestBooking } from '../../utils/bookingIntent';
import { Button, ButtonLink } from '../ui/Button';
import { Picture } from '../ui/Picture';

const HOW_IT_WORKS = ['Deixe seu contato e escolha o serviço', 'Veja os dias e horários livres', 'Envie o pedido pelo WhatsApp'];

export function Hero() {
  return (
    <section className="mq-hero" aria-labelledby="hero-title">
      <div className="mq-hero__media">
        <Picture photo={photos.bateria} priority sizes="100vw" />
      </div>

      <div className="container">
        <div className="mq-hero__content">
          <p className="mq-hero__eyebrow mq-label">
            <span className="mq-rec" aria-hidden="true" />
            {studio.hero.eyebrow}
          </p>

          <hr className="mq-rule" aria-hidden="true" />
          <h1 id="hero-title" className="mq-display mq-hero__title">
            {studio.hero.titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <hr className="mq-rule mq-rule--gap" aria-hidden="true" />

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
