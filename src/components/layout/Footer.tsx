import { MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { studio } from '../../config/studio';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { NAV_ITEMS } from './Header';

export function Footer() {
  const onHome = useLocation().pathname === '/';
  return (
    <footer className="mq-footer">
      <div className="container">
        <img className="mq-footer__logo" src="/img/logo-lockup.webp" width={963} height={400} alt={studio.name} loading="lazy" />
        <div className="mq-footer__grid">
          <div>
            <h2 className="mq-label">Contato</h2>
            <ul>
              <li>
                <a href={studioWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} aria-hidden="true" /> WhatsApp {studio.whatsappDisplay}
                </a>
              </li>
              {studio.about.location && <li>{studio.about.location}</li>}
            </ul>
          </div>
          <div>
            <h2 className="mq-label">Navegue</h2>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={onHome ? item.href : `/${item.href}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mq-label">Seus dados</h2>
            <ul>
              <li>
                <Link to="/privacidade">Política de privacidade</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mq-footer__bottom">
          <span>
            © {new Date().getFullYear()} {studio.name}
          </span>
          <span>Agendamentos sujeitos à confirmação pelo estúdio.</span>
        </div>
      </div>
    </footer>
  );
}
