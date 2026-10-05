import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function parsearAsus(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);
  
  let titulo = item.produto;
  let precoAVista = 0;
  let precoParcelado: number | undefined;
  let parcelasTexto: string | undefined;
  let disponivel = true;

  // 1. Extração via JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type'] === 'Product') {
        if (data.name) titulo = data.name;
        if (data.offers) {
          const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
          if (offer && offer.price) {
            precoAVista = Number(offer.price);
            if (offer.availability && !offer.availability.includes('InStock')) {
              disponivel = false;
            }
          }
        }
      }
    } catch {}
  });

  // 2. Extração de Preço Parcelado via Meta Tag
  const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
  if (metaPrice) {
    const val = Number(metaPrice);
    if (val > 0) {
      precoParcelado = val;
      if (precoAVista <= 0) precoAVista = val;
    }
  }

  // Se o preço à vista ainda não foi encontrado, busca no HTML
  if (precoAVista <= 0) {
    const htmlPrice = $('span[data-price-type="finalPrice"], .price-final_price, .price').first().text().trim();
    if (htmlPrice) {
      precoAVista = extrairPreco(htmlPrice);
    }
  }

  if (precoParcelado && precoParcelado > 0) {
    const qtdParc = 10;
    const valorParc = Math.round((precoParcelado / qtdParc) * 100) / 100;
    parcelasTexto = `${qtdParc}x de ${formatBRL(valorParc)} sem juros`;
  }

  if (!disponivel) {
    throw new Error('Produto esgotado / indisponível na Loja Oficial ASUS');
  }

  if (precoAVista <= 0) {
    throw new Error('Preço não encontrado no HTML da Loja ASUS');
  }

  console.log(`[Loja ASUS] ${titulo} => à vista: ${formatBRL(precoAVista)} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`);

  return {
    loja: 'Loja Oficial ASUS',
    titulo,
    precoAVista,
    precoParcelado,
    detalhesParcelamento: parcelasTexto,
    frete: item.freteFallback ?? 0,
    url: item.url,
    fonteId: 'asus',
  };
}

async function rasparItemAsus(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: {
        ...CHROME_HEADERS,
        'Referer': 'https://br.store.asus.com/',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    return [toOferta(parsearAsus(html, item))];
  } catch (err) {
    console.error(`[Loja ASUS] Falha ao raspar ${item.url}: ${detalheErro(err)}`);
    return [];
  }
}

export const asusScraper: FonteScraper = {
  id: 'asus',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'asus');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemAsus(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
