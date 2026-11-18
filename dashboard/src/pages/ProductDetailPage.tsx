import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  daysAgoIso,
  fetchHistorico,
  fetchLojas,
  type HistoricoResponse,
} from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { FiltersBar, type RangeKey } from '@/components/detail/FiltersBar';
import { HistoryTable } from '@/components/detail/HistoryTable';
import { PriceChart } from '@/components/detail/PriceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductDetailPage() {
  const { produtoChave = '' } = useParams();
  const [range, setRange] = useState<RangeKey>('30');
  const [loja, setLoja] = useState('todas');
  const [chartMode, setChartMode] = useState<'minimo' | 'por-loja'>('minimo');
  const [lojas, setLojas] = useState<string[]>([]);
  const [data, setData] = useState<HistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const de = useMemo(() => daysAgoIso(Number(range)), [range]);

  useEffect(() => {
    if (!produtoChave) return;
    let cancelled = false;
    fetchLojas('celular', produtoChave)
      .then((res) => {
        if (!cancelled) setLojas(res.lojas);
      })
      .catch(() => {
        if (!cancelled) setLojas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [produtoChave]);

  useEffect(() => {
    if (!produtoChave) return;
    let cancelled = false;
    setLoading(true);
    fetchHistorico({
      modulo: 'celular',
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
  }, [produtoChave, loja, de]);

  const menorNoPeriodo = useMemo(() => {
    if (!data?.serie.length) return null;
    return Math.min(...data.serie.map((p) => p.preco));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {data?.label ?? produtoChave}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Menor no período:{' '}
              <span className="tabular-price font-medium text-foreground">
                {formatBRL(menorNoPeriodo)}
              </span>
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

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <PriceChart
            serie={data.serie}
            seriePorLoja={data.seriePorLoja}
            modo={chartMode}
          />
          <HistoryTable snapshots={data.snapshots} />
        </>
      )}
    </div>
  );
}
