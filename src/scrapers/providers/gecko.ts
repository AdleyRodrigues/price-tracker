/**
 * GeckoAPI — extract PLP/PDP (ML, Amazon, Magalu, Shopee).
 * Docs: https://geckoapi.com.br/docs/
 * Gate: GECKO_API_KEY
 */

import { http, detalheErro } from '../../config/http';
import { MARCAS_COM_SERIE, TERMOS_POR_MARCA } from '../../config/busca-multi-marca';
import { aceitarOferta } from '../../domain/filtros';
import { FonteScraper, Oferta, toOferta } from '../../types/oferta';

const GECKO_EXTRACT = 'https://api.geckoapi.com.br/v1/extract';

type GeckoTarget =
  | 'mercadolivre.com.br'
  | 'amazon.com.br'
  | 'magazineluiza.com.br'
  | 'shopee.com.br';

const TARGETS: Array<{ target: GeckoTarget; loja: string }> = [
  { target: 'mercadolivre.com.br', loja: 'Mercado Livre' },
  { target: 'amazon.com.br', loja: 'Amazon' },
  { target: 'magazineluiza.com.br', loja: 'Magazine Luiza' },
  { target: 'shopee.com.br', loja: 'Shopee' },
];

type GeckoItem = {
  title?: string;
  name?: string;
  url?: string;
  offerUrl?: string;
  price?: number | string | null;
  priceCurrent?: number | string | null;
  currentPrice?: number | string | null;
  seller?: string | { name?: string } | null;
};

function termosBusca(): string[] {
  const out: string[] = [];
  for (const marca of MARCAS_COM_SERIE) {
    for (const t of TERMOS_POR_MARCA[marca]) {
      out.push(/^notebook\b/i.test(t) ? t : `notebook ${t}`);
    }
  }
  return [...new Set(out)].slice(0, 12); // limita créditos até ter key
}

function extrairPreco(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}

function mapearItem(item: GeckoItem, loja: string): Oferta | null {
  const titulo = String(item.title ?? item.name ?? '').replace(/\s+/g, ' ').trim();
  const url = String(item.url ?? item.offerUrl ?? '').trim();
  if (!titulo || !url.startsWith('http')) return null;

  const preco = extrairPreco(item.price ?? item.priceCurrent ?? item.currentPrice);
  if (!Number.isFinite(preco) || preco <= 0) return null;

  const oferta = toOferta({
    loja,
    titulo,
    precoAVista: preco,
    precoParcelado: preco,
    frete: 0,
    url,
    fonteId: 'gecko',
  });

  return aceitarOferta(oferta) ? oferta : null;
}

function itensDaResposta(data: unknown): GeckoItem[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const nested = root.data as Record<string, unknown> | undefined;
  const candidates = [
    root.items,
    root.products,
    root.results,
    nested?.items,
    nested?.products,
    nested?.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as GeckoItem[];
  }
  return [];
}

async function extrairPlp(
  apiKey: string,
  target: GeckoTarget,
  loja: string,
  keyword: string
): Promise<Oferta[]> {
  try {
    const { data, status } = await http.post(
      GECKO_EXTRACT,
      {
        target,
        type: 'plp',
        keyword,
        region: 'BR',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 90000,
        validateStatus: (s) => s < 500,
      }
    );

    if (status === 401 || status === 403) {
      console.warn('[gecko] API key rejeitada — verifique GECKO_API_KEY');
      return [];
    }
    if (status === 404) {
      // empty results / refund policy
      return [];
    }
    if (status >= 400) {
      console.warn(`[gecko] HTTP ${status} ${target} q="${keyword}"`);
      return [];
    }

    const out: Oferta[] = [];
    for (const item of itensDaResposta(data)) {
      const o = mapearItem(item, loja);
      if (o) out.push(o);
    }
    return out;
  } catch (err) {
    console.warn(`[gecko] falha ${target} q="${keyword}": ${detalheErro(err)}`);
    return [];
  }
}

export const geckoScraper: FonteScraper = {
  id: 'gecko',
  async coletar(): Promise<Oferta[]> {
    const apiKey = process.env.GECKO_API_KEY?.trim();
    if (!apiKey) {
      console.log('[gecko] GECKO_API_KEY ausente — pulando API (usando scrapers manuais)');
      return [];
    }

    const targetsEnv = process.env.GECKO_TARGETS?.trim();
    const targets = targetsEnv
      ? TARGETS.filter((t) => targetsEnv.split(',').map((s) => s.trim()).includes(t.target))
      : TARGETS.filter((t) => t.target !== 'shopee.com.br'); // Shopee custa mais créditos

    const todas: Oferta[] = [];
    for (const { target, loja } of targets) {
      for (const keyword of termosBusca()) {
        const lote = await extrairPlp(apiKey, target, loja, keyword);
        todas.push(...lote);
      }
    }
    console.log(`[gecko] ${todas.length} oferta(s) após filtro`);
    return todas;
  },
};
