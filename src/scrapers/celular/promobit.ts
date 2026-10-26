import { CHROME_HEADERS, detalheErro, http } from '../../config/http';
import { PROMOBIT_SEARCH_APIS_CELULAR } from '../../config/regras-celular';
import { aceitarOfertaCelular, validarTituloCelular } from '../../domain/filtros-celular';
import { aplicarCupomEmOferta, calcularDescontoCupom } from '../../domain/cupons';
import { formatBRL } from '../../lib/preco';
import { Oferta, toOferta } from '../../types/oferta';

export interface PromobitOffer {
  offer_title?: string;
  offer_price?: number;
  offer_slug?: string;
  offer_coupon?: string;
  offer_status_name?: string;
  offer_cta?: string;
  offer_installments?: number;
  offer_price_installment?: number;
  store?: { name?: string };
}

export function mapearJsonPromobitCelular(item: PromobitOffer): Oferta | null {
  const titulo = item.offer_title?.trim() ?? '';
  if (!validarTituloCelular(titulo)) return null;

  const preco = Number(item.offer_price);
  if (!Number.isFinite(preco) || preco <= 0) return null;

  const slug = item.offer_slug?.trim() ?? '';
  if (!slug) return null;

  const url = slug.startsWith('http') ? slug : `https://www.promobit.com.br/oferta/${slug}`;

  let precoParcelado: number | undefined;
  let detalhesParcelamento: string | undefined;
  if (item.offer_price_installment && item.offer_price_installment > 0) {
    precoParcelado = item.offer_price_installment;
    if (item.offer_installments && item.offer_installments > 1) {
      const vParc = Math.round((precoParcelado / item.offer_installments) * 100) / 100;
      detalhesParcelamento = `${item.offer_installments}x de ${formatBRL(vParc)} sem juros`;
    }
  }

  const cupomTag =
    item.offer_coupon?.trim() ||
    (/cupom/i.test(titulo) ? titulo.match(/cupom[:\s]+([A-Z0-9_-]{3,})/i)?.[1] : undefined);
  let precoComCupom: number | undefined;
  let cupomDesconto: number | undefined;

  if (cupomTag) {
    const resCupom = calcularDescontoCupom('Comunidade (Promobit)', precoParcelado, preco, cupomTag);
    if (resCupom) {
      precoComCupom = resCupom.precoComCupom;
      cupomDesconto = resCupom.cupomDesconto;
    }
  }

  const oferta = toOferta({
    loja: 'Comunidade (Promobit)',
    titulo,
    precoAVista: preco,
    precoParcelado,
    detalhesParcelamento,
    frete: 0,
    url,
    cupomTag,
    cupomDesconto,
    precoComCupom,
    fonteId: 'promobit',
  });

  return aplicarCupomEmOferta(oferta);
}

export async function coletarPromobitCelular(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];

  for (const apiUrl of PROMOBIT_SEARCH_APIS_CELULAR) {
    try {
      const { data } = await http.get<{
        data?: { offers?: PromobitOffer[] };
        active_offers?: PromobitOffer[];
        offers?: PromobitOffer[];
      }>(apiUrl, {
        headers: {
          ...CHROME_HEADERS,
          Referer: 'https://www.promobit.com.br/',
        },
        timeout: 10000,
      });

      const itens = data?.data?.offers || data?.active_offers || data?.offers || [];
      for (const item of itens) {
        const o = mapearJsonPromobitCelular(item);
        if (o && aceitarOfertaCelular(o)) {
          ofertas.push(o);
        }
      }
    } catch (err) {
      console.warn(`[Promobit Celular] API ${apiUrl} falhou: ${detalheErro(err)}`);
    }
  }

  return ofertas;
}
