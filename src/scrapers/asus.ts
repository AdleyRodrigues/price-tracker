import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import { ASUS_BUSCA_URLS } from '../config/regras';
import { aceitarOferta } from '../domain/filtros';
import { aplicarCupomEmOferta } from '../domain/cupons';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function parsearAsus(html: string, item: ItemCatalogo): OfertaBruta {
  const $ = cheerio.load(html);

  let titulo = item.produto;
  let precoAVista = 0;
  let precoParcelado: number | undefined;
  let parcelasTexto: string | undefined;
  let disponivel = true;

  // 1. Extração via JSON-LD
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
    } catch {}
  });

  // 2. Extração de Preço Parcelado via Meta Tag
  const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
  if (metaPrice) {
    const val = Number(metaPrice);
    if (val > 0) {
      precoParcelado = val;
      if (precoAVista <= 0) precoAVista = val;
    }
  }

  // Se o preço à vista ainda não foi encontrado, busca no HTML
  if (precoAVista <= 0) {
    const htmlPrice = $('span[data-price-type="finalPrice"], .price-final_price, .price').first().text().trim();
    if (htmlPrice) {
      precoAVista = extrairPreco(htmlPrice);
    }
  }

  if (precoParcelado && precoParcelado > 0) {
    const qtdParc = 10;
    const valorParc = Math.round((precoParcelado / qtdParc) * 100) / 100;
    parcelasTexto = `${qtdParc}x de ${formatBRL(valorParc)} sem juros`;
  }

  if (!disponivel) {
    throw new Error('Produto esgotado / indisponível na Loja Oficial ASUS');
  }

  if (precoAVista <= 0) {
    throw new Error('Preço não encontrado no HTML da Loja ASUS');
  }

  const bruta: OfertaBruta = {
    loja: 'Loja Oficial ASUS',
    titulo,
    precoAVista,
    precoParcelado,
    detalhesParcelamento: parcelasTexto,
    frete: item.freteFallback ?? 0,
    url: item.url,
    fonteId: 'asus',
  };

  const ofertaComCupom = aplicarCupomEmOferta(toOferta(bruta));
  if (ofertaComCupom.cupomTag) {
    bruta.cupomTag = ofertaComCupom.cupomTag;
    bruta.cupomDesconto = ofertaComCupom.cupomDesconto;
    bruta.precoComCupom = ofertaComCupom.precoComCupom;
  }

  console.log(`[Loja ASUS] ${titulo} => à vista: ${formatBRL(precoAVista)}${bruta.precoComCupom ? ` (c/ cupom ${bruta.cupomTag}: ${formatBRL(bruta.precoComCupom)})` : ''} (parcelado: ${precoParcelado ? formatBRL(precoParcelado) : 'N/A'})`);

  return bruta;
}

export function parsearBuscaAsus(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const items = $('.product-item, .item.product').toArray();

  for (const el of items) {
    const card = $(el);
    const linkEl = card.find('a.product-item-link').first();
    const titulo = linkEl.text().trim();
    const url = linkEl.attr('href')?.trim();

    if (!titulo || !url) continue;

    // 1. Preço à vista (container com desconto à vista/Pix ou preço final)
    const textoAVista = card.find('.price-management-onetime .price').first().text().trim();
    const textoFinal = card.find('[data-price-type="finalPrice"] .price, .special-price .price, .price-final_price .price, .price').first().text().trim();

    const precoAVista = textoAVista ? extrairPreco(textoAVista) : extrairPreco(textoFinal);
    if (!Number.isFinite(precoAVista) || precoAVista <= 0) continue;

    // 2. Preço parcelado e parcelas
    let precoParcelado: number | undefined;
    let detalhesParcelamento: string | undefined;

    const textoInst = card.find('.price-management-installments').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (textoInst) {
      const matchInst = textoInst.match(/(\d{1,2})x\s*de\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
      const matchTotal = textoInst.match(/Total\s*(?:de)?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
      if (matchInst) {
        detalhesParcelamento = `${matchInst[1]}x de R$ ${matchInst[2]}`;
      }
      if (matchTotal) {
        precoParcelado = extrairPreco(matchTotal[1]);
      }
    }

    if (!precoParcelado && textoFinal) {
      const valFinal = extrairPreco(textoFinal);
      if (valFinal > precoAVista) {
        precoParcelado = valFinal;
      }
    }

    const sku = card.find('[data-bv-product-id]').attr('data-bv-product-id') ||
                card.find('[data-product-id]').attr('data-product-id');

    const oferta = toOferta({
      loja: 'Loja Oficial ASUS',
      titulo,
      precoAVista,
      precoParcelado,
      detalhesParcelamento,
      frete: 0,
      url,
      fonteId: 'asus',
      sku,
    });

    const ofertaComCupom = aplicarCupomEmOferta(oferta);

    if (aceitarOferta(ofertaComCupom)) {
      console.log(`[Loja ASUS (Busca)] ${ofertaComCupom.titulo} => à vista: ${formatBRL(ofertaComCupom.precoAVista)}${ofertaComCupom.precoComCupom ? ` (c/ cupom ${ofertaComCupom.cupomTag}: ${formatBRL(ofertaComCupom.precoComCupom)})` : ''} (parcelado: ${ofertaComCupom.precoParcelado ? formatBRL(ofertaComCupom.precoParcelado) : 'N/A'})`);
      ofertas.push(ofertaComCupom);
    }
  }

  return ofertas;
}

async function rasparItemAsus(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const { data: html } = await http.get<string>(item.url, {
      headers: {
        ...CHROME_HEADERS,
        Referer: 'https://br.store.asus.com/',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    return [toOferta(parsearAsus(html, item))];
  } catch (err) {
    console.error(`[Loja ASUS] Falha ao raspar ${item.url}: ${detalheErro(err)}`);
    return [];
  }
}

export const asusScraper: FonteScraper = {
  id: 'asus',
  async coletar(): Promise<Oferta[]> {
    const todasOfertas: Oferta[] = [];

    // 1. Busca ativa nas rotas de busca da Loja ASUS
    for (const url of ASUS_BUSCA_URLS) {
      try {
        const { data: html } = await http.get<string>(url, {
          headers: {
            ...CHROME_HEADERS,
            Referer: 'https://br.store.asus.com/',
          },
          timeout: 10000,
          signal: AbortSignal.timeout(10000),
        });

        const ofertasBusca = parsearBuscaAsus(html);
        todasOfertas.push(...ofertasBusca);
      } catch (err) {
        console.error(`[Loja ASUS - Busca] Falha em ${url}: ${detalheErro(err)}`);
      }
    }

    // 2. Links diretos pontuais cadastrados no catálogo
    const itens = CATALOGO.filter((item) => item.parser === 'asus');
    const settled = await Promise.allSettled(itens.map((item) => rasparItemAsus(item)));
    for (const res of settled) {
      if (res.status === 'fulfilled') {
        todasOfertas.push(...res.value);
      }
    }

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
