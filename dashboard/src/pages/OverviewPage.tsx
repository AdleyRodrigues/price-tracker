import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { fetchInsights, type OverviewInsightsResponse } from '@/lib/api';
import { MarketPulseChart } from '@/components/charts/MarketPulseChart';
import { MovementChart } from '@/components/charts/MovementChart';
import { SnapshotsVolumeChart } from '@/components/charts/SnapshotsVolumeChart';
import { StoreShareChart } from '@/components/charts/StoreShareChart';
import { InsightRail } from '@/components/insights/InsightRail';
import { CostBenefitRanking } from '@/components/market/CostBenefitRanking';
import { DataFreshnessBanner } from '@/components/market/DataFreshnessBanner';
import { KpiTheater } from '@/components/market/KpiTheater';
import { ProductMarketCard } from '@/components/market/ProductMarketCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { classificarNotebook, ehNotebookPermitido } from '@/lib/serie-notebook';
import { labelModulo, parseModulo, trackHint } from '@/lib/modulo';
import { calcularDestaques4k } from '@/lib/custo-beneficio';

type ChartBucket = {
  id: string;
  eyebrow: string;
  titulo: string;
  keys: string[];
};

export function OverviewPage() {
  const [params] = useSearchParams();
  const modulo = parseModulo(params.get('modulo'));
  const [dias, setDias] = useState('90');
  const [data, setData] = useState<OverviewInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInsights(modulo, Number(dias))
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar market pulse');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dias, modulo]);

  const labelsByChave = useMemo(
    () => Object.fromEntries((data?.produtos ?? []).map((p) => [p.produtoChave, p.label])),
    [data]
  );

  const produtosFiltrados = useMemo(() => {
    if (!data) return [];
    if (modulo !== 'notebooks') return data.produtos;
    return data.produtos.filter((p) => ehNotebookPermitido(p.produtoChave, p.label));
  }, [data, modulo]);

  const destaques4k = useMemo(() => {
    if (modulo !== 'notebooks') return null;
    return calcularDestaques4k(produtosFiltrados);
  }, [modulo, produtosFiltrados]);

  const seriesKeys = useMemo(() => {
    if (!data) return [];
    const raw = data.seriesKeys?.length
      ? data.seriesKeys
      : data.produtos.map((p) => p.produtoChave);
    if (modulo !== 'notebooks') return raw;
    return raw.filter((k) => ehNotebookPermitido(k, labelsByChave[k]));
  }, [data, modulo, labelsByChave]);

  const notebookCharts: ChartBucket[] = useMemo(() => {
    if (modulo !== 'notebooks') return [];
    const buckets: ChartBucket[] = [
      { id: 'f16-5050', eyebrow: 'Market pulse · F16 · RTX 5050', titulo: 'Menor preço — F16 RTX 5050', keys: [] },
      { id: 'f16-5060', eyebrow: 'Market pulse · F16 · RTX 5060', titulo: 'Menor preço — F16 RTX 5060', keys: [] },
      { id: 'a16-5050', eyebrow: 'Market pulse · A16 · RTX 5050', titulo: 'Menor preço — A16 RTX 5050', keys: [] },
      { id: 'a16-5060', eyebrow: 'Market pulse · A16 · RTX 5060', titulo: 'Menor preço — A16 RTX 5060', keys: [] },
    ];

    for (const k of seriesKeys) {
      const { serie, gpu } = classificarNotebook(k, labelsByChave[k]);
      if (!serie || (gpu !== '5050' && gpu !== '5060')) continue;
      const id = `${serie}-${gpu}`;
      const bucket = buckets.find((b) => b.id === id);
      if (bucket) bucket.keys.push(k);
    }

    return buckets.filter((b) => b.keys.length > 0);
  }, [modulo, seriesKeys, labelsByChave]);

  const movimentoFiltrado =
    modulo === 'notebooks'
      ? (data?.movimento ?? produtosFiltrados).filter((p) =>
        ehNotebookPermitido(p.produtoChave, 'label' in p ? p.label : labelsByChave[p.produtoChave])
      )
      : (data?.movimento ?? data?.produtos ?? []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <motion.div
          key={modulo}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overview
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Market Pulse
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {modulo === 'notebooks'
              ? 'Só TUF F16 e A16 — gráficos por série/GPU e ranking de custo-benefício.'
              : `Gráficos, tendências e insights de ${labelModulo(modulo).toLowerCase()} monitorados — preço, loja e momento.`}
          </p>
          {data?.kpis.ultimaColeta ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Gráfico com dados reais até{' '}
              <span className="font-medium text-foreground">
                {formatDateTime(data.kpis.ultimaColeta)}
              </span>
              <span className="text-muted-foreground">
                {' '}
                · {formatRelativeTime(data.kpis.ultimaColeta)}
              </span>
            </p>
          ) : null}
        </motion.div>

        <label className="grid w-full gap-1.5 text-sm sm:w-40">
          <span className="text-muted-foreground">Janela</span>
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      {error ? (
        <div className="market-panel border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {data?.warning ? (
        <div className="market-panel border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          {data.warning}
        </div>
      ) : null}

      {loading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="h-80 rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          <DataFreshnessBanner atualizadoEm={data.kpis.ultimaColeta} />
          <KpiTheater kpis={data.kpis} modulo={modulo} destaques4k={destaques4k} />
          {modulo === 'notebooks' ? (
            <div className="space-y-4">
              {notebookCharts.map((chart) => (
                <MarketPulseChart
                  key={chart.id}
                  data={data.seriesComparativo}
                  produtos={chart.keys}
                  labels={labelsByChave}
                  eyebrow={chart.eyebrow}
                  titulo={chart.titulo}
                  subtitulo={`${chart.keys.length} modelo${chart.keys.length === 1 ? '' : 's'} · uma linha por SKU`}
                  ocultarGpu={true}
                  atualizadoEm={data.kpis.ultimaColeta}
                />
              ))}
              {notebookCharts.length === 0 ? (
                <div className="market-panel p-8 text-sm text-muted-foreground">
                  Nenhum SKU F16/A16 com RTX 5050/5060 na janela selecionada.
                </div>
              ) : null}
              <CostBenefitRanking produtos={produtosFiltrados} />
            </div>
          ) : (
            <MarketPulseChart
              data={data.seriesComparativo}
              produtos={seriesKeys}
              labels={labelsByChave}
              subtitulo={`${seriesKeys.length} celulares · uma linha por modelo`}
              atualizadoEm={data.kpis.ultimaColeta}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <MovementChart data={movimentoFiltrado} />
            <SnapshotsVolumeChart data={movimentoFiltrado} />
            <StoreShareChart stores={data.lojasRanking ?? []} />
          </div>

          <InsightRail insights={data.insights} />

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {modulo === 'notebooks' ? 'Modelos F16 / A16' : 'Produtos'}
            </h3>
            {produtosFiltrados.length === 0 ? (
              <div className="market-panel p-8 text-sm text-muted-foreground">
                Nenhum histórico ainda. Rode{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{trackHint(modulo)}</code> com
                o banco configurado.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {produtosFiltrados.map((p, i) => (
                  <ProductMarketCard key={p.produtoChave} {...p} index={i} modulo={modulo} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
