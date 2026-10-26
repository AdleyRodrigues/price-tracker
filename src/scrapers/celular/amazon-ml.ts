import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../../config/http';
import {
  AMAZON_BUSCA_URLS_CELULAR,
  MERCADO_LIVRE_BUSCA_URLS_CELULAR,
} from '../../config/regras-celular';
import { aceitarOfertaCelular, validarTituloCelular } from '../../domain/filtros-celular';
import { aplicarCupomEmOferta } from '../../domain/cupons';
import { extrairPreco } from '../../lib/preco';
import { absolutoMercadoLivre, chaveOferta } from '../../lib/url';
import { Oferta, toOferta } from '../../types/oferta';

async function baixarHtml(url: string, headersCustom?: Record<string, string>): Promise<string> {
  const { data } = await http.get<string>(url, {
    headers: {
      ...CHROME_HEADERS,
      ...headersCustom,
    },
    timeout: 10000,
  });
  return data;
}

export function parsearCardMercadoLivreCelular($card: cheerio.Cheerio<any>): Oferta | null {
  const $titulo = $card
    .find('.poly-component__title, a.poly-component__title, .promotion-item__title, .ui-search-item__title')
    .first();
  const titulo = $titulo.text().replace(/\s+/g, ' ').trim();
  if (!validarTituloCelular(titulo)) return null;

  const href =
    $card.find('a.poly-component__title, a.poly-component__link, a.ui-search-link').first().attr('href') ||
    $titulo.attr('href') ||
    $card.find('a[href*="mercadolivre.com.br"]').first().attr('href') ||
    '';
  const url = chaveOferta(absolutoMercadoLivre(href));
  if (!url) return null;

  const fraction = $card
    .find(
      '.poly-price__current .andes-money-amount__fraction, .ui-search-price__second-line .andes-money-amount__fraction'
    )
    .first()
    .text()
    .trim();
  const cents = $card
    .find(
      '.poly-price__current .andes-money-amount__cents, .ui-search-price__second-line .andes-money-amount__cents'
    )
    .first()
    .text()
    .trim();
  let precoAVista = fraction ? extrairPreco(cents ? `${fraction},${cents}` : fraction) : Number.NaN;

  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    precoAVista = extrairPreco($card.find('.poly-price__current, .ui-search-price__second-line').first().text());
  }
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) return null;

  const parcelasTxt = $card.find('.poly-price__installments, .ui-search-installments').first().text().trim();
  const cupomTag = $card.find('.poly-coupon, [class*="coupon"], [class*="cupom"]').first().text().trim() || undefined;

  const oferta = toOferta({
    loja: 'Mercado Livre',
    titulo,
    precoAVista,
    precoParcelado: precoAVista,
    detalhesParcelamento: parcelasTxt || undefined,
    frete: 0,
    url,
    cupomTag,
    fonteId: 'mercadolivre',
  });

  return aplicarCupomEmOferta(oferta);
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
    let precoAVista = 0;

    if (priceWhole) {
      precoAVista = Number(`${priceWhole}.${priceFraction}`);
    } else {
      const priceText = $card.find('.a-price .a-offscreen').first().text().trim();
      precoAVista = extrairPreco(priceText);
    }

    if (!Number.isFinite(precoAVista) || precoAVista <= 0) return;

    const cupomTag = $card.find('.s-coupon-highlight-color, [class*="coupon"]').first().text().trim() || undefined;

    const oferta = toOferta({
      loja: 'Amazon',
      titulo,
      precoAVista,
      cupomTag,
      frete: 0,
      url,
      fonteId: 'amazon',
    });

    const ofertaComCupom = aplicarCupomEmOferta(oferta);
    if (aceitarOfertaCelular(ofertaComCupom)) {
      ofertas.push(ofertaComCupom);
    }
  });

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
        if (o && aceitarOfertaCelular(o)) {
          ofertas.push(o);
        }
      });
    } catch (err) {
      console.warn(`[Mercado Livre Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}
