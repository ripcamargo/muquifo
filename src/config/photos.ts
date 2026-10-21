/** Fotos reais do estúdio (geradas por `npm run images` a partir de assets-src/). */
export interface Photo {
  src: string;
  srcSet?: string;
  fallback?: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

const responsive = (name: string) => ({
  src: `/img/${name}-960.webp`,
  srcSet: `/img/${name}-640.webp 640w, /img/${name}-960.webp 960w, /img/${name}-1195.webp 1195w`,
  fallback: `/img/${name}.jpg`,
});

export const photos = {
  bateria: {
    ...responsive('studio-bateria'),
    width: 1195,
    height: 896,
    alt: 'Sala do Muquifo com bateria vermelha, pratos, amplificador e caixas de som nas paredes de feltro vinho',
    caption: 'A sala de ensaio',
  },
  guitarra: {
    ...responsive('studio-guitarra'),
    width: 1195,
    height: 896,
    alt: 'Canto do estúdio com guitarra pendurada na parede, teclado, microfone no pedestal, amplificador, cajón e mesa de som',
    caption: 'Guitarra, teclado e mesa',
  },
} satisfies Record<string, Photo>;
