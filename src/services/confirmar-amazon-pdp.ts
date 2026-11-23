/**
 * Reparse Amazon PDP para ofertas vindas da SERP — preço/cupom da buybox
 * antes de gravar histórico (evita cupom fantasma do card de busca).
 */

import { ItemCatalogo } from '../config/catalogo';
import { baixarHtml, detalheErro } from '../config/http';
import { FRETE_FALLBACK_AMAZON } from '../config/regras';
import { ordenarPorTotal } from '../domain/ranking';
import { obterCookiesAmazonCep, parsearAmazon } from '../scrapers/amazon';
import { Oferta, toOferta } from '../types/oferta';

const MAX_PDP_DEFAULT = Number(process.env.AMAZON_PDP_CONFIRM_MAX) || 25;

function asinDeUrl(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Confirma preço/cupom via PDP para as melhores ofertas Amazon (por custo real).
 * Ofertas não-Amazon passam intactas; falha de PDP mantém o preço da SERP.
 */
export async function confirmarPrecosAmazonPdp(
  ofertas: Oferta[],
  maxPdp = MAX_PDP_DEFAULT
): Promise<Oferta[]> {
  const amazon = ofertas.filter(
    (o) => /amazon/i.test(o.loja) || o.fonteId === 'amazon' || /amazon\.com\.br/i.test(o.url)
  );
  if (amazon.length === 0) return ofertas;

  const candidatas = ordenarPorTotal(amazon).slice(0, maxPdp);
  const porAsin = new Map<string, Oferta>();
  for (const o of candidatas) {
    const asin = o.sku?.toUpperCase() || asinDeUrl(o.url);
    if (!asin) continue;
    if (!porAsin.has(asin)) porAsin.set(asin, o);
  }

  if (porAsin.size === 0) return ofertas;

  console.log(`[Amazon PDP] Confirmando preço em ${porAsin.size} ASIN(s) (cap ${maxPdp})...`);

  let cookie = '';
  try {
    cookie = await obterCookiesAmazonCep();
  } catch (err) {
    console.warn(`[Amazon PDP] cookies CEP falharam: ${detalheErro(err)}`);
  }

  const confirmados = new Map<string, Oferta>();

  for (const [asin, base] of porAsin) {
    const item: ItemCatalogo = {
      loja: 'Amazon',
      produto: base.titulo,
      url: `https://www.amazon.com.br/dp/${asin}`,
      parser: 'amazon',
      sku: asin,
      freteFallback: base.frete || FRETE_FALLBACK_AMAZON,
    };

    try {
      const html = await baixarHtml(item.url, {
        Referer: 'https://www.amazon.com.br/',
        ...(cookie ? { Cookie: cookie } : {}),
      });
      const bruta = parsearAmazon(html, item);
      const atualizada = toOferta({
        ...bruta,
        titulo: base.titulo || bruta.titulo,
        loja: base.loja.startsWith('Amazon') ? base.loja : bruta.loja,
      });
      confirmados.set(asin, atualizada);
      console.log(
        `[Amazon PDP] ${asin}: ${base.precoAVista} → ${atualizada.precoAVista}` +
          (atualizada.cupomTag ? ` [${atualizada.cupomTag}]` : '')
      );
    } catch (err) {
      console.warn(`[Amazon PDP] ${asin} falhou (mantém SERP): ${detalheErro(err)}`);
    }

    await new Promise((r) => setTimeout(r, 350));
  }

  if (confirmados.size === 0) return ofertas;

  return ofertas.map((o) => {
    const asin = o.sku?.toUpperCase() || asinDeUrl(o.url);
    if (!asin) return o;
    return confirmados.get(asin) ?? o;
  });
}
