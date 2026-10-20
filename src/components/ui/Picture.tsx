import type { Photo } from '../../config/photos';

interface PictureProps {
  photo: Photo;
  sizes?: string;
  /** true para a imagem principal da primeira dobra. */
  priority?: boolean;
  className?: string;
}

/** Foto responsiva em WebP, com JPEG de fallback e dimensões explícitas (evita saltos de layout). */
export function Picture({ photo, sizes = '100vw', priority, className }: PictureProps) {
  const img = (
    <img
      src={photo.fallback ?? photo.src}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      className={className}
    />
  );
  if (!photo.srcSet) return img;
  return (
    <picture>
      <source type="image/webp" srcSet={photo.srcSet} sizes={sizes} />
      {img}
    </picture>
  );
}
