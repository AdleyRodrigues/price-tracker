import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { detalheErro, http } from '../config/http';
import { MAGALU_BUSCA_URLS } from '../config/regras';
import { aceitarOferta, ofertaBrutaValida } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

const MOBILE_MAGALU_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Referer: 'https://www.magazineluiza.com.br/',
};

export function parsearMagalu(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);

  let titulo = item.produto;
  let precoAVista = 0;
  let precoParcelado: number | undefined;
  let parcelasTexto: string | undefined;
  let disponivel = true;

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
    } catch {
      /* JSON-LD inválido */
    }
  });

  if (precoAVista <= 0) {
    const priceText = $('[data-testid="price-value"], .price-template__text, [itemprop="price"]')
      .first()
      .text()
      .trim();
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

  console.log(
    `[Magalu] ${titulo} => à vista: ${formatBRL(precoAVista)} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`
  );

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

/** Extrai cards de listagem Magalu (busca). Preço = vitrine da página. */
export function parsearBuscaMagalu(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const vistos = new Set<string>();

  const cards = $(
    '[data-testid="product-card"], li[data-testid="product"], .productShowCase, a[data-testid="product-card-container"]'
  ).toArray();

  // Fallback: links de produto com preço próximo
  const candidates =
    cards.length > 0
      ? cards
      : $('a[href*="/p/"], a[href*="/produto/"]').toArray().slice(0, 40);

  for (const el of candidates) {
    const card = $(el);
    const linkEl = card.is('a') ? card : card.find('a[href*="/p/"], a[href*="/produto/"]').first();
    let href = linkEl.attr('href')?.trim() || '';
    if (!href) continue;
    if (href.startsWith('/')) href = `https://www.magazineluiza.com.br${href}`;
    const urlCanon = href.split('?')[0]!.toLowerCase();
    if (vistos.has(urlCanon)) continue;

    const titulo =
      card.find('[data-testid="product-title"], h2, h3').first().text().replace(/\s+/g, ' ').trim() ||
      linkEl.attr('title')?.trim() ||
      linkEl.text().replace(/\s+/g, ' ').trim();
    if (!titulo || titulo.length < 12) continue;

    const precoTxt =
      card.find('[data-testid="price-value"], [data-testid="price"], .price-template__text, .price')
        .first()
        .text()
        .trim() || card.text();
    const precoAVista = extrairPreco(precoTxt);
    if (!Number.isFinite(precoAVista) || precoAVista <= 0) continue;
    if (!ofertaBrutaValida(titulo, precoAVista, '', undefined)) continue;

    const bruta: OfertaBruta = {
      loja: 'Magazine Luiza',
      titulo,
      precoAVista,
      precoParcelado: precoAVista,
      frete: 0,
      url: href.split('?')[0]!,
      fonteId: 'magalu',
    };
    const oferta = toOferta(bruta);
    if (!aceitarOferta(oferta)) continue;

    vistos.add(urlCanon);
    console.log(`[Magalu (Busca)] ${titulo.slice(0, 60)} => ${formatBRL(precoAVista)}`);
    ofertas.push(oferta);
  }

  return ofertas;
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

async function rasparBuscaMagalu(url: string): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(url, {
      headers: MOBILE_MAGALU_HEADERS,
      timeout: 12000,
      signal: AbortSignal.timeout(12000),
    });
    return parsearBuscaMagalu(html);
  } catch (err) {
    console.error(`[Magalu] Falha na busca ${url}: ${detalheErro(err)}`);
    return [];
  }
}

export const magaluScraper: FonteScraper = {
  id: 'magalu',
  async coletar(): Promise<Oferta[]> {
    const itensPdp = CATALOGO.filter((item) => item.parser === 'magalu');
    const urlsBusca = MAGALU_BUSCA_URLS;

    console.log(
      `[Magalu] ${itensPdp.length} PDP(s) no catálogo + ${urlsBusca.length} URL(s) de busca multi-marca`
    );

    const settledPdp = await Promise.allSettled(itensPdp.map((item) => rasparItemMagalu(item)));
    const settledBusca = await Promise.allSettled(urlsBusca.map((url) => rasparBuscaMagalu(url)));

    const todas = [
      ...settledPdp.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])),
      ...settledBusca.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])),
    ];

    const mapa = new Map<string, Oferta>();
    for (const o of todas) {
      const chave = o.url.split('?')[0]!.toLowerCase();
      const existente = mapa.get(chave);
      if (!existente || o.precoAVista < existente.precoAVista) {
        mapa.set(chave, o);
      }
    }
    return [...mapa.values()];
  },
};
