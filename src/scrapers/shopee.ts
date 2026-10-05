import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function parsearShopee(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);
  
  let titulo = item.produto;
  let precoAVista = 0;
  let precoParcelado: number | undefined;

  // 1. Tenta extrair do meta ou title tag
  const pageTitle = $('title').text().trim();
  if (pageTitle && pageTitle.includes('ASUS')) {
    titulo = pageTitle.replace(/\s*\|\s*Shopee\s*Brasil.*$/i, '').trim();
  }

  // 2. Tenta extrair JSON-LD ou meta tags
  const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
  if (metaPrice) {
    precoAVista = extrairPreco(metaPrice);
  }

  // 3. Fallback nos blocos de preço do HTML se presentes
  if (precoAVista <= 0) {
    const priceText = $('[class*="price"]').filter((_, el) => /R\$\s*[\d.]+/i.test($(el).text())).first().text().trim();
    if (priceText) {
      precoAVista = extrairPreco(priceText);
    }
  }

  if (precoAVista <= 0) {
    throw new Error('Preço não encontrado no HTML da Shopee (autenticação/bot wall ativa)');
  }

  console.log(`[Shopee] ${titulo} => à vista: ${formatBRL(precoAVista)}`);

  return {
    loja: 'Shopee (Loja ASUS)',
    titulo,
    precoAVista,
    precoParcelado,
    frete: item.freteFallback ?? 0,
    url: item.url,
    fonteId: 'shopee',
  };
}

async function rasparItemShopee(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: {
        ...CHROME_HEADERS,
        'Referer': 'https://shopee.com.br/',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    return [toOferta(parsearShopee(html, item))];
  } catch (err) {
    console.warn(`[Shopee] Link direto ${item.url} não retornou preço estático (${detalheErro(err)}).`);
    return [];
  }
}

export const shopeeScraper: FonteScraper = {
  id: 'shopee',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'shopee');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemShopee(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
