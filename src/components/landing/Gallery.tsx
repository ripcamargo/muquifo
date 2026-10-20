import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { photos, type Photo } from '../../config/photos';
import { useModal } from '../../hooks/useModal';
import { Picture } from '../ui/Picture';

const ITEMS: Photo[] = [photos.bateria, photos.detalheGuitarra, photos.detalheMesa, photos.guitarra];
const SIZES = ['(min-width: 992px) 50vw, 100vw', '(min-width: 992px) 25vw, 50vw', '(min-width: 992px) 25vw, 50vw', '(min-width: 992px) 25vw, 100vw'];

/** Galeria de fotos reais, exibida dentro da seção "O estúdio". */
export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div id="galeria" className="mq-gallery-block" role="group" aria-labelledby="galeria-title">
      <div className="mq-gallery-block__head">
        <h3 id="galeria-title" className="mq-display mq-gallery-block__title">
          A sala, sem filtro
        </h3>
        <p className="mq-muted mb-0">Fotos reais do espaço. Toque para ampliar.</p>
      </div>
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
      {open !== null && <Lightbox index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </div>
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
