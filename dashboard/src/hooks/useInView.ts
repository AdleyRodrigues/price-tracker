import { useEffect, useRef, useState } from 'react';

/**
 * Observa viewport nos dois sentidos.
 * Gráficos pesados devem desmontar ao sair da tela — senão o SVG continua
 * no compositor e o scroll engasga.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin = '180px 0px'
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { root: null, rootMargin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
