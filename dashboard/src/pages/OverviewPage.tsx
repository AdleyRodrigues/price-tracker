import { useEffect, useState } from 'react';
import { fetchProdutos, type ProdutoResumo } from '@/lib/api';
import { KpiCards } from '@/components/overview/KpiCards';
import { ProductList } from '@/components/overview/ProductList';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function OverviewPage() {
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProdutos('celular')
      .then((data) => {
        if (cancelled) return;
        setProdutos(data.produtos);
        setWarning(data.warning ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar produtos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Menor preço atual e tendência dos celulares monitorados.
        </p>
      </div>

      {warning ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm text-warning">{warning}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          <KpiCards produtos={produtos} />
          <section className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Produtos
            </h3>
            <ProductList produtos={produtos} />
          </section>
        </>
      )}
    </div>
  );
}
