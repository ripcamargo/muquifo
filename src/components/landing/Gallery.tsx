import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { photos, type Photo } from '../../config/photos';
import { useModal } from '../../hooks/useModal';
import { Picture } from '../ui/Picture';
import { SectionHead } from './SectionHead';

const ITEMS: Photo[] = [photos.bateria, photos.detalheGuitarra, photos.detalheMesa, photos.guitarra];
const SIZES = ['(min-width: 992px) 50vw, 100vw', '(min-width: 992px) 25vw, 50vw', '(min-width: 992px) 25vw, 50vw', '(min-width: 992px) 25vw, 100vw'];

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="galeria" className="mq-section" aria-labelledby="galeria-title">
      <div className="container">
        <SectionHead index="04" eyebrow="Galeria" title="A sala, sem filtro" id="galeria-title">
          Fotos reais do espaço. Toque para ampliar.
        </SectionHead>
        <div className="mq-gallery">
          {ITEMS.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              className="mq-gallery__item"
              onClick={() => setOpen(i)}
              aria-label={`Ampliar foto: ${photo.caption}`}
            >
              <Picture photo={photo} sizes={SIZES[i]} />
              <span className="mq-label" aria-hidden="true">
                {photo.caption}
              </span>
            </button>
          ))}
        </div>
      </div>
      {open !== null && <Lightbox index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Lightbox({ index, onChange, onClose }: { index: number; onChange: (i: number) => void; onClose: () => void }) {
  const ref = useModal<HTMLDivElement>(true, onClose);
  const touchX = useRef<number | null>(null);
  const photo = ITEMS[index];
  const go = (delta: number) => onChange((index + delta + ITEMS.length) % ITEMS.length);
  // Fotos inteiras abrem na maior resolução disponível.
  const src = photo.srcSet ? photo.src.replace('-960.', '-1280.') : photo.src;

  return (
    <div
      ref={ref}
      className="mq-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${ITEMS.length}: ${photo.caption}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="mq-lightbox__top">
        <span className="mq-label">
          {index + 1} / {ITEMS.length} · {photo.caption}
        </span>
        <button type="button" className="mq-icon-btn" onClick={onClose} aria-label="Fechar" data-autofocus>
          <X size={24} />
        </button>
      </div>
      <div className="mq-lightbox__stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img src={src} alt={photo.alt} width={photo.width} height={photo.height} />
      </div>
      <div className="mq-lightbox__nav">
        <button type="button" className="mq-icon-btn" onClick={() => go(-1)} aria-label="Foto anterior">
          <ChevronLeft size={24} />
        </button>
        <button type="button" className="mq-icon-btn" onClick={() => go(1)} aria-label="Próxima foto">
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
