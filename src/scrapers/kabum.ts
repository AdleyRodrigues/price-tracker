import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { KABUM_BUSCA_URLS } from '../config/regras';
import { aceitarOferta } from '../domain/filtros';
import { formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function parsearKabum(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);

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
          precoAVista =
            priceDetails.priceWithDiscount || priceDetails.discountPrice || priceDetails.price;
          precoParcelado = priceDetails.price || priceDetails.regularPrice;

          if (precoParcelado && precoParcelado > 0) {
            const qtdParc = 10;
            const valorParc = Math.round((precoParcelado / qtdParc) * 100) / 100;
            parcelasTexto = `${qtdParc}x de ${formatBRL(valorParc)} sem juros`;
          }
        }
      }
    } catch {
      /* fallback abaixo */
    }
  }

  if (precoAVista <= 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type'] === 'Product' && json.offers) {
          const offer = Array.isArray(json.offers) ? json.offers[0] : json.offers;
          if (offer?.price) {
            precoAVista = Number(offer.price);
            if (offer.availability && String(offer.availability).includes('OutOfStock')) {
              disponivel = false;
            }
          }
          if (json.name) titulo = json.name;
        }
      } catch {
        /* ignore */
      }
    });
  }

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

  console.log(
    `[KaBuM!] ${titulo} => à vista: ${formatBRL(precoAVista)} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`
  );

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

/** Resultados de /busca/{slug} via __NEXT_DATA__ (mesmo formato do scraper de celular). */
export function parsearBuscaKabum(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const nextData = $('#__NEXT_DATA__').html();
  if (!nextData) return ofertas;

  try {
    const parsed = JSON.parse(nextData);
    const items = parsed.props?.pageProps?.data?.catalogServer?.data || [];

    for (const p of items) {
      if (!p.available) continue;
      const titulo = p.name ? String(p.name).trim() : '';
      if (!titulo) continue;

      const code = p.code;
      const friendlyName = p.friendlyName || '';
      const url = `https://www.kabum.com.br/produto/${code}/${friendlyName}`;

      const precoAVista =
        typeof p.priceWithDiscount === 'number' && p.priceWithDiscount > 0
          ? p.priceWithDiscount
          : typeof p.price === 'number'
            ? p.price
            : 0;

      if (!precoAVista || precoAVista <= 0) continue;

      const precoParcelado = typeof p.price === 'number' && p.price > 0 ? p.price : precoAVista;
      const parcelasTxt = p.maxInstallment?.amount
        ? `${p.maxInstallment.amount}x de ${formatBRL(p.maxInstallment.installment)} sem juros`
        : undefined;

      const oferta = toOferta({
        loja: 'KaBuM!',
        titulo,
        precoAVista,
        precoParcelado,
        detalhesParcelamento: parcelasTxt,
        frete: 0,
        url,
        fonteId: 'kabum',
      });

      if (aceitarOferta(oferta)) {
        console.log(`[KaBuM! Busca] ${oferta.titulo} => ${formatBRL(oferta.precoAVista)}`);
        ofertas.push(oferta);
      }
    }
  } catch (err) {
    console.warn(`[KaBuM!] Erro ao parsear busca __NEXT_DATA__: ${detalheErro(err)}`);
  }

  return ofertas;
}

async function rasparItemKabum(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: {
        ...CHROME_HEADERS,
        Referer: 'https://www.kabum.com.br/',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const bruta = parsearKabum(html, item);
    const oferta = toOferta(bruta);
    return aceitarOferta(oferta) ? [oferta] : [];
  } catch (err) {
    console.error(`[KaBuM!] Falha ao raspar ${item.url}: ${detalheErro(err)}`);
    return [];
  }
}

async function rasparBuscaKabum(url: string): Promise<Oferta[]> {
  try {
    const res = await http.get<string>(url, {
      headers: {
        ...CHROME_HEADERS,
        Referer: 'https://www.kabum.com.br/',
      },
      timeout: 12000,
      validateStatus: () => true,
    });

    if (res.status === 403 || res.status === 429) {
      console.warn(`[KaBuM!] HTTP ${res.status} (bloqueio) em ${url}`);
      return [];
    }
    if (res.status >= 400) {
      console.warn(`[KaBuM!] HTTP ${res.status} em ${url}`);
      return [];
    }

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html.includes('__NEXT_DATA__')) {
      console.warn(`[KaBuM!] Sem __NEXT_DATA__ em ${url} (possível bloqueio/HTML vazio)`);
      return [];
    }

    const ofertas = parsearBuscaKabum(html);
    if (ofertas.length === 0) {
      console.warn(`[KaBuM!] 0 cards aceitos em ${url}`);
    } else {
      console.log(`[KaBuM!] ${ofertas.length} oferta(s) em ${url}`);
    }
    return ofertas;
  } catch (err) {
    console.warn(`[KaBuM!] Busca ${url} falhou: ${detalheErro(err)}`);
    return [];
  }
}

function dedupPorUrl(ofertas: Oferta[]): Oferta[] {
  const mapa = new Map<string, Oferta>();
  for (const o of ofertas) {
    const chave = o.url.trim().toLowerCase();
    const existente = mapa.get(chave);
    if (!existente || o.precoTotal < existente.precoTotal) {
      mapa.set(chave, o);
    }
  }
  return [...mapa.values()];
}

export const kabumScraper: FonteScraper = {
  id: 'kabum',
  async coletar(): Promise<Oferta[]> {
    const todas: Oferta[] = [];

    // 1. Busca multi-marca (Avell, LOQ, Nitro, TUF…)
    console.log(`[KaBuM!] ${KABUM_BUSCA_URLS.length} URLs multi-marca`);
    for (const url of KABUM_BUSCA_URLS) {
      const ofertas = await rasparBuscaKabum(url);
      todas.push(...ofertas);
    }

    // 2. PDPs fixos do catálogo (SKUs monitorados)
    const itens = CATALOGO.filter((item) => item.parser === 'kabum');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemKabum(item)));
    for (const r of settled) {
      if (r.status === 'fulfilled') todas.push(...r.value);
    }

    return dedupPorUrl(todas);
  },
};
