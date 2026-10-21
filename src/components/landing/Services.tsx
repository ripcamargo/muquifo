import { ChevronDown } from 'lucide-react';
import { services } from '../../config/studio';
import { SectionHead } from './SectionHead';

export function Services() {
  return (
    <section id="servicos" className="mq-section mq-services" aria-labelledby="servicos-title">
      <div className="container">
        <SectionHead index="02" eyebrow="Serviços" title="Ensaia, grava ou aluga?" id="servicos-title">
          Escolha o tipo de sessão e veja na hora os horários livres da agenda.
        </SectionHead>

        <div className="mq-services__grid">
          {services.map((s, i) => (
            <article key={s.id} className="mq-service-card" aria-labelledby={`servico-${s.id}`}>
              <div className="mq-service-card__top">
                <span className="mq-service-card__icon" aria-hidden="true">
                  <s.icon size={28} />
                </span>
                <span className="mq-service-card__num" aria-hidden="true">
                  0{i + 1}
                </span>
              </div>
              <h3 id={`servico-${s.id}`} className="mq-display mq-service-card__title">
                {s.name}
              </h3>
              <div>
                <p className="mq-service-card__summary">{s.summary}</p>
                <p className="mq-service-card__audience">{s.audience}</p>
              </div>
              {s.equipment.length > 0 && (
                <details className="mq-service-card__equipment">
                  <summary className="mq-label">
                    Equipamento <span>({s.equipment.length})</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <ul>
                    {s.equipment.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
