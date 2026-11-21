import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LineChart, Sparkles } from 'lucide-react';
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

/** Recharts só entra no bundle quando o modal abre. */
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

/**
 * Modal de detalhe do produto: histórico de preço (30/90 dias) com
 * destaque para Preço Atual e Mínimo Histórico. Lazy-load do gráfico.
 */
export function ProductDetailModal({
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
    return serie.find((p) => p.preco === minimoHistorico)?.coletadoEm ?? null;
  }, [serie, minimoHistorico]);

  const deltaVsMin =
    precoAtual != null && minimoHistorico != null
      ? precoAtual - minimoHistorico
      : null;
  const noMinimo =
    deltaVsMin != null && Math.abs(deltaVsMin) < 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!inset-x-4 !inset-y-auto !bottom-auto !left-1/2 !right-auto !top-[3vh] !max-h-[94vh] !w-[min(100%,52rem)] !max-w-3xl !-translate-x-1/2 overflow-y-auto rounded-2xl border bg-card shadow-2xl sm:!inset-x-auto">
        <SheetHeader className="space-y-1.5 pr-8">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Linha do tempo · preço
          </p>
          <SheetTitle className="font-display text-xl leading-snug tracking-tight">
            {titulo}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border bg-muted/25 p-0.5 text-xs">
            {([30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setJanela(d)}
                className={`rounded-md px-3 py-1.5 font-semibold transition ${janela === d
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {d} dias
              </button>
            ))}
          </div>
          {noMinimo ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[0.7rem] font-bold text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" aria-hidden />
              No mínimo histórico
            </span>
          ) : deltaVsMin != null && deltaVsMin > 0 ? (
            <span className="text-[0.7rem] text-muted-foreground">
              +{formatBRL(deltaVsMin)} vs mínimo da janela
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-300">
              Preço atual
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-sky-950 dark:text-sky-100">
              {formatBRL(precoAtual)}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              Menor à vista na última coleta
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">
              Mínimo histórico
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-950 dark:text-emerald-100">
              {formatBRL(minimoHistorico)}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {dataMinimo
                ? `em ${formatDateShort(dataMinimo)} · janela ${janela}d`
                : `melhor preço nos últimos ${janela} dias`}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border bg-background/60 p-2 sm:p-4">
          {loading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : error ? (
            <p className="flex h-72 items-center justify-center px-4 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
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
          <LineChart className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Gráfico sob demanda (lazy) · linhas tracejadas = atual e mínimo
        </p>
      </SheetContent>
    </Sheet>
  );
}

/** Alias legado — mesmo modal. */
export { ProductDetailModal as ProductHistoryModal };
