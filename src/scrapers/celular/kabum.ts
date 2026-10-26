import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../../config/http';
import { KABUM_BUSCA_URLS_CELULAR } from '../../config/regras-celular';
import { aceitarOfertaCelular, validarTituloCelular } from '../../domain/filtros-celular';
import { aplicarCupomEmOferta } from '../../domain/cupons';
import { formatBRL } from '../../lib/preco';
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

export function parsearBuscaKabumCelular(html: string): Oferta[] {
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
      if (!validarTituloCelular(titulo)) continue;

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

      const ofertaComCupom = aplicarCupomEmOferta(oferta);
      if (aceitarOfertaCelular(ofertaComCupom)) {
        console.log(
          `[KaBuM! Celular (Busca)] ${ofertaComCupom.titulo} => à vista: ${formatBRL(ofertaComCupom.precoAVista)}${
            ofertaComCupom.precoComCupom ? ` (c/ cupom: ${formatBRL(ofertaComCupom.precoComCupom)})` : ''
          }`
        );
        ofertas.push(ofertaComCupom);
      }
    }
  } catch (err) {
    console.warn(`[KaBuM! Celular] Erro ao parsear JSON __NEXT_DATA__: ${detalheErro(err)}`);
  }

  return ofertas;
}

export async function coletarKabumBuscaCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const url of KABUM_BUSCA_URLS_CELULAR) {
    try {
      const html = await baixarHtml(url, {
        Referer: 'https://www.kabum.com.br/',
      });
      const extraidas = parsearBuscaKabumCelular(html);
      ofertas.push(...extraidas);
    } catch (err) {
      console.warn(`[KaBuM! Celular] Busca ${url} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}
