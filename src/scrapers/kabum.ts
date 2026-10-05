import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function parsearKabum(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);
  
  // 1. Tenta extrair via __NEXT_DATA__
  const nextDataStr = $('#__NEXT_DATA__').html();
  let titulo = item.produto;
  let precoAVista = 0;
  let precoParcelado: number | undefined;
  let parcelasTexto: string | undefined;
  let disponivel = true;

  if (nextDataStr) {
    try {
      const nextData = JSON.parse(nextDataStr);
      const product =
        nextData?.props?.pageProps?.product ||
        nextData?.props?.pageProps?.initialData?.product ||
        nextData?.props?.pageProps?.data?.product;

      if (product) {
        titulo = product.title || product.name || titulo;
        disponivel = product.available ?? product.hasStock ?? true;
        
        const priceDetails = product.priceDetails || product.prices || product.offer;
        if (priceDetails) {
          precoAVista = priceDetails.priceWithDiscount || priceDetails.discountPrice || priceDetails.price;
          precoParcelado = priceDetails.price || priceDetails.regularPrice;
          
          if (precoParcelado && precoParcelado > 0) {
            const qtdParc = 10;
            const valorParc = Math.round((precoParcelado / qtdParc) * 100) / 100;
            parcelasTexto = `${qtdParc}x de ${formatBRL(valorParc)} sem juros`;
          }
        }
      }
    } catch {}
  }

  // 2. Fallback via JSON-LD
  if (precoAVista <= 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type'] === 'Product' && json.offers) {
          const offer = Array.isArray(json.offers) ? json.offers[0] : json.offers;
          if (offer && offer.price) {
            precoAVista = Number(offer.price);
            if (offer.availability && offer.availability.includes('OutOfStock')) {
              disponivel = false;
            }
          }
          if (json.name) titulo = json.name;
        }
      } catch {}
    });
  }

  // 3. Fallback via H1
  if (!titulo || titulo === item.produto) {
    const h1 = $('h1').first().text().trim();
    if (h1) titulo = h1;
  }

  if (!disponivel) {
    throw new Error('Produto esgotado / indisponível no KaBuM!');
  }

  if (precoAVista <= 0) {
    throw new Error('Preço à vista não encontrado no HTML do KaBuM!');
  }

  console.log(`[KaBuM!] ${titulo} => à vista: ${formatBRL(precoAVista)} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`);

  return {
    loja: 'KaBuM!',
    titulo,
    precoAVista,
    precoParcelado,
    detalhesParcelamento: parcelasTexto,
    frete: item.freteFallback ?? 0,
    url: item.url,
    fonteId: 'kabum',
  };
}

async function rasparItemKabum(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: {
        ...CHROME_HEADERS,
        'Referer': 'https://www.kabum.com.br/',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    return [toOferta(parsearKabum(html, item))];
  } catch (err) {
    console.error(`[KaBuM!] Falha ao raspar ${item.url}: ${detalheErro(err)}`);
    return [];
  }
}

export const kabumScraper: FonteScraper = {
  id: 'kabum',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'kabum');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemKabum(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
