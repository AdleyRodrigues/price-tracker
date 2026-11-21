import { chaveOferta } from '../lib/url';
import type { Oferta } from '../types/oferta';

/**
 * Junta ofertas de scrapers manuais + APIs.
 * Chave = URL canônica; em empate fica o menor precoTotal.
 */
export function mergeOfertas(ofertas: Oferta[]): Oferta[] {
  const mapa = new Map<string, Oferta>();
  for (const o of ofertas) {
    const chave = chaveOferta(o.url).toLowerCase();
    if (!chave) continue;
    const existente = mapa.get(chave);
    if (!existente || o.precoTotal < existente.precoTotal) {
      mapa.set(chave, o);
    }
  }
  return [...mapa.values()];
}
