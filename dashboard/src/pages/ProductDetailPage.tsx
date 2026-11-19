import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import {
  daysAgoIso,
  fetchHistorico,
  fetchLojas,
  type HistoricoResponse,
} from '@/lib/api';
import { formatPct } from '@/lib/format';
import { FiltersBar, type ChartMode, type RangeKey } from '@/components/detail/FiltersBar';
import { HistoryTable } from '@/components/detail/HistoryTable';
import { PriceTheaterChart } from '@/components/charts/PriceTheaterChart';
import { StoreBattleChart } from '@/components/charts/StoreBattleChart';
import { InsightStat, formatInsightValue } from '@/components/insights/InsightStat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/market/AnimatedNumber';
import { parseModulo } from '@/lib/modulo';

export function ProductDetailPage() {
  const { produtoChave = '' } = useParams();
  const [params] = useSearchParams();
  const modulo = parseModulo(params.get('modulo'));
  const backTo = modulo === 'notebooks' ? '/?modulo=notebooks' : '/';
  const [range, setRange] = useState<RangeKey>('90');
  const [loja, setLoja] = useState('todas');
  const [chartMode, setChartMode] = useState<ChartMode>('minimo');
  const [lojas, setLojas] = useState<string[]>([]);
  const [data, setData] = useState<HistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const de = useMemo(() => daysAgoIso(Number(range)), [range]);

  useEffect(() => {
    if (!produtoChave) return;
    let cancelled = false;
    fetchLojas(modulo, produtoChave)
      .then((res) => {
        if (!cancelled) setLojas(res.lojas);
      })
      .catch(() => {
        if (!cancelled) setLojas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [produtoChave, modulo]);

  useEffect(() => {
    if (!produtoChave) return;
    let cancelled = false;
    setLoading(true);
    fetchHistorico({
      modulo,
      produto: produtoChave,
      loja: loja === 'todas' ? undefined : loja,
      de,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [produtoChave, loja, de, modulo]);

  const insights = data?.insights;
  const heroPrice = insights?.min ?? null;
  const delta = insights?.variacaoPeriodo ?? null;

  return (
    <div className="space-y-6">
      <motion.div
        className="market-panel sticky top-3 z-20 space-y-4 p-4 backdrop-blur-md sm:p-5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
              <Link to={backTo}>
                <ArrowLeft className="h-4 w-4" />
                Market Pulse
              </Link>
            </Button>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Price theater
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {data?.label ?? produtoChave}
              </h2>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <p className="font-display text-3xl font-bold text-primary sm:text-4xl">
                  <AnimatedNumber value={heroPrice} kind="brl" />
                </p>
                {delta != null ? (
                  <span
                    className={`rounded-md px-2 py-1 text-sm font-semibold ${delta <= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}
                  >
                    {formatPct(delta)} no período
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Melhor loja · {insights?.melhorLoja ?? '—'} · mínimo no intervalo selecionado
              </p>
            </div>
          </div>
          <FiltersBar
            lojas={lojas}
            loja={loja}
            onLojaChange={setLoja}
            range={range}
            onRangeChange={setRange}
            chartMode={chartMode}
            onChartModeChange={setChartMode}
          />
        </div>
      </motion.div>

      {error ? (
        <div className="market-panel border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          <PriceTheaterChart
            modo={chartMode}
            serie={data.serie}
            seriePorLoja={data.seriePorLoja}
            candles={insights?.candles ?? []}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <InsightStat label="Mínimo (ATL)" value={formatInsightValue(insights?.min)} />
            <InsightStat label="Máximo (ATH)" value={formatInsightValue(insights?.max)} />
            <InsightStat
              label="Economia vs pico"
              value={formatInsightValue(insights?.economiaVsPico)}
              hint="Diferença ATH − ATL"
            />
            <InsightStat
              label="Volatilidade"
              value={formatInsightValue(insights?.volatilidade)}
              hint="σ dos mínimos diários"
            />
            <InsightStat
              label="Desde o mínimo"
              value={formatInsightValue(insights?.diasDesdeMinimo, 'days')}
              hint={insights?.melhorLoja ? `Líder: ${insights.melhorLoja}` : undefined}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
            <StoreBattleChart stores={insights?.storeBattle ?? []} />
            <HistoryTable snapshots={data.snapshots} minPreco={insights?.min} />
          </div>
        </>
      )}
    </div>
  );
}
