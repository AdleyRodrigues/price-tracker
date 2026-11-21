import { detalheErro } from '../config/http';
import { aceitarOferta } from '../domain/filtros';
import { mergeOfertas } from '../domain/merge-ofertas';
import { scrapers } from '../scrapers';
import { Oferta } from '../types/oferta';

export async function coletarOfertas(): Promise<Oferta[]> {
  const settled = await Promise.allSettled(scrapers.map((scraper) => scraper.coletar()));

  const ofertas: Oferta[] = [];
  for (const resultado of settled) {
    if (resultado.status === 'fulfilled') {
      ofertas.push(...resultado.value);
    } else {
      console.error(`Fonte falhou por completo: ${detalheErro(resultado.reason)}`);
    }
  }

  const validas = ofertas.filter(aceitarOferta);
  // Dedupe URL canônica entre scrapers manuais + Reef/Gecko/Apify
  return mergeOfertas(validas);
}
