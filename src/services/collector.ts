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
  const merged = mergeOfertas(validas);

  const marcas = new Map<string, number>();
  for (const o of merged) {
    const m =
      o.titulo.match(/\b(asus|avell|lenovo|acer|dell|alienware|gigabyte|aorus)\b/i)?.[1] ??
      'outro';
    const key = m.toLowerCase();
    marcas.set(key, (marcas.get(key) ?? 0) + 1);
  }
  console.log(
    `[collector] ${merged.length} oferta(s) após merge — por marca: ${[...marcas.entries()]
      .map(([k, n]) => `${k}=${n}`)
      .join(', ') || 'nenhuma'}`
  );

  return merged;
}
