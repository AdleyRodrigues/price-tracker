import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../../config/http';
import {
  BUSCAPE_BUSCA_URLS_CELULAR,
  PRECO_MINIMO_CELULAR,
  ZOOM_BUSCA_URLS_CELULAR,
} from '../../config/regras-celular';
import { aceitarOfertaCelular, validarTituloCelular } from '../../domain/filtros-celular';
import { aplicarCupomEmOferta } from '../../domain/cupons';
import { extrairPreco, formatBRL } from '../../lib/preco';
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

export function parsearCardsZoomBuscape(html: string, fonte: 'zoom' | 'buscape'): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const links = $('a[href*="/celular/"], a[href*="/smartphone/"], a[data-testid*="product-card"], a[href*="/lead"]').toArray();
  const baseDomain = fonte === 'zoom' ? 'https://www.zoom.com.br' : 'https://www.buscape.com.br';
  const nomePadrao = fonte === 'zoom' ? 'Zoom (Comparador)' : 'Buscapé';

  for (const el of links) {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (!href || href === '#' || href.startsWith('javascript:')) continue;
    const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;

    const titulo =
      $a.find('[data-testid="product-card::name"], h2, [class*="Name"]').first().text().trim() ||
      $a.find('h2').text().trim() ||
      $a.attr('title') ||
      '';

    if (!validarTituloCelular(titulo)) continue;

    const precoText = $a.find('[data-testid="product-card::price"], [class*="price"], [class*="Price"]').first().text().trim();
    const preco = extrairPreco(precoText);
    if (!preco || preco < PRECO_MINIMO_CELULAR) continue;

    const textoCard = $a.text().replace(/\s+/g, ' ');
    const matchLoja = textoCard.match(/Via\s+([A-Za-z0-9\s]+?)(?:\s*R\$|\s*\d{1,2}x|$)/i);
    const lojaDetectada = matchLoja?.[1]?.trim() || '';
    const nomeLoja = lojaDetectada ? `${lojaDetectada} (via ${fonte === 'zoom' ? 'Zoom' : 'Buscapé'})` : nomePadrao;
    const parcText = textoCard.match(/(\d{1,2}x\s*de\s*R\$\s*[\d.,]+)/i)?.[1] || undefined;

    const oferta = toOferta({
      loja: nomeLoja,
      titulo,
      precoAVista: preco,
      precoParcelado: preco,
      detalhesParcelamento: parcText,
      frete: 0,
      url: fullUrl,
      fonteId: fonte,
    });

    const comCupom = aplicarCupomEmOferta(oferta);
    if (aceitarOfertaCelular(comCupom)) {
      ofertas.push(comCupom);
    }
  }

  return ofertas;
}

export async function coletarZoomCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const url of ZOOM_BUSCA_URLS_CELULAR) {
    try {
      const html = await baixarHtml(url, {
        Referer: 'https://www.zoom.com.br/',
      });
      const extraidas = parsearCardsZoomBuscape(html, 'zoom');
      for (const o of extraidas) {
        console.log(`[Zoom Celular (Busca)] [${o.loja}] ${o.titulo} => ${formatBRL(o.precoAVista)} (Link: ${o.url})`);
      }
      ofertas.push(...extraidas);
    } catch (err) {
      console.warn(`[Zoom Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}

export async function coletarBuscapeCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const url of BUSCAPE_BUSCA_URLS_CELULAR) {
    try {
      const html = await baixarHtml(url, {
        Referer: 'https://www.buscape.com.br/',
      });
      const extraidas = parsearCardsZoomBuscape(html, 'buscape');
      for (const o of extraidas) {
        console.log(`[Buscapé Celular (Busca)] [${o.loja}] ${o.titulo} => ${formatBRL(o.precoAVista)} (Link: ${o.url})`);
      }
      ofertas.push(...extraidas);
    } catch (err) {
      console.warn(`[Buscapé Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}
