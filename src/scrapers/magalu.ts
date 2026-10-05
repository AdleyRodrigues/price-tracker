import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { detalheErro, http } from '../config/http';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

const MOBILE_MAGALU_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Referer': 'https://www.magazineluiza.com.br/',
};

export function parsearMagalu(html: string, item: ItemCatalogo): OfertaBruta {
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

  // 2. Extração via tags HTML se JSON-LD não tiver
  if (precoAVista <= 0) {
    const priceText = $('[data-testid="price-value"], .price-template__text, [itemprop="price"]').first().text().trim();
    if (priceText) {
      precoAVista = extrairPreco(priceText);
    }
  }

  if (!titulo || titulo === item.produto) {
    const h1 = $('h1, [data-testid="heading-product-title"]').first().text().trim();
    if (h1) titulo = h1;
  }

  if (precoAVista > 0) {
    precoParcelado = precoAVista;
    const qtdParc = 10;
    const valorParc = Math.round((precoAVista / qtdParc) * 100) / 100;
    parcelasTexto = `${qtdParc}x de ${formatBRL(valorParc)} sem juros`;
  }

  if (!disponivel) {
    throw new Error('Produto esgotado / indisponível no Magazine Luiza');
  }

  if (precoAVista <= 0) {
    throw new Error('Preço não encontrado no HTML do Magazine Luiza');
  }

  console.log(`[Magalu] ${titulo} => à vista: ${formatBRL(precoAVista)} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`);

  return {
    loja: 'Magazine Luiza',
    titulo,
    precoAVista,
    precoParcelado,
    detalhesParcelamento: parcelasTexto,
    frete: item.freteFallback ?? 0,
    url: item.url,
    fonteId: 'magalu',
  };
}

async function rasparItemMagalu(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: MOBILE_MAGALU_HEADERS,
      timeout: 12000,
      signal: AbortSignal.timeout(12000),
    });

    return [toOferta(parsearMagalu(html, item))];
  } catch (err) {
    console.error(`[Magalu] Falha ao raspar ${item.url}: ${detalheErro(err)}`);
    return [];
  }
}

export const magaluScraper: FonteScraper = {
  id: 'magalu',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'magalu');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemMagalu(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
