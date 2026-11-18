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

export type HistoricoResponse = {
  produto: string;
  label: string;
  modulo: string;
  snapshots: SnapshotRow[];
  serie: Array<{ coletadoEm: string; preco: number; loja: string }>;
  seriePorLoja: Array<{ loja: string; pontos: Array<{ coletadoEm: string; preco: number }> }>;
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
