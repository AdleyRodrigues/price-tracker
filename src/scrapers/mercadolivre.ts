import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { MERCADO_LIVRE_BUSCA_URLS } from '../config/regras';
import { aceitarOferta } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { absolutoMercadoLivre, chaveOferta } from '../lib/url';
import { FonteScraper, Oferta, toOferta } from '../types/oferta';

export function parsearCardMercadoLivre($card: cheerio.Cheerio<any>): Oferta | null {
  const $titulo = $card.find('.poly-component__title, a.poly-component__title, .ui-search-item__title, h2').first();
  const titulo = $titulo.text().replace(/\s+/g, ' ').trim();
  if (!titulo) return null;

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

  const oferta = toOferta({
    loja: 'Mercado Livre',
    titulo,
    precoAVista,
    precoParcelado: precoAVista,
    detalhesParcelamento: parcelasTxt || undefined,
    frete: 0,
    url,
    fonteId: 'mercadolivre',
  });

  return aceitarOferta(oferta) ? oferta : null;
}

export function parsearBuscaMercadoLivre(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const cards = $('.poly-card, .ui-search-layout__item, .ui-search-result').toArray();

  for (const el of cards) {
    const o = parsearCardMercadoLivre($(el));
    if (o) {
      console.log(`[Mercado Livre] ${o.titulo} => ${formatBRL(o.precoAVista)} (Link: ${o.url})`);
      ofertas.push(o);
    }
  }

  return ofertas;
}

export const mercadoLivreScraper: FonteScraper = {
  id: 'mercadolivre',
  async coletar(): Promise<Oferta[]> {
    const todasOfertas: Oferta[] = [];

    // 1. Busca direta nas páginas de busca do Mercado Livre
    for (const url of MERCADO_LIVRE_BUSCA_URLS) {
      try {
        const { data: html } = await http.get<string>(url, {
          headers: {
            ...CHROME_HEADERS,
            Referer: 'https://www.mercadolivre.com.br/',
          },
          timeout: 8000,
        });

        // Se passar pelo bot challenge, extrai os cards
        if (!/Mercado Libre/i.test(html.slice(0, 500))) {
          const ofertas = parsearBuscaMercadoLivre(html);
          todasOfertas.push(...ofertas);
        }
      } catch (err) {
        console.warn(`[Mercado Livre] Busca ${url} não respondeu: ${detalheErro(err)}`);
      }
    }

    // 2. Busca suplementar na API de promoções do Promobit especificamente por Mercado Livre
    try {
      const mlApi = 'https://api.promobit.com.br/search?q=asus+mercado+livre';
      const { data } = await http.get<{ data?: { offers?: any[] }; offers?: any[] }>(mlApi, {
        headers: {
          ...CHROME_HEADERS,
          Referer: 'https://www.promobit.com.br/',
        },
        timeout: 10000,
      });

      const itens = data?.data?.offers || data?.offers || [];
      for (const item of itens) {
        const titulo = item.offer_title || '';
        const preco = typeof item.offer_price === 'number' ? item.offer_price : extrairPreco(String(item.offer_price || ''));
        const slug = item.offer_slug || '';
        const url = slug.startsWith('http') ? slug : `https://www.promobit.com.br/oferta/${slug}`;

        if (preco > 0) {
          const oferta = toOferta({
            loja: 'Mercado Livre (via Promobit)',
            titulo,
            precoAVista: preco,
            precoParcelado: preco,
            frete: 0,
            url,
            fonteId: 'mercadolivre',
          });

          if (aceitarOferta(oferta)) {
            console.log(`[Mercado Livre (Promobit)] ${oferta.titulo} => ${formatBRL(oferta.precoAVista)}`);
            todasOfertas.push(oferta);
          }
        }
      }
    } catch {}

    // Deduplica por URL
    const mapa = new Map<string, Oferta>();
    for (const o of todasOfertas) {
      const chave = o.url.trim().toLowerCase();
      const existente = mapa.get(chave);
      if (!existente || o.precoTotal < existente.precoTotal) {
        mapa.set(chave, o);
      }
    }

    return [...mapa.values()];
  },
};
