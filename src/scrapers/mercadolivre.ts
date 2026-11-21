import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { MERCADO_LIVRE_BUSCA_URLS, PROMOBIT_SEARCH_APIS } from '../config/regras';
import { aceitarOferta } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { absolutoMercadoLivre, chaveOferta } from '../lib/url';
import { FonteScraper, Oferta, toOferta } from '../types/oferta';

function ehChallengeMercadoLivre(html: string): boolean {
  const head = html.slice(0, 4000);
  return /captcha|challenge|cx-challenge|bot.?detection|security.?check|cf-browser-verification/i.test(
    head
  );
}

export function parsearCardMercadoLivre($card: cheerio.Cheerio<any>): Oferta | null {
  const $titulo = $card
    .find('.poly-component__title, a.poly-component__title, .ui-search-item__title, h2')
    .first();
  const titulo = $titulo.text().replace(/\s+/g, ' ').trim();
  if (!titulo) return null;

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
    precoAVista = extrairPreco(
      $card.find('.poly-price__current, .ui-search-price__second-line').first().text()
    );
  }
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) return null;

  const parcelasTxt = $card
    .find('.poly-price__installments, .ui-search-installments')
    .first()
    .text()
    .trim();

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

export const mercadoLivreScraper: FonteScraper = {
  id: 'mercadolivre',
  async coletar(): Promise<Oferta[]> {
    const todasOfertas: Oferta[] = [];

    // 1. Busca direta multi-marca (ASUS / Acer / Avell / Lenovo / Dell / Gigabyte)
    console.log(`[Mercado Livre] ${MERCADO_LIVRE_BUSCA_URLS.length} URLs multi-marca`);
    for (const url of MERCADO_LIVRE_BUSCA_URLS) {
      try {
        const res = await http.get<string>(url, {
          headers: {
            ...CHROME_HEADERS,
            Referer: 'https://www.mercadolivre.com.br/',
          },
          timeout: 8000,
          validateStatus: () => true,
        });

        if (res.status === 403 || res.status === 429) {
          console.warn(`[Mercado Livre] HTTP ${res.status} (bloqueio) em ${url}`);
          continue;
        }
        if (res.status >= 400) {
          console.warn(`[Mercado Livre] HTTP ${res.status} em ${url}`);
          continue;
        }

        const html = typeof res.data === 'string' ? res.data : '';
        if (ehChallengeMercadoLivre(html)) {
          console.warn(`[Mercado Livre] Challenge/captcha em ${url}`);
          continue;
        }

        const ofertas = parsearBuscaMercadoLivre(html);
        if (ofertas.length === 0) {
          console.warn(`[Mercado Livre] 0 cards aceitos em ${url}`);
        } else {
          console.log(`[Mercado Livre] ${ofertas.length} oferta(s) em ${url}`);
        }
        todasOfertas.push(...ofertas);
      } catch (err) {
        console.warn(`[Mercado Livre] Busca ${url} não respondeu: ${detalheErro(err)}`);
      }
    }

    // 2. Promobit API — uma query por termo/marca (não só "asus")
    for (const mlApi of PROMOBIT_SEARCH_APIS) {
      try {
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
          const preco =
            typeof item.offer_price === 'number'
              ? item.offer_price
              : extrairPreco(String(item.offer_price || ''));
          const slug = item.offer_slug || '';
          const url = slug.startsWith('http')
            ? slug
            : `https://www.promobit.com.br/oferta/${slug}`;

          // Só ofertas que apontam para ML (quando a API traz loja/url)
          const lojaRaw = String(item.store_name || item.offer_store || url || '');
          if (lojaRaw && !/mercado\s*livre|mercadolivre/i.test(lojaRaw) && !/mercadolivre\.com/i.test(url)) {
            continue;
          }

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
              console.log(
                `[Mercado Livre (Promobit)] ${oferta.titulo} => ${formatBRL(oferta.precoAVista)}`
              );
              todasOfertas.push(oferta);
            }
          }
        }
      } catch (err) {
        console.warn(`[Mercado Livre] Promobit ${mlApi}: ${detalheErro(err)}`);
      }
    }

    return dedupPorUrl(todasOfertas);
  },
};
