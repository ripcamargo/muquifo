import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { studio } from '../../config/studio';
import { requestBooking } from '../../utils/bookingIntent';
import { Button } from '../ui/Button';

export const NAV_ITEMS = [
  { href: '#estudio', label: 'O estúdio' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#agendar', label: 'Agendar' },
];

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const href = (hash: string) => (onHome ? hash : `/${hash}`);

  const book = () => {
    setOpen(false);
    if (onHome) requestBooking();
    else window.location.assign('/#agendar');
  };

  return (
    <>
      <a className="mq-skip-link visually-hidden-focusable" href={onHome ? '#agendar' : '#conteudo'}>
        {onHome ? 'Pular para o agendamento' : 'Pular para o conteúdo'}
      </a>
      <header className={`mq-header ${solid || !onHome ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
        <div className="container mq-header__inner">
          <Link to="/" className="mq-header__brand" aria-label={`${studio.name} — início`} onClick={() => setOpen(false)}>
            <img src="/img/logo-wordmark.webp" width={529} height={160} alt={studio.name} />
          </Link>

          <nav className="mq-header__nav" aria-label="Principal">
            {/* "Agendar" já tem o botão de destaque ao lado. */}
            {NAV_ITEMS.filter((item) => item.href !== '#agendar').map((item) => (
              <a key={item.href} href={href(item.href)}>
                {item.label}
              </a>
            ))}
          </nav>

          <Button variant="primary" size="sm" className="mq-header__cta" onClick={book}>
            Agendar horário
          </Button>

          <button
            type="button"
            className="mq-icon-btn mq-header__menu-btn"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="mq-mobile-menu" id="menu-mobile">
          <nav aria-label="Menu">
            {NAV_ITEMS.map((item, i) => (
              <a key={item.href} href={href(item.href)} onClick={() => setOpen(false)}>
                {item.label}
                <span>0{i + 1}</span>
              </a>
            ))}
          </nav>
          <Button variant="primary" size="lg" block onClick={book} iconRight={<ArrowRight size={18} aria-hidden="true" />}>
            Agendar horário
          </Button>
        </div>
      )}
    </>
  );
}
