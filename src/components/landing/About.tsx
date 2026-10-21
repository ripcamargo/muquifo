import { MapPin } from 'lucide-react';
import { photos } from '../../config/photos';
import { studio } from '../../config/studio';
import { Picture } from '../ui/Picture';
import { Gallery } from './Gallery';
import { SectionHead } from './SectionHead';

function FactList({ title, items }: { title: string; items: readonly string[] }) {
  if (!items.length) return null;
  return (
    <div className="mq-about__fact">
      <h3 className="mq-label">{title}</h3>
      <ul className="mq-about__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function About() {
  const { about } = studio;
  return (
    <section id="estudio" className="mq-section mq-about" aria-labelledby="estudio-title">
      <div className="container">
        <div className="row g-0 gx-md-5 align-items-start">
          <div className="col-md-6 col-lg-7">
            <figure className="mq-about__photo">
              <Picture photo={photos.guitarra} sizes="(min-width: 992px) 58vw, (min-width: 768px) 50vw, 100vw" />
              <figcaption className="mq-label">Foto real da sala</figcaption>
            </figure>
          </div>
          <div className="col-md-6 col-lg-5 mq-about__text">
            <SectionHead index="01" eyebrow="O estúdio" title={about.title} id="estudio-title" />
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}

            <div className="mq-about__facts">
              <FactList title="Diferenciais" items={about.highlights} />
              <FactList title="Trabalhos" items={about.workTypes} />
              <div className="mq-about__fact">
                <h3 className="mq-label">Onde</h3>
                <p className="mq-about__location">
                  <MapPin size={18} aria-hidden="true" />
                  <span>
                    {about.location && (
                      <>
                        <strong>{about.location}</strong>
                        <br />
                      </>
                    )}
                    {about.locationNote}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <Gallery />
      </div>
    </section>
  );
}
