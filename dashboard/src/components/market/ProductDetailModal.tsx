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
  const [janela, setJanela] = useState<Janela>(90);
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
      <SheetContent className="!inset-auto !left-1/2 !top-1/2 !right-auto !bottom-auto !h-auto !max-h-[min(92vh,52rem)] !w-[calc(100%-1.5rem)] !max-w-3xl !-translate-x-1/2 !-translate-y-1/2 overflow-y-auto !rounded-2xl !border !border-border !border-l bg-card !p-5 shadow-2xl sm:!w-[calc(100%-2rem)] sm:!p-6">
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <p className="text-eyebrow">Linha do tempo · preço</p>
          <SheetTitle className="font-display text-xl leading-snug tracking-tight text-ink">
            {titulo}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
            {([30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setJanela(d)}
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors duration-150 ${janela === d
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {d} dias
              </button>
            ))}
          </div>
          {noMinimo ? (
            <span className="chip-good inline-flex items-center gap-1">
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
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-eyebrow">Preço atual</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-price text-primary">
              {formatBRL(precoAtual)}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              Menor à vista na última coleta
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-eyebrow">Mínimo histórico</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-price text-ink">
              {formatBRL(minimoHistorico)}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {dataMinimo
                ? `em ${formatDateShort(dataMinimo)} · janela ${janela}d`
                : `melhor preço nos últimos ${janela} dias`}
            </p>
          </div>
        </div>

        <div className="mt-4 min-w-0 overflow-hidden rounded-xl border bg-background/60 p-2 sm:p-4">
          {loading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : error ? (
            <p className="flex h-72 items-center justify-center px-4 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
              {/* key força o ResponsiveContainer a medir a largura já centralizada */}
              <ProductHistoryChart
                key={`${produtoChave}-${janela}-${serie.length}`}
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
