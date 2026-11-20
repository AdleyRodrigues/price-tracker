import { useEffect } from 'react';

/**
 * Atualiza o <title> da aba do navegador de forma reativa e com fallback limpo.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title) {
      document.title = 'Price Tracker · Monitor de Preços';
      return;
    }
    const limpo = title.trim();
    document.title = limpo.includes('Price Tracker') ? limpo : `${limpo} · Price Tracker`;
  }, [title]);
}
