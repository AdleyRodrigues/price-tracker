import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../../config/http';
import { CATALOGO_CELULAR, ItemCatalogoCelular } from '../../config/regras-celular';
import { aplicarCupomEmOferta } from '../../domain/cupons';
import { extrairPreco } from '../../lib/preco';
import { Oferta, toOferta } from '../../types/oferta';
import { parsearKabum } from '../kabum';
import { parsearShopee } from '../shopee';

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

export async function rasparItemCatalogoCelular(item: ItemCatalogoCelular): Promise<Oferta[]> {
  try {
    const html = await baixarHtml(item.url, {
      Referer: item.url.includes('kabum') ? 'https://www.kabum.com.br/' : 'https://shopee.com.br/',
    });

    if (item.parser === 'kabum') {
      const bruta = parsearKabum(html, item as any);
      const oferta = toOferta(bruta);
      return [aplicarCupomEmOferta(oferta)];
    }

    if (item.parser === 'shopee') {
      const bruta = parsearShopee(html, item as any);
      const oferta = toOferta(bruta);
      return [aplicarCupomEmOferta(oferta)];
    }

    if (item.parser === 'mercadolivre') {
      const $ = cheerio.load(html);
      let titulo = item.produto;
      const h1 = $('h1.ui-pdp-title, h1').first().text().trim();
      if (h1) titulo = h1;

      const fraction = $('.andes-money-amount__fraction').first().text().trim();
      const cents = $('.andes-money-amount__cents').first().text().trim();
      let precoAVista = fraction ? extrairPreco(cents ? `${fraction},${cents}` : fraction) : 0;
      const installments = $(
        '.ui-pdp-price__subtitles, .ui-pdp-color--GREEN, .ui-pdp-price__installments'
      )
        .first()
        .text()
        .trim();

      if (precoAVista <= 0) {
        const metaPrice = $('meta[property="product:price:amount"], meta[name="twitter:data1"]').attr('content');
        if (metaPrice) precoAVista = extrairPreco(metaPrice);
      }

      if (precoAVista <= 0) {
        throw new Error('Preço não encontrado na página direta do Mercado Livre');
      }

      const oferta = toOferta({
        loja: 'Mercado Livre',
        titulo,
        precoAVista,
        precoParcelado: precoAVista,
        detalhesParcelamento: installments || undefined,
        frete: item.freteFallback ?? 0,
        url: item.url,
        fonteId: 'mercadolivre',
      });

      return [aplicarCupomEmOferta(oferta)];
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
