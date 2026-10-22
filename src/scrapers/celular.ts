import * as cheerio from 'cheerio';
import { baixarHtml, CHROME_HEADERS, detalheErro, http } from '../config/http';
import {
  AMAZON_BUSCA_URLS_CELULAR,
  CATALOGO_CELULAR,
  FRETE_FALLBACK_CELULAR,
  ItemCatalogoCelular,
  MERCADO_LIVRE_BUSCA_URLS_CELULAR,
  PROMOBIT_BUSCA_URLS_CELULAR,
  PROMOBIT_SEARCH_APIS_CELULAR,
} from '../config/regras-celular';
import { aceitarOfertaCelular, validarTituloCelular } from '../domain/filtros-celular';
import { calcularPrecoComCupom, extrairInformacoesCupom } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { absolutoMercadoLivre, chaveOferta } from '../lib/url';
import { Oferta, toOferta } from '../types/oferta';
import { PromobitOffer } from './promobit';
import { parsearKabum } from './kabum';
import { parsearShopee } from './shopee';

export function mapearJsonPromobitCelular(item: PromobitOffer): Oferta | null {
  const titulo = item.offer_title?.trim() || '';
  if (!validarTituloCelular(titulo)) {
    return null;
  }

  const precoAVista = typeof item.offer_price === 'number' ? item.offer_price : extrairPreco(String(item.offer_price || ''));
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    return null;
  }

  const precoParcelado = typeof item.offer_price_installment === 'number' && item.offer_price_installment > 0
    ? item.offer_price_installment
    : precoAVista;

  const parcelas = item.offer_installments && item.offer_installments > 0 ? item.offer_installments : 10;
  const valorParcela = Math.round((precoParcelado / parcelas) * 100) / 100;
  const detalhesParcelamento = `${parcelas}x de ${formatBRL(valorParcela)}${item.offer_price_installment ? '' : ' sem juros'}`;

  const cupomTag = item.offer_coupon?.trim() || undefined;
  const cupomInfo = extrairInformacoesCupom(`${cupomTag ?? ''} ${titulo}`);
  const { precoComCupom, cupomDesconto } = calcularPrecoComCupom(precoAVista, cupomInfo);

  const slug = item.offer_slug || '';
  const url = slug.startsWith('http') ? slug : `https://www.promobit.com.br/oferta/${slug}`;

  return toOferta({
    loja: 'Comunidade (Promobit)',
    titulo,
    precoAVista,
    precoParcelado,
    detalhesParcelamento,
    frete: 0,
    url,
    cupomTag,
    cupomDesconto,
    precoComCupom: precoComCupom !== undefined ? precoComCupom : undefined,
    fonteId: 'promobit',
  });
}

export function parsearCardMercadoLivreCelular($card: cheerio.Cheerio<any>): Oferta | null {
  const $titulo = $card.find('.poly-component__title, a.poly-component__title, .promotion-item__title, .ui-search-item__title').first();
  const titulo = $titulo.text().replace(/\s+/g, ' ').trim();
  if (!validarTituloCelular(titulo)) return null;

  const href =
    $card.find('a.poly-component__title, a.poly-component__link, a.ui-search-link').first().attr('href') ||
    $titulo.attr('href') ||
    $card.find('a[href*="mercadolivre.com.br"]').first().attr('href') ||
    '';
  const url = chaveOferta(absolutoMercadoLivre(href));
  if (!url) return null;

  const fraction = $card.find('.poly-price__current .andes-money-amount__fraction, .ui-search-price__second-line .andes-money-amount__fraction').first().text().trim();
  const cents = $card.find('.poly-price__current .andes-money-amount__cents, .ui-search-price__second-line .andes-money-amount__cents').first().text().trim();
  let precoAVista = fraction ? extrairPreco(cents ? `${fraction},${cents}` : fraction) : Number.NaN;

  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    precoAVista = extrairPreco($card.find('.poly-price__current, .ui-search-price__second-line').first().text());
  }
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) return null;

  const parcelasTxt = $card.find('.poly-price__installments, .ui-search-installments').first().text().trim();

  return toOferta({
    loja: 'Mercado Livre',
    titulo,
    precoAVista,
    precoParcelado: precoAVista,
    detalhesParcelamento: parcelasTxt || undefined,
    frete: 0,
    url,
    fonteId: 'mercadolivre',
  });
}

export function parsearBuscaAmazonCelular(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];

  $('[data-component-type="s-search-result"]').each((_, el) => {
    const $card = $(el);
    const titulo = $card.find('h2 a span, h2 span').first().text().trim();
    if (!validarTituloCelular(titulo)) return;

    const href = $card.find('h2 a').first().attr('href') || '';
    if (!href) return;
    const url = href.startsWith('http') ? href : `https://www.amazon.com.br${href}`;

    const priceWhole = $card.find('.a-price-whole').first().text().replace(/[.,]/g, '').trim();
    const priceFraction = $card.find('.a-price-fraction').first().text().trim() || '00';
    let precoAVista = Number.NaN;
    if (priceWhole) {
      precoAVista = Number(`${priceWhole}.${priceFraction}`);
    } else {
      const priceText = $card.find('.a-price .a-offscreen').first().text().trim();
      precoAVista = extrairPreco(priceText);
    }

    if (!Number.isFinite(precoAVista) || precoAVista <= 0) return;

    ofertas.push(
      toOferta({
        loja: 'Amazon',
        titulo,
        precoAVista,
        frete: 0,
        url,
        fonteId: 'amazon',
      })
    );
  });

  return ofertas;
}

export async function coletarPromobitCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const apiUrl of PROMOBIT_SEARCH_APIS_CELULAR) {
    try {
      const { data } = await http.get<{ data?: { offers?: PromobitOffer[] }; active_offers?: PromobitOffer[]; offers?: PromobitOffer[] }>(apiUrl, {
        headers: {
          ...CHROME_HEADERS,
          Referer: 'https://www.promobit.com.br/',
        },
        timeout: 10000,
      });

      const itens = data?.data?.offers || data?.active_offers || data?.offers || [];
      for (const item of itens) {
        const o = mapearJsonPromobitCelular(item);
        if (o) ofertas.push(o);
      }
    } catch (err) {
      console.warn(`[Promobit Celular] API ${apiUrl} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}

export async function coletarAmazonCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const url of AMAZON_BUSCA_URLS_CELULAR) {
    try {
      const html = await baixarHtml(url, {
        Referer: 'https://www.amazon.com.br/',
      });
      const extraidas = parsearBuscaAmazonCelular(html);
      ofertas.push(...extraidas);
    } catch (err) {
      console.warn(`[Amazon Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}

export async function coletarMercadoLivreCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const url of MERCADO_LIVRE_BUSCA_URLS_CELULAR) {
    try {
      const html = await baixarHtml(url, {
        Referer: 'https://www.mercadolivre.com.br/',
      });
      const $ = cheerio.load(html);
      $('.ui-search-layout__item, .poly-card, .promotion-item').each((_, el) => {
        const o = parsearCardMercadoLivreCelular($(el));
        if (o) ofertas.push(o);
      });
    } catch (err) {
      console.warn(`[Mercado Livre Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}

export async function rasparItemCatalogoCelular(item: ItemCatalogoCelular): Promise<Oferta[]> {
  try {
    const html = await baixarHtml(item.url, {
      Referer: item.url.includes('kabum') ? 'https://www.kabum.com.br/' : 'https://shopee.com.br/',
    });

    if (item.parser === 'kabum') {
      const bruta = parsearKabum(html, item as any);
      return [toOferta(bruta)];
    }

    if (item.parser === 'shopee') {
      const bruta = parsearShopee(html, item as any);
      return [toOferta(bruta)];
    }

    if (item.parser === 'mercadolivre') {
      const $ = cheerio.load(html);
      let titulo = item.produto;
      const h1 = $('h1.ui-pdp-title, h1').first().text().trim();
      if (h1) titulo = h1;

      const fraction = $('.andes-money-amount__fraction').first().text().trim();
      const cents = $('.andes-money-amount__cents').first().text().trim();
      let precoAVista = fraction ? extrairPreco(cents ? `${fraction},${cents}` : fraction) : 0;
      const installments = $('.ui-pdp-price__subtitles, .ui-pdp-color--GREEN, .ui-pdp-price__installments').first().text().trim();

      if (precoAVista <= 0) {
        const metaPrice = $('meta[property="product:price:amount"], meta[name="twitter:data1"]').attr('content');
        if (metaPrice) precoAVista = extrairPreco(metaPrice);
      }

      if (precoAVista <= 0) {
        throw new Error('Preço não encontrado na página direta do Mercado Livre');
      }

      return [
        toOferta({
          loja: 'Mercado Livre',
          titulo,
          precoAVista,
          precoParcelado: precoAVista,
          detalhesParcelamento: installments || undefined,
          frete: item.freteFallback ?? 0,
          url: item.url,
          fonteId: 'mercadolivre',
        }),
      ];
    }

    return [];
  } catch (err) {
    console.warn(`[Catálogo Celular] Falha ao raspar link direto ${item.loja} (${item.url}): ${detalheErro(err)}`);
    return [];
  }
}

export async function coletarCatalogoCelular(): Promise<Oferta[]> {
  const settled = await Promise.allSettled(
    CATALOGO_CELULAR.map((item) => rasparItemCatalogoCelular(item))
  );
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

export async function coletarOfertasCelular(): Promise<Oferta[]> {
  const settled = await Promise.allSettled([
    coletarPromobitCelular(),
    coletarAmazonCelular(),
    coletarMercadoLivreCelular(),
    coletarCatalogoCelular(),
  ]);

  const brutas: Oferta[] = [];
  for (const res of settled) {
    if (res.status === 'fulfilled') {
      brutas.push(...res.value);
    }
  }

  const validas = brutas.filter(aceitarOfertaCelular);
  const mapa = new Map<string, Oferta>();

  for (const o of validas) {
    const chave = o.url.trim().toLowerCase();
    const existente = mapa.get(chave);
    if (!existente || o.precoTotal < existente.precoTotal) {
      mapa.set(chave, o);
    }
  }

  return [...mapa.values()];
}
