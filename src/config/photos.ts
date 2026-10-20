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
  srcSet: `/img/${name}-640.webp 640w, /img/${name}-960.webp 960w, /img/${name}-1280.webp 1280w`,
  fallback: `/img/${name}.jpg`,
});

export const photos = {
  bateria: {
    ...responsive('studio-bateria'),
    width: 1280,
    height: 960,
    alt: 'Sala do Muquifo com bateria vermelha, pratos, amplificador e caixas de som nas paredes de feltro vinho',
    caption: 'A sala de ensaio',
  },
  guitarra: {
    ...responsive('studio-guitarra'),
    width: 1280,
    height: 960,
    alt: 'Canto do estúdio com guitarra pendurada na parede, teclado, microfone no pedestal, amplificador, cajón e mesa de som',
    caption: 'Guitarra, teclado e mesa',
  },
  detalheGuitarra: {
    src: '/img/detalhe-guitarra.webp',
    width: 300,
    height: 400,
    alt: 'Guitarra preta pendurada na parede vinho, ao lado do microfone',
    caption: 'Detalhe',
  },
  detalheMesa: {
    src: '/img/detalhe-mesa.webp',
    width: 480,
    height: 330,
    alt: 'Mesa de som, amplificador e teclado sobre a bancada do estúdio',
    caption: 'Mesa de som',
  },
} satisfies Record<string, Photo>;
