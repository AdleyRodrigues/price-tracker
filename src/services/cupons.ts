/**
 * Cupons via CupomDescontos.com (API pública, sem chave).
 * Docs: https://cupomdescontos.com/api-docs
 */

import { http, detalheErro } from '../config/http';
import { calcularPrecoComCupom } from '../domain/filtros';
import type { Oferta } from '../types/oferta';

const API_BASE = 'https://cupomdescontos.com/api';
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 min
const MAX_PCT_NOTEBOOK = 25; // evita % absurdos de outras categorias

export type CupomAtivo = {
  code: string;
  title: string;
  discountPercent: number | null;
  discountFixed: number | null;
  storeSlug: string;
  storeName: string;
  expiresAt: string | null;
  expiresAtBrt: string | null;
  conditions: string | null;
  url: string;
};

type CacheEntry = { fetchedAt: number; cupons: CupomAtivo[] };

const cachePorSlug = new Map<string, CacheEntry>();

/** Nome da loja do scraper → slugs CupomDescontos (tentativa em ordem). */
export const LOJA_PARA_SLUGS: Record<string, string[]> = {
  kabum: ['kabum'],
  'kabum!': ['kabum'],
  'mercado livre': ['mercado-livre'],
  mercadolivre: ['mercado-livre'],
  amazon: ['amazon'],
  'magazine luiza': ['magazine-luiza', 'magalu'],
  magalu: ['magazine-luiza', 'magalu'],
  shopee: ['shopee'],
  asus: ['asus'],
  promobit: [],
  'qual notebook comprar': [],
};

type ApiCoupon = {
  code?: string;
  title?: string;
  discount_percent?: number | null;
  discount_fixed?: number | null;
  store_slug?: string;
  store_name?: string;
  expires_at?: string | null;
  expires_at_brt?: string | null;
  conditions?: string | null;
  url?: string;
};

function normalizarLoja(loja: string): string {
  return loja
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function slugsParaLoja(loja: string): string[] {
  const key = normalizarLoja(loja);
  if (LOJA_PARA_SLUGS[key]) return LOJA_PARA_SLUGS[key]!;
  // fallback: slugify simples
  const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? [slug] : [];
}

export function cupomAindaValido(cupom: CupomAtivo, agora = new Date()): boolean {
  if (!cupom.expiresAt) return true; // sem data = indeterminado (API já filtra vencidos)
  const exp = Date.parse(cupom.expiresAt);
  if (!Number.isFinite(exp)) return true;
  return exp > agora.getTime();
}

function mapearCupom(raw: ApiCoupon): CupomAtivo | null {
  const code = String(raw.code ?? '').trim();
  if (!code) return null;
  return {
    code: code.toUpperCase(),
    title: String(raw.title ?? ''),
    discountPercent:
      typeof raw.discount_percent === 'number' ? raw.discount_percent : null,
    discountFixed: typeof raw.discount_fixed === 'number' ? raw.discount_fixed : null,
    storeSlug: String(raw.store_slug ?? ''),
    storeName: String(raw.store_name ?? ''),
    expiresAt: raw.expires_at ?? null,
    expiresAtBrt: raw.expires_at_brt ?? null,
    conditions: raw.conditions ?? null,
    url: String(raw.url ?? ''),
  };
}

async function fetchCuponsSlug(slug: string): Promise<CupomAtivo[]> {
  const cached = cachePorSlug.get(slug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.cupons;
  }

  try {
    const { data, status } = await http.get<{ data?: ApiCoupon[]; message?: string }>(
      `${API_BASE}/coupons`,
      {
        params: { store: slug, limit: 40, sort: 'discount' },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'lg-price-tracker/1.0 (+cupomdescontos)',
        },
        timeout: 8000,
        validateStatus: (s) => s < 500,
      }
    );

    if (status === 429) {
      console.warn(`[cupons] rate limit CupomDescontos (store=${slug}) — usando cache vazio`);
      cachePorSlug.set(slug, { fetchedAt: Date.now(), cupons: cached?.cupons ?? [] });
      return cached?.cupons ?? [];
    }

    const lista = (data?.data ?? [])
      .map(mapearCupom)
      .filter((c): c is CupomAtivo => c != null)
      .filter((c) => cupomAindaValido(c));

    cachePorSlug.set(slug, { fetchedAt: Date.now(), cupons: lista });
    return lista;
  } catch (err) {
    console.warn(`[cupons] falha store=${slug}: ${detalheErro(err)}`);
    return cached?.cupons ?? [];
  }
}

/** Busca cupons ativos para uma loja (com cache 45 min). */
export async function buscarCuponsLoja(loja: string): Promise<CupomAtivo[]> {
  const slugs = slugsParaLoja(loja);
  if (slugs.length === 0) return [];

  const todos: CupomAtivo[] = [];
  const vistos = new Set<string>();
  for (const slug of slugs) {
    const lista = await fetchCuponsSlug(slug);
    for (const c of lista) {
      if (vistos.has(c.code)) continue;
      vistos.add(c.code);
      todos.push(c);
    }
  }
  return todos;
}

/** Economia estimada em BRL para um preço base. */
export function economiaEstimada(cupom: CupomAtivo, precoBase: number): number {
  if (!Number.isFinite(precoBase) || precoBase <= 0) return 0;
  if (cupom.discountFixed != null && cupom.discountFixed > 0) {
    return Math.min(cupom.discountFixed, precoBase);
  }
  if (cupom.discountPercent != null && cupom.discountPercent > 0) {
    const pct = Math.min(cupom.discountPercent, MAX_PCT_NOTEBOOK);
    return Math.round(precoBase * (pct / 100) * 100) / 100;
  }
  return 0;
}

/**
 * Evita aplicar cupom de outro produto/categoria (ex.: Fire TV em notebook).
 * Se o texto do cupom cita um produto específico incompatível, descarta.
 */
export function cupomCompativelComOferta(cupom: CupomAtivo, oferta: Oferta): boolean {
  const textoCupom = `${cupom.title} ${cupom.conditions ?? ''} ${cupom.code}`.toLowerCase();
  const titulo = (oferta.titulo ?? '').toLowerCase();

  const soOutroProduto =
    /fire\s*tv|firetv|echo\s*dot|echo\s*show|kindle|audible|ring\s*camera|eero\s*wifi/.test(
      textoCupom
    );
  const ehNotebookOuPc =
    /notebook|laptop|ultrabook|macbook|acer|asus|avell|lenovo|dell|nitro|tuf|rog|legion|loq|gamer/.test(
      titulo
    );

  if (soOutroProduto && ehNotebookOuPc) return false;
  if (soOutroProduto && !/fire\s*tv|echo|kindle|audible/.test(titulo)) return false;

  return true;
}

/** Escolhe o cupom com maior economia estimada. */
export function escolherMelhorCupom(
  cupons: CupomAtivo[],
  precoBase: number,
  oferta?: Oferta
): CupomAtivo | null {
  const validos = cupons.filter(
    (c) =>
      cupomAindaValido(c) &&
      economiaEstimada(c, precoBase) > 0 &&
      (!oferta || cupomCompativelComOferta(c, oferta))
  );
  if (validos.length === 0) return null;
  return validos.reduce((melhor, atual) =>
    economiaEstimada(atual, precoBase) > economiaEstimada(melhor, precoBase) ? atual : melhor
  );
}

function aplicarCupomNaOferta(oferta: Oferta, cupom: CupomAtivo): Oferta {
  const calc = calcularPrecoComCupom(oferta.precoAVista, {
    cupomTag: cupom.code,
    cupomDesconto: cupom.discountFixed ?? undefined,
    percentualDesconto:
      cupom.discountFixed == null ? Math.min(cupom.discountPercent ?? 0, MAX_PCT_NOTEBOOK) : undefined,
  });

  if (!calc.cupomDesconto || !calc.precoComCupom) return oferta;

  const frete = oferta.frete;
  const precoComCupomTotal = Math.round((calc.precoComCupom + frete) * 100) / 100;

  return {
    ...oferta,
    cupomTag: calc.cupomTag,
    cupomDesconto: calc.cupomDesconto,
    precoComCupom: precoComCupomTotal,
    // preço efetivo para ranking/histórico de decisão
    precoAVista: calc.precoComCupom,
    precoTotal: precoComCupomTotal,
  };
}

/**
 * Notebooks: NÃO muta preço. CupomDescontos misturava códigos de outras categorias
 * (ex.: Fire TV 25%) e a dash divergia da loja. Preço/cupom só vêm do scraper/PDP.
 *
 * Mantido no código para celular/experimentos futuros (`mutarPreco: true`).
 */
export async function enriquecerOfertasComCupons(
  ofertas: Oferta[],
  opts: { mutarPreco?: boolean } = {}
): Promise<Oferta[]> {
  if (ofertas.length === 0) return ofertas;

  const mutarPreco = opts.mutarPreco === true;
  if (!mutarPreco) {
    console.log(
      '[cupons] CupomDescontos em modo somente-leitura (não altera precoAVista) — preço = fonte da loja'
    );
    return ofertas;
  }

  const lojas = [...new Set(ofertas.map((o) => o.loja).filter(Boolean))];
  const cuponsPorLoja = new Map<string, CupomAtivo[]>();

  for (const loja of lojas) {
    const cupons = await buscarCuponsLoja(loja);
    cuponsPorLoja.set(loja, cupons);
    if (cupons.length > 0) {
      console.log(`[cupons] ${loja}: ${cupons.length} cupom(ns) ativo(s)`);
    }
  }

  let aplicadas = 0;
  const out = ofertas.map((o) => {
    if (o.cupomTag) return o;
    if (/amazon/i.test(o.loja)) return o;
    const cupons = cuponsPorLoja.get(o.loja) ?? [];
    const melhor = escolherMelhorCupom(cupons, o.precoAVista, o);
    if (!melhor) return o;
    aplicadas += 1;
    return aplicarCupomNaOferta(o, melhor);
  });

  if (aplicadas > 0) {
    console.log(`[cupons] ${aplicadas} oferta(s) enriquecida(s) com CupomDescontos`);
  }

  return out;
}

/** Limpa cache (testes). */
export function limparCacheCupons(): void {
  cachePorSlug.clear();
}
