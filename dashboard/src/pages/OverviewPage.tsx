import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { fetchInsights, type OverviewInsightsResponse } from '@/lib/api';
import { MarketPulseChart } from '@/components/charts/MarketPulseChart';
import { MovementChart } from '@/components/charts/MovementChart';
import { SnapshotsVolumeChart } from '@/components/charts/SnapshotsVolumeChart';
import { StoreShareChart } from '@/components/charts/StoreShareChart';
import { InsightRail } from '@/components/insights/InsightRail';
import { KpiTheater } from '@/components/market/KpiTheater';
import { ProductMarketCard } from '@/components/market/ProductMarketCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import { gpuFamiliaNotebook } from '@/lib/gpu';
import { labelModulo, parseModulo, trackHint } from '@/lib/modulo';

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

  const labelsByChave = Object.fromEntries(
    (data?.produtos ?? []).map((p) => [p.produtoChave, p.label])
  );

  const seriesKeys = data?.seriesKeys?.length
    ? data.seriesKeys
    : (data?.produtos.map((p) => p.produtoChave) ?? []);

  const keys5050 =
    modulo === 'notebooks'
      ? seriesKeys.filter((k) => gpuFamiliaNotebook(k, labelsByChave[k]) === '5050')
      : [];
  const keys5060 =
    modulo === 'notebooks'
      ? seriesKeys.filter((k) => gpuFamiliaNotebook(k, labelsByChave[k]) === '5060')
      : [];

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
            Gráficos, tendências e insights de {labelModulo(modulo).toLowerCase()} monitorados —
            preço, loja e momento.
          </p>
          {data?.kpis.ultimaColeta ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Última coleta · {formatDateTime(data.kpis.ultimaColeta)}
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
          <KpiTheater kpis={data.kpis} />
          {modulo === 'notebooks' ? (
            <div className="space-y-4">
              {keys5050.length > 0 ? (
                <MarketPulseChart
                  data={data.seriesComparativo}
                  produtos={keys5050}
                  labels={labelsByChave}
                  eyebrow="Market pulse · RTX 5050"
                  titulo="Menor preço — RTX 5050"
                  subtitulo={`${keys5050.length} modelo${keys5050.length === 1 ? '' : 's'} · uma linha por SKU`}
                />
              ) : null}
              {keys5060.length > 0 ? (
                <MarketPulseChart
                  data={data.seriesComparativo}
                  produtos={keys5060}
                  labels={labelsByChave}
                  eyebrow="Market pulse · RTX 5060"
                  titulo="Menor preço — RTX 5060"
                  subtitulo={`${keys5060.length} modelo${keys5060.length === 1 ? '' : 's'} · uma linha por SKU`}
                />
              ) : null}
              {keys5050.length === 0 && keys5060.length === 0 ? (
                <div className="market-panel p-8 text-sm text-muted-foreground">
                  Nenhum SKU com RTX 5050/5060 na janela selecionada.
                </div>
              ) : null}
            </div>
          ) : (
            <MarketPulseChart
              data={data.seriesComparativo}
              produtos={seriesKeys}
              labels={labelsByChave}
              subtitulo={`${seriesKeys.length} celulares · uma linha por modelo`}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <MovementChart data={data.movimento ?? data.produtos} />
            <SnapshotsVolumeChart data={data.movimento ?? data.produtos} />
            <StoreShareChart stores={data.lojasRanking ?? []} />
          </div>

          <InsightRail insights={data.insights} />

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {modulo === 'notebooks' ? 'Modelos (SKU)' : 'Produtos'}
            </h3>
            {data.produtos.length === 0 ? (
              <div className="market-panel p-8 text-sm text-muted-foreground">
                Nenhum histórico ainda. Rode{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{trackHint(modulo)}</code> com
                o banco configurado.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {data.produtos.map((p, i) => (
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
