import * as cheerio from 'cheerio';
import { baixarHtml, detalheErro } from '../config/http';
import { ramDoTextoPagina, ramDoTitulo, resolverRamNotebook } from '../domain/ram-notebook';
import type { Oferta } from '../types/oferta';

const CONCORRENCIA = 4;

/** Extrai o texto relevante (ficha técnica + JSON-LD) de uma página de produto. */
export function textoFichaTecnica(html: string): string {
  const $ = cheerio.load(html);
  const partes: string[] = [];

  // JSON-LD / __NEXT_DATA__ costumam trazer a descrição completa
  $('script[type="application/ld+json"], #__NEXT_DATA__').each((_, el) => {
    partes.push($(el).html() ?? '');
  });

  // Tabelas de especificação (Amazon, KaBuM!, Magalu, ASUS)
  $(
    '#productDetails_techSpec_section_1, #productDetails_detailBullets_sections1, #prodDetails, ' +
      '#feature-bullets, #productOverview_feature_div, table, [class*="spec"], [class*="ficha"], ' +
      '[id*="spec"], [data-testid*="spec"]'
  ).each((_, el) => {
    partes.push($(el).text());
  });

  if (partes.join('').trim().length === 0) partes.push($('body').text());
  return partes.join(' \n ');
}

async function ramDaPagina(url: string): Promise<number | null> {
  if (!/^https?:\/\//i.test(url) || /example\.com/i.test(url)) return null;
  const html = await baixarHtml(url);
  return ramDoTextoPagina(textoFichaTecnica(html));
}

/**
 * Garante RAM no título de cada oferta de notebook:
 * título → página do produto → catálogo/estimativa.
 * Quando a RAM vem de fora do título, acrescenta " · 16 GB RAM" ao título
 * para que histórico, Discord e dashboard enxerguem o mesmo valor.
 */
export async function enriquecerRamNotebooks(ofertas: Oferta[]): Promise<Oferta[]> {
  const resultado = [...ofertas];
  const pendentes = resultado
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !ramDoTitulo(o.titulo));

  if (pendentes.length === 0) return resultado;
  console.log(`[RAM] ${pendentes.length} oferta(s) sem RAM no título — buscando na página do produto...`);

  let cursor = 0;
  const worker = async () => {
    while (cursor < pendentes.length) {
      const { o, i } = pendentes[cursor++]!;
      let textoPagina: string | null = null;
      try {
        const gb = await ramDaPagina(o.url);
        if (gb) textoPagina = `${gb} GB RAM`;
      } catch (err) {
        console.warn(`[RAM] Falha ao ler página (${o.loja}): ${detalheErro(err)}`);
      }

      const ram = resolverRamNotebook({ titulo: o.titulo, chave: o.sku, textoPagina });
      const sufixo =
        ram.fonte === 'pagina' ? `${ram.gb} GB RAM` : `${ram.gb} GB RAM (${ram.fonte === 'catalogo' ? 'ficha técnica' : 'estimado'})`;
      console.log(`[RAM] ${o.loja}: ${ram.gb} GB via ${ram.fonte} — ${o.titulo.slice(0, 70)}`);
      resultado[i] = { ...o, titulo: `${o.titulo} · ${sufixo}` };
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, pendentes.length) }, worker));
  return resultado;
}
