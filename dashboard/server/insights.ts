import { labelDescritivo, labelProduto } from './labels';

export type SeriePonto = { coletadoEm: string; preco: number; loja: string };

export type ProductInsightBlock = {
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
    urlMenorPreco?: string | null;
    maiorQueda7d: number | null;
    produtoMaiorQueda: string | null;
    urlMaiorQueda?: string | null;
    volatilidadeMedia: number | null;
    totalSnapshots: number;
    ultimaColeta: string | null;
  };
  insights: OverviewInsight[];
  /** Chaves usadas no gráfico comparativo (top SKUs por volume). */
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
    urlMenorPreco?: string | null;
    cupomTag?: string | null;
    coletadoEm: string | null;
    variacao7d: number | null;
    totalSnapshots: number;
    sparkline: Array<{ coletadoEm: string; preco: number }>;
    volatilidade: number | null;
  }>;
};

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function stddev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = mean(nums);
  if (m == null) return null;
  const v = nums.reduce((acc, n) => acc + (n - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function buildProductInsights(serie: SeriePonto[], snapshots: Array<{ loja: string; precoAvista: number; coletadoEm: string }>): ProductInsightBlock {
  const precos = serie.map((p) => p.preco);
  const min = precos.length ? Math.min(...precos) : null;
  const max = precos.length ? Math.max(...precos) : null;
  const media = mean(precos);
  const mediana = median(precos);
  const amplitude = min != null && max != null ? max - min : null;
  const economiaVsPico = min != null && max != null ? max - min : null;

  let diasDesdeMinimo: number | null = null;
  if (min != null && serie.length) {
    const pontoMin = [...serie].reverse().find((p) => p.preco === min) ?? serie.find((p) => p.preco === min);
    if (pontoMin) {
      const diff = Date.now() - new Date(pontoMin.coletadoEm).getTime();
      diasDesdeMinimo = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }
  }

  const variacaoPeriodo =
    serie.length >= 2 && serie[0]!.preco > 0
      ? ((serie[serie.length - 1]!.preco - serie[0]!.preco) / serie[0]!.preco) * 100
      : null;

  // candles por dia
  const byDay = new Map<string, { min: number; max: number }>();
  for (const p of serie) {
    const d = dayKey(p.coletadoEm);
    const cur = byDay.get(d);
    if (!cur) byDay.set(d, { min: p.preco, max: p.preco });
    else {
      cur.min = Math.min(cur.min, p.preco);
      cur.max = Math.max(cur.max, p.preco);
    }
  }
  const candles = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, min: v.min, max: v.max }));

  const dailyMins = candles.map((c) => c.min);
  const volatilidade = stddev(dailyMins);

  // store battle: por coleta, quem teve o mínimo
  const minPorColeta = new Map<string, { loja: string; preco: number }>();
  for (const s of snapshots) {
    const cur = minPorColeta.get(s.coletadoEm);
    if (!cur || s.precoAvista < cur.preco) {
      minPorColeta.set(s.coletadoEm, { loja: s.loja, preco: s.precoAvista });
    }
  }

  const lojaStats = new Map<
    string,
    { soma: number; n: number; menor: number; vezesMinimo: number }
  >();
  for (const s of snapshots) {
    const st = lojaStats.get(s.loja) ?? { soma: 0, n: 0, menor: Infinity, vezesMinimo: 0 };
    st.soma += s.precoAvista;
    st.n += 1;
    st.menor = Math.min(st.menor, s.precoAvista);
    lojaStats.set(s.loja, st);
  }
  for (const m of minPorColeta.values()) {
    const st = lojaStats.get(m.loja);
    if (st) st.vezesMinimo += 1;
  }
  const totalMins = minPorColeta.size || 1;
  const storeBattle = [...lojaStats.entries()]
    .map(([loja, st]) => ({
      loja,
      precoMedio: st.soma / st.n,
      menorPreco: st.menor === Infinity ? 0 : st.menor,
      vezesMinimo: st.vezesMinimo,
      shareMinimos: (st.vezesMinimo / totalMins) * 100,
    }))
    .sort((a, b) => b.vezesMinimo - a.vezesMinimo || a.menorPreco - b.menorPreco);

  const melhorLoja = storeBattle[0]?.loja ?? null;

  return {
    min,
    max,
    media,
    mediana,
    amplitude,
    economiaVsPico,
    diasDesdeMinimo,
    melhorLoja,
    volatilidade,
    variacaoPeriodo,
    candles,
    storeBattle,
  };
}

export function buildOverviewInsights(input: {
  produtos: Array<{
    produtoChave: string;
    tituloHint?: string;
    menorPreco: number | null;
    lojaMenorPreco: string | null;
    urlMenorPreco?: string | null;
    cupomTag?: string | null;
    coletadoEm: string | null;
    variacao7d: number | null;
    totalSnapshots: number;
    sparkline: Array<{ coletadoEm: string; preco: number }>;
  }>;
  totalSnapshots: number;
  ultimaColeta: string | null;
  snapshotsPeriodo?: Array<{ loja: string; produtoChave: string; precoAvista: number; coletadoEm: string }>;
}): OverviewInsightsResponse {
  const { produtos, totalSnapshots, ultimaColeta, snapshotsPeriodo = [] } = input;
  const hintByChave = new Map(produtos.map((p) => [p.produtoChave, p.tituloHint]));
  const lbl = (chave: string) => labelProduto(chave, hintByChave.get(chave));
  const lblDetalhado = (chave: string) => labelDescritivo(chave, hintByChave.get(chave));

  const comPreco = produtos.filter((p) => p.menorPreco != null);
  const menor = comPreco.reduce<(typeof produtos)[0] | null>((best, p) => {
    if (!best || (p.menorPreco ?? Infinity) < (best.menorPreco ?? Infinity)) return p;
    return best;
  }, null);

  const queda = produtos.reduce<(typeof produtos)[0] | null>((best, p) => {
    if (p.variacao7d == null) return best;
    if (!best || (p.variacao7d ?? 0) < (best.variacao7d ?? 0)) return p;
    return best;
  }, null);

  const vols = produtos
    .map((p) => {
      const mins = p.sparkline.map((s) => s.preco);
      return stddev(mins);
    })
    .filter((v): v is number => v != null);
  const volatilidadeMedia = mean(vols);

  const insights: OverviewInsight[] = [];

  if (queda?.variacao7d != null && queda.variacao7d < -0.5) {
    insights.push({
      id: 'queda',
      tone: 'positive',
      title: `${lbl(queda.produtoChave)} em queda`,
      detail: `Variação de ${queda.variacao7d.toFixed(1)}% nos últimos 7 dias frente ao baseline.`,
    });
  } else if (queda?.variacao7d != null && queda.variacao7d > 0.5) {
    insights.push({
      id: 'alta',
      tone: 'warning',
      title: `${lbl(queda.produtoChave)} subiu`,
      detail: `Alta de ${queda.variacao7d.toFixed(1)}% em 7 dias — talvez esperar.`,
    });
  }

  // loja dominante nos sparks (último ponto loja não temos) — usar loja do menor preço atual
  const lojaCounts = new Map<string, number>();
  for (const p of produtos) {
    if (!p.lojaMenorPreco) continue;
    lojaCounts.set(p.lojaMenorPreco, (lojaCounts.get(p.lojaMenorPreco) ?? 0) + 1);
  }
  const topLoja = [...lojaCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topLoja) {
    insights.push({
      id: 'loja',
      tone: 'accent',
      title: `${topLoja[0]} lidera mínimos`,
      detail: `Aparece como melhor loja atual em ${topLoja[1]} de ${produtos.length} produtos.`,
    });
  }

  const maisEstavel = produtos
    .map((p) => ({ p, v: stddev(p.sparkline.map((s) => s.preco)) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (a.v ?? Infinity) - (b.v ?? Infinity))[0];
  if (maisEstavel?.v != null) {
    insights.push({
      id: 'estavel',
      tone: 'neutral',
      title: `${lbl(maisEstavel.p.produtoChave)} mais estável`,
      detail: `Menor volatilidade dos mínimos recentes (σ ≈ R$ ${maisEstavel.v.toFixed(0)}).`,
    });
  }

  if (menor?.menorPreco != null) {
    insights.push({
      id: 'oportunidade',
      tone: 'positive',
      title: 'Melhor oportunidade agora',
      detail: `${lbl(menor.produtoChave)} a partir de R$ ${menor.menorPreco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${menor.lojaMenorPreco ?? '—'}).`,
    });
  }

  // Série comparativo: todos os produtos (UI de notebooks separa por GPU 5050/5060).
  const allTs = new Set<string>();
  for (const p of produtos) {
    for (const s of p.sparkline) allTs.add(s.coletadoEm);
  }
  const timestamps = [...allTs].sort();

  const paraGrafico = [...produtos].sort(
    (a, b) => b.totalSnapshots - a.totalSnapshots || a.produtoChave.localeCompare(b.produtoChave)
  );
  const seriesKeys = paraGrafico.map((p) => p.produtoChave);

  const seriesComparativo = timestamps.map((ts) => {
    const row: OverviewInsightsResponse['seriesComparativo'][number] = {
      coletadoEm: ts,
      label: new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    };
    for (const p of paraGrafico) {
      row[p.produtoChave] = p.sparkline.find((s) => s.coletadoEm === ts)?.preco ?? null;
    }
    return row;
  });

  const produtosEnriquecidos = produtos.map((p) => ({
    ...p,
    label: lbl(p.produtoChave),
    volatilidade: stddev(p.sparkline.map((s) => s.preco)),
  }));

  const movimento = produtosEnriquecidos.map((p) => ({
    produtoChave: p.produtoChave,
    label: p.label,
    variacao7d: p.variacao7d,
    volatilidade: p.volatilidade,
    totalSnapshots: p.totalSnapshots,
    menorPreco: p.menorPreco,
  }));

  // Ranking de lojas: quem mais "vence" o mínimo por (produto × coleta)
  const minPorChave = new Map<string, { loja: string; preco: number }>();
  for (const s of snapshotsPeriodo) {
    const key = `${s.produtoChave}|${s.coletadoEm}`;
    const cur = minPorChave.get(key);
    if (!cur || s.precoAvista < cur.preco) {
      minPorChave.set(key, { loja: s.loja, preco: s.precoAvista });
    }
  }
  const lojaAgg = new Map<string, { vezes: number; menor: number }>();
  for (const m of minPorChave.values()) {
    const st = lojaAgg.get(m.loja) ?? { vezes: 0, menor: Infinity };
    st.vezes += 1;
    st.menor = Math.min(st.menor, m.preco);
    lojaAgg.set(m.loja, st);
  }
  const totalMins = minPorChave.size || 1;
  const lojasRanking = [...lojaAgg.entries()]
    .map(([loja, st]) => ({
      loja,
      vezesMinimo: st.vezes,
      shareMinimos: (st.vezes / totalMins) * 100,
      menorPreco: st.menor === Infinity ? 0 : st.menor,
    }))
    .sort((a, b) => b.vezesMinimo - a.vezesMinimo)
    .slice(0, 8);

  return {
    kpis: {
      menorPrecoMercado: menor?.menorPreco ?? null,
      produtoMenorPreco: menor ? lblDetalhado(menor.produtoChave) : null,
      lojaMenorPreco: menor?.lojaMenorPreco ?? null,
      urlMenorPreco: menor?.urlMenorPreco ?? null,
      maiorQueda7d: queda?.variacao7d ?? null,
      produtoMaiorQueda: queda ? lblDetalhado(queda.produtoChave) : null,
      urlMaiorQueda: queda?.urlMenorPreco ?? null,
      volatilidadeMedia,
      totalSnapshots,
      ultimaColeta,
    },
    insights: insights.slice(0, 5),
    seriesKeys,
    seriesComparativo,
    movimento,
    lojasRanking,
    produtos: produtosEnriquecidos,
  };
}
