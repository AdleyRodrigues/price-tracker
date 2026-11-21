/**
 * ReefAPI — KaBuM! JSON (PIX vs cartão separados).
 * Docs: https://reefapi.com/docs/kabum
 * Gate: REEF_API_KEY
 */

import { http, detalheErro } from '../../config/http';
import { MARCAS_COM_SERIE, TERMOS_POR_MARCA } from '../../config/busca-multi-marca';
import { aceitarOferta } from '../../domain/filtros';
import { FonteScraper, Oferta, toOferta } from '../../types/oferta';

const REEF_SEARCH = 'https://api.reefapi.com/kabum/v1/search';

type ReefProduct = {
  product_id?: number | string;
  title?: string;
  url?: string;
  brand?: string;
  cash_price_brl?: number | null;
  price_brl?: number | null;
  pix_price_brl?: number | null;
  in_stock?: boolean;
  installments?: { text?: string; count?: number; amount_brl?: number } | null;
};

function termosBusca(): string[] {
  const out: string[] = [];
  for (const marca of MARCAS_COM_SERIE) {
    for (const t of TERMOS_POR_MARCA[marca]) {
      out.push(/^notebook\b/i.test(t) ? t : `notebook ${t}`);
    }
  }
  return [...new Set(out)];
}

function mapearProduto(p: ReefProduct): Oferta | null {
  const titulo = String(p.title ?? '').replace(/\s+/g, ' ').trim();
  const url = String(p.url ?? '').trim();
  if (!titulo || !url) return null;
  if (p.in_stock === false) return null;

  const aVista =
    Number(p.cash_price_brl ?? p.pix_price_brl ?? p.price_brl) || Number.NaN;
  if (!Number.isFinite(aVista) || aVista <= 0) return null;

  const parcelado = Number(p.price_brl);
  const oferta = toOferta({
    loja: 'KaBuM!',
    titulo,
    precoAVista: aVista,
    precoParcelado: Number.isFinite(parcelado) && parcelado > 0 ? parcelado : aVista,
    detalhesParcelamento: p.installments?.text || undefined,
    frete: 0,
    url,
    fonteId: 'reef-kabum',
    sku: p.product_id != null ? String(p.product_id) : undefined,
  });

  return aceitarOferta(oferta) ? oferta : null;
}

async function buscarTermo(apiKey: string, query: string): Promise<Oferta[]> {
  try {
    const { data, status } = await http.post<{
      ok?: boolean;
      data?: { products?: ReefProduct[] };
      products?: ReefProduct[];
    }>(
      REEF_SEARCH,
      { query, limit: 20 },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
        validateStatus: (s) => s < 500,
      }
    );

    if (status === 401 || status === 403) {
      console.warn('[reef-kabum] API key rejeitada — verifique REEF_API_KEY');
      return [];
    }
    if (status >= 400) {
      console.warn(`[reef-kabum] HTTP ${status} em search q="${query}"`);
      return [];
    }

    const products = data?.data?.products ?? data?.products ?? [];
    const out: Oferta[] = [];
    for (const p of products) {
      const o = mapearProduto(p);
      if (o) out.push(o);
    }
    return out;
  } catch (err) {
    console.warn(`[reef-kabum] falha q="${query}": ${detalheErro(err)}`);
    return [];
  }
}

export const reefKabumScraper: FonteScraper = {
  id: 'reef-kabum',
  async coletar(): Promise<Oferta[]> {
    const apiKey = process.env.REEF_API_KEY?.trim();
    if (!apiKey) {
      console.log('[reef-kabum] REEF_API_KEY ausente — pulando API (usando scraper KaBuM manual)');
      return [];
    }

    const todas: Oferta[] = [];
    for (const termo of termosBusca()) {
      const lote = await buscarTermo(apiKey, termo);
      todas.push(...lote);
    }
    console.log(`[reef-kabum] ${todas.length} oferta(s) após filtro`);
    return todas;
  },
};
