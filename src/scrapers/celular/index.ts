import { aceitarOfertaCelular } from '../../domain/filtros-celular';
import { Oferta } from '../../types/oferta';
import {
  coletarBuscapeCelular,
  coletarZoomCelular,
  parsearCardsZoomBuscape,
} from './zoom-buscape';
import { coletarKabumBuscaCelular, parsearBuscaKabumCelular } from './kabum';
import { coletarPromobitCelular, mapearJsonPromobitCelular, PromobitOffer } from './promobit';
import {
  coletarAmazonCelular,
  coletarMercadoLivreCelular,
  parsearBuscaAmazonCelular,
  parsearCardMercadoLivreCelular,
} from './amazon-ml';
import { coletarCatalogoCelular, rasparItemCatalogoCelular } from './catalogo';

export {
  parsearCardsZoomBuscape,
  coletarZoomCelular,
  coletarBuscapeCelular,
  parsearBuscaKabumCelular,
  coletarKabumBuscaCelular,
  mapearJsonPromobitCelular,
  coletarPromobitCelular,
  PromobitOffer,
  parsearBuscaAmazonCelular,
  coletarAmazonCelular,
  parsearCardMercadoLivreCelular,
  coletarMercadoLivreCelular,
  rasparItemCatalogoCelular,
  coletarCatalogoCelular,
};

export async function coletarOfertasCelular(): Promise<Oferta[]> {
  const settled = await Promise.allSettled([
    coletarZoomCelular(),
    coletarBuscapeCelular(),
    coletarKabumBuscaCelular(),
    coletarPromobitCelular(),
    coletarAmazonCelular(),
    coletarMercadoLivreCelular(),
    coletarCatalogoCelular(),
  ]);

  const brutas: Oferta[] = [];
  for (const res of settled) {
    if (res.status === 'fulfilled') {
      brutas.push(...res.value);
    }
  }

  const validas = brutas.filter(aceitarOfertaCelular);
  const mapa = new Map<string, Oferta>();

  for (const o of validas) {
    // Normaliza chave para deduplicar mesma oferta entre fontes
    const tituloNorm = o.titulo.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const precoNorm = Math.round((o.precoComCupom ?? o.precoTotal) * 10);
    const lojaNorm = o.loja.split('(')[0].trim().toLowerCase();
    const chave = `${lojaNorm}_${tituloNorm}_${precoNorm}`;

    const existente = mapa.get(chave);
    if (!existente || o.precoTotal < existente.precoTotal) {
      mapa.set(chave, o);
    }
  }

  return [...mapa.values()];
}
