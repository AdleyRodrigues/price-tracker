import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  daysAgoIso,
  fetchHistorico,
  type HistoricoResponse,
} from '@/lib/api';
import { formatBRL, formatDateShort } from '@/lib/format';
import type { ModuloDash } from '@/lib/modulo';

const ProductHistoryChart = lazy(() =>
  import('@/components/charts/ProductHistoryChart').then((m) => ({
    default: m.ProductHistoryChart,
  }))
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoChave: string;
  titulo: string;
  precoAtual: number | null;
  modulo?: ModuloDash;
  stroke?: string;
};

type Janela = 30 | 90;

export function ProductHistoryModal({
  open,
  onOpenChange,
  produtoChave,
  titulo,
  precoAtual,
  modulo = 'notebooks',
  stroke = '#0f6b4c',
}: Props) {
  const [janela, setJanela] = useState<Janela>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricoResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHistorico({
      modulo,
      produto: produtoChave,
      de: daysAgoIso(janela),
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, produtoChave, modulo, janela]);

  const serie = data?.serie ?? [];
  const minimoHistorico = useMemo(() => {
    if (!serie.length) return data?.insights?.min ?? null;
    return serie.reduce((min, p) => (p.preco < min ? p.preco : min), serie[0]!.preco);
  }, [serie, data?.insights?.min]);

  const dataMinimo = useMemo(() => {
    if (!serie.length || minimoHistorico == null) return null;
    const hit = serie.find((p) => p.preco === minimoHistorico);
    return hit?.coletadoEm ?? null;
  }, [serie, minimoHistorico]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!inset-x-4 !inset-y-auto !bottom-auto !left-1/2 !right-auto !top-[4vh] !max-h-[92vh] !w-[min(100%,48rem)] !max-w-3xl !-translate-x-1/2 overflow-y-auto rounded-xl border shadow-xl sm:!inset-x-auto">
        <SheetHeader>
          <SheetTitle className="pr-8 font-display text-lg leading-snug">
            Histórico de preço
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{titulo}</p>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {([30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setJanela(d)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${janela === d
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
            >
              {d} dias
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-sky-500/5 px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Preço atual
            </p>
            <p className="mt-0.5 font-display text-xl font-bold text-sky-900 dark:text-sky-200">
              {formatBRL(precoAtual)}
            </p>
          </div>
          <div className="rounded-lg border bg-emerald-500/5 px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Mínimo histórico
            </p>
            <p className="mt-0.5 font-display text-xl font-bold text-emerald-900 dark:text-emerald-200">
              {formatBRL(minimoHistorico)}
            </p>
            {dataMinimo ? (
              <p className="text-[0.7rem] text-muted-foreground">
                em {formatDateShort(dataMinimo)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card p-2 sm:p-3">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : error ? (
            <p className="flex h-64 items-center justify-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
              <ProductHistoryChart
                serie={serie}
                precoAtual={precoAtual}
                minimoHistorico={minimoHistorico}
                stroke={stroke}
              />
            </Suspense>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <LineChart className="h-3.5 w-3.5" aria-hidden />
          Gráfico carregado sob demanda · janela de {janela} dias
        </p>
      </SheetContent>
    </Sheet>
  );
}
