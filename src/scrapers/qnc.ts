import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { QNC_BUSCA_URLS } from '../config/regras';
import { aceitarOferta } from '../domain/filtros';
import { aplicarCupomEmOferta } from '../domain/cupons';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, toOferta } from '../types/oferta';

export function parsearBuscaQNC(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];

  // 1. Formato 1: Página de busca (/ ?s=...) usando <article>
  const articles = $('article').toArray();
  for (const el of articles) {
    const card = $(el);
    const postTitle = card.find('.post-title a').first();
    const tituloBase = postTitle.clone().children().remove().end().text().trim();
    const url = postTitle.attr('href')?.trim();
    if (!tituloBase || !url) continue;

    const availEl = card.find('.availability').first();
    const isOutOfStock = availEl.hasClass('out-of-stock') || /sem\s*estoque/i.test(availEl.text());
    if (isOutOfStock) continue;

    const precoAVista = extrairPreco(availEl.text());
    if (!Number.isFinite(precoAVista) || precoAVista <= 0) continue;

    const specsItems = card
      .find('ul.specs_short_list li:not(.availability)')
      .map((_, li) => $(li).text().trim())
      .get();
    
    const specsLimpos = specsItems.filter((s) => !/teclado|garantia/i.test(s)).join(' ');
    const titulo = `Notebook ${tituloBase} ${specsLimpos}`.replace(/\s+/g, ' ').trim();
    const cupomTag = card.find('.coupon-code').first().text().trim() || undefined;

    const oferta = toOferta({
      loja: 'Qual Notebook Comprar',
      titulo,
      precoAVista,
      precoParcelado: precoAVista,
      cupomTag,
      frete: 0,
      url,
      fonteId: 'qnc',
    });

    const ofertaComCupom = aplicarCupomEmOferta(oferta);
    if (aceitarOferta(ofertaComCupom)) {
      console.log(`[Qual Notebook Comprar] ${ofertaComCupom.titulo} => ${formatBRL(ofertaComCupom.precoComCupom ?? ofertaComCupom.precoAVista)}${ofertaComCupom.cupomTag ? ` [Cupom: ${ofertaComCupom.cupomTag}]` : ''} (Link: ${ofertaComCupom.url})`);
      ofertas.push(ofertaComCupom);
    }
  }

  // 2. Formato 2: Página de ofertas (/ofertas/...) usando .list_item.laptop
  const listItems = $('.list_item.laptop').toArray();
  for (const el of listItems) {
    const card = $(el);
    const linkEl = card.find('.infos h4 a, a').first();
    const tituloBase = linkEl.text().replace(/\s+/g, ' ').trim();
    let url = linkEl.attr('href')?.trim();
    if (!tituloBase || !url) continue;
    if (url.startsWith('..')) {
      url = `https://quenotebookcomprar.com.br${url.replace(/^\.\./, '')}`;
    }

    const specsItems = card.find('.spec_stamps.mobile span').map((_, s) => $(s).text().trim()).get();
    const specsLimpos = specsItems.filter((s) => !/teclado|garantia/i.test(s)).join(' ');
    const titulo = `Notebook ${tituloBase} ${specsLimpos}`.replace(/\s+/g, ' ').trim();

    const priceItems = card.find('.all-prices-item').toArray();
    for (const p of priceItems) {
      const $p = $(p);
      const storeClass = $p.find('.store').attr('class') || '';
      const matchStore = storeClass.match(/store\s+([a-z0-9_-]+)/i);
      const lojaId = matchStore ? matchStore[1].toLowerCase() : 'qnc';

      let nomeLoja = 'Qual Notebook Comprar';
      if (lojaId === 'asus') nomeLoja = 'Loja Oficial ASUS';
      else if (lojaId === 'mercadolivre') nomeLoja = 'Mercado Livre';
      else if (lojaId === 'amazon') nomeLoja = 'Amazon';
      else if (lojaId === 'kabum') nomeLoja = 'KaBuM!';
      else if (lojaId === 'magazine') nomeLoja = 'Magazine Luiza';

      const cupomTag = $p.find('.coupon-code').text().trim() || undefined;
      const precoTxt = $p.find('.lowest-price, .price').first().text().trim();
      const precoAVista = extrairPreco(precoTxt);
      if (!Number.isFinite(precoAVista) || precoAVista <= 0) continue;

      const oferta = toOferta({
        loja: nomeLoja,
        titulo,
        precoAVista,
        precoParcelado: precoAVista,
        cupomTag,
        frete: 0,
        url,
        fonteId: 'qnc',
      });

      const ofertaComCupom = aplicarCupomEmOferta(oferta);
      if (aceitarOferta(ofertaComCupom)) {
        console.log(`[Qual Notebook Comprar (Ofertas)] ${ofertaComCupom.titulo} (${ofertaComCupom.loja}) => ${formatBRL(ofertaComCupom.precoComCupom ?? ofertaComCupom.precoAVista)}${ofertaComCupom.cupomTag ? ` [Cupom: ${ofertaComCupom.cupomTag}]` : ''}`);
        ofertas.push(ofertaComCupom);
      }
    }
  }

  return ofertas;
}

export const qncScraper: FonteScraper = {
  id: 'qnc',
  async coletar(): Promise<Oferta[]> {
    const todasOfertas: Oferta[] = [];

    for (const url of QNC_BUSCA_URLS) {
      try {
        const { data: html } = await http.get<string>(url, {
          headers: {
            ...CHROME_HEADERS,
            Referer: 'https://quenotebookcomprar.com.br/',
          },
          timeout: 10000,
        });

        const ofertas = parsearBuscaQNC(html);
        todasOfertas.push(...ofertas);
      } catch (err) {
        console.error(`[Qual Notebook Comprar] Falha em ${url}: ${detalheErro(err)}`);
      }
    }

    // Deduplica por URL e loja
    const mapa = new Map<string, Oferta>();
    for (const o of todasOfertas) {
      const chave = `${o.loja}_${o.url}`.trim().toLowerCase();
      const existente = mapa.get(chave);
      if (!existente || o.precoTotal < existente.precoTotal) {
        mapa.set(chave, o);
      }
    }

    return [...mapa.values()];
  },
};
