/**
 * Apify — actors prontos (KaBuM, Pichau, Terabyte, Fast Shop, Acer…).
 * Docs: https://docs.apify.com/api/v2
 * Gate: APIFY_API_KEY + APIFY_ACTOR_* (IDs dos actors)
 */

import { http, detalheErro } from '../../config/http';
import { MARCAS_COM_SERIE, TERMOS_POR_MARCA } from '../../config/busca-multi-marca';
import { aceitarOferta } from '../../domain/filtros';
import { FonteScraper, Oferta, toOferta } from '../../types/oferta';

const APIFY_API = 'https://api.apify.com/v2';

type ActorConfig = {
  envKey: string;
  loja: string;
};

/** Actors opcionais — cada um só roda se o env correspondente existir. */
const ACTORS: ActorConfig[] = [
  { envKey: 'APIFY_ACTOR_KABUM', loja: 'KaBuM!' },
  { envKey: 'APIFY_ACTOR_PICHAU', loja: 'Pichau' },
  { envKey: 'APIFY_ACTOR_TERABYTE', loja: 'Terabyte' },
  { envKey: 'APIFY_ACTOR_FASTSHOP', loja: 'Fast Shop' },
  { envKey: 'APIFY_ACTOR_ACER', loja: 'Acer' },
];

type ApifyItem = {
  title?: string;
  name?: string;
  url?: string;
  productUrl?: string;
  price?: number | string | null;
  currentPrice?: number | string | null;
  priceValue?: number | string | null;
  brand?: string;
  inStock?: boolean;
};

function termosBusca(): string[] {
  const out: string[] = [];
  for (const marca of MARCAS_COM_SERIE) {
    for (const t of TERMOS_POR_MARCA[marca]) {
      out.push(/^notebook\b/i.test(t) ? t : `notebook ${t}`);
    }
  }
  return [...new Set(out)].slice(0, 8);
}

function extrairPreco(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}

function mapearItem(item: ApifyItem, loja: string): Oferta | null {
  const titulo = String(item.title ?? item.name ?? '').replace(/\s+/g, ' ').trim();
  const url = String(item.url ?? item.productUrl ?? '').trim();
  if (!titulo || !url.startsWith('http')) return null;
  if (item.inStock === false) return null;

  const preco = extrairPreco(item.price ?? item.currentPrice ?? item.priceValue);
  if (!Number.isFinite(preco) || preco <= 0) return null;

  const oferta = toOferta({
    loja,
    titulo,
    precoAVista: preco,
    precoParcelado: preco,
    frete: 0,
    url,
    fonteId: 'apify',
  });

  return aceitarOferta(oferta) ? oferta : null;
}

async function rodarActor(
  token: string,
  actorId: string,
  loja: string,
  query: string
): Promise<Oferta[]> {
  try {
    // Inicia run síncrono (waitForFinish) — timeout alto
    const runUrl = `${APIFY_API}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`;
    const { data, status } = await http.post<ApifyItem[]>(
      runUrl,
      {
        query,
        search: query,
        keyword: query,
        maxItems: 20,
      },
      {
        params: { token },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 120000,
        validateStatus: (s) => s < 500,
      }
    );

    if (status === 401 || status === 403) {
      console.warn('[apify] token rejeitado — verifique APIFY_API_KEY');
      return [];
    }
    if (status >= 400) {
      console.warn(`[apify] HTTP ${status} actor=${actorId} q="${query}"`);
      return [];
    }

    const items = Array.isArray(data) ? data : [];
    const out: Oferta[] = [];
    for (const item of items) {
      const o = mapearItem(item, loja);
      if (o) out.push(o);
    }
    return out;
  } catch (err) {
    console.warn(`[apify] falha actor=${actorId}: ${detalheErro(err)}`);
    return [];
  }
}

export const apifyScraper: FonteScraper = {
  id: 'apify',
  async coletar(): Promise<Oferta[]> {
    const apiKey = process.env.APIFY_API_KEY?.trim();
    if (!apiKey) {
      console.log('[apify] APIFY_API_KEY ausente — pulando API');
      return [];
    }

    const actorsAtivos = ACTORS.map((a) => ({
      ...a,
      actorId: process.env[a.envKey]?.trim(),
    })).filter((a): a is ActorConfig & { actorId: string } => Boolean(a.actorId));

    if (actorsAtivos.length === 0) {
      console.log(
        '[apify] nenhum APIFY_ACTOR_* configurado — pulando (defina ex.: APIFY_ACTOR_KABUM)'
      );
      return [];
    }

    const todas: Oferta[] = [];
    const queries = termosBusca();
    for (const { actorId, loja, envKey } of actorsAtivos) {
      console.log(`[apify] rodando ${envKey}=${actorId} (${loja})`);
      for (const q of queries) {
        const lote = await rodarActor(apiKey, actorId, loja, q);
        todas.push(...lote);
      }
    }
    console.log(`[apify] ${todas.length} oferta(s) após filtro`);
    return todas;
  },
};
