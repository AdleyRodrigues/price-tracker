export type ProdutoResumo = {
  produtoChave: string;
  label: string;
  modulo: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  urlMenorPreco: string | null;
  coletadoEm: string | null;
  variacao24h: number | null;
  variacao7d: number | null;
  totalSnapshots: number;
};

export type SnapshotRow = {
  id: number;
  modulo: string;
  produtoChave: string;
  loja: string;
  titulo: string;
  precoAvista: number;
  precoTotal: number;
  frete: number;
  url: string;
  fonteId: string | null;
  coletadoEm: string;
};

export type ProductInsights = {
  min: number | null;
  max: number | null;
  media: number | null;
  mediana: number | null;
  amplitude: number | null;
  economiaVsPico: number | null;
  diasDesdeMinimo: number | null;
  melhorLoja: string | null;
  volatilidade: number | null;
  variacaoPeriodo: number | null;
  candles: Array<{ dia: string; min: number; max: number }>;
  storeBattle: Array<{
    loja: string;
    precoMedio: number;
    menorPreco: number;
    vezesMinimo: number;
    shareMinimos: number;
  }>;
};

export type HistoricoResponse = {
  produto: string;
  label: string;
  modulo: string;
  snapshots: SnapshotRow[];
  serie: Array<{ coletadoEm: string; preco: number; loja: string }>;
  seriePorLoja: Array<{ loja: string; pontos: Array<{ coletadoEm: string; preco: number }> }>;
  insights?: ProductInsights;
  warning?: string;
};

export type OverviewInsight = {
  id: string;
  tone: 'positive' | 'warning' | 'neutral' | 'accent';
  title: string;
  detail: string;
};

export type OverviewInsightsResponse = {
  kpis: {
    menorPrecoMercado: number | null;
    produtoMenorPreco: string | null;
    lojaMenorPreco: string | null;
    maiorQueda7d: number | null;
    produtoMaiorQueda: string | null;
    volatilidadeMedia: number | null;
    totalSnapshots: number;
    ultimaColeta: string | null;
  };
  insights: OverviewInsight[];
  seriesKeys: string[];
  seriesComparativo: Array<{
    coletadoEm: string;
    label: string;
    [produtoChave: string]: string | number | null;
  }>;
  movimento: Array<{
    produtoChave: string;
    label: string;
    variacao7d: number | null;
    volatilidade: number | null;
    totalSnapshots: number;
    menorPreco: number | null;
  }>;
  lojasRanking: Array<{
    loja: string;
    vezesMinimo: number;
    shareMinimos: number;
    menorPreco: number;
  }>;
  produtos: Array<{
    produtoChave: string;
    label: string;
    menorPreco: number | null;
    lojaMenorPreco: string | null;
    coletadoEm: string | null;
    variacao7d: number | null;
    totalSnapshots: number;
    sparkline: Array<{ coletadoEm: string; preco: number }>;
    volatilidade: number | null;
  }>;
  warning?: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchProdutos(modulo = 'celular') {
  return getJson<{ produtos: ProdutoResumo[]; warning?: string }>(
    `/api/produtos?modulo=${encodeURIComponent(modulo)}`
  );
}

export function fetchInsights(modulo = 'celular', dias = 90) {
  return getJson<OverviewInsightsResponse>(
    `/api/insights?modulo=${encodeURIComponent(modulo)}&dias=${dias}`
  );
}

export function fetchLojas(modulo = 'celular', produto?: string) {
  const qs = new URLSearchParams({ modulo });
  if (produto) qs.set('produto', produto);
  return getJson<{ lojas: string[]; warning?: string }>(`/api/lojas?${qs}`);
}

export function fetchHistorico(opts: {
  modulo?: string;
  produto: string;
  loja?: string;
  de?: string;
  ate?: string;
}) {
  const qs = new URLSearchParams({
    modulo: opts.modulo ?? 'celular',
    produto: opts.produto,
  });
  if (opts.loja) qs.set('loja', opts.loja);
  if (opts.de) qs.set('de', opts.de);
  if (opts.ate) qs.set('ate', opts.ate);
  return getJson<HistoricoResponse>(`/api/historico?${qs}`);
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function isRealUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
