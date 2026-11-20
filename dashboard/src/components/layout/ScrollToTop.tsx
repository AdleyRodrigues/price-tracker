import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Rola a página automaticamente para o topo ao trocar de rota.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
