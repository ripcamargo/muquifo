import { useEffect, useRef } from 'react';

/** Fração da altura do logo completo ocupada pela marca (o resto é "HOME STUDIO"). */
const WORDMARK_RATIO = 246 / 338;

/**
 * Leva o logo da hero até o logo do cabeçalho conforme a página rola.
 * O deslocamento vertical vem da própria rolagem: a animação dura exatamente
 * o trecho em que o logo sobe até a altura do cabeçalho, então só é preciso
 * interpolar a posição horizontal, a escala e recortar o "HOME STUDIO".
 * Enquanto o logo está em voo, `html[data-hero-logo="flying"]` esconde o logo
 * do cabeçalho e deixa o cabeçalho transparente (ver _layout.scss).
 */
export function useHeroLogoDock<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const logo = ref.current;
    const target = document.querySelector<HTMLElement>('.mq-header__brand img');
    if (!logo || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    let start = { left: 0, top: 0, width: 1 };
    let end = { left: 0, top: 0, width: 1 };
    let frame = 0;

    const measure = () => {
      logo.style.transform = 'none';
      const a = logo.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      start = { left: a.left, top: a.top + window.scrollY, width: a.width };
      end = { left: b.left, top: b.top, width: b.width };
      update();
    };

    const update = () => {
      frame = 0;
      const distance = start.top - end.top;
      const p = distance > 0 ? Math.min(Math.max(window.scrollY / distance, 0), 1) : 1;
      const scale = 1 + (end.width / start.width - 1) * p;
      logo.style.transform = `translateX(${(end.left - start.left) * p}px) scale(${scale})`;
      logo.style.clipPath = `inset(0 0 ${(1 - WORDMARK_RATIO) * 100 * p}% 0)`;
      logo.style.opacity = p < 1 ? '1' : '0';
      root.dataset.heroLogo = p < 1 ? 'flying' : 'docked';
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    // O logo do cabeçalho pode terminar de carregar depois e mudar de largura.
    target.addEventListener('load', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener('load', measure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      logo.style.transform = logo.style.clipPath = logo.style.opacity = '';
      delete root.dataset.heroLogo;
    };
  }, []);

  return ref;
}
