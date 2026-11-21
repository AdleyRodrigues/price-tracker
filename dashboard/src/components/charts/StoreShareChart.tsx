import { formatBRL } from '@/lib/format';

type Props = {
  stores: Array<{
    loja: string;
    vezesMinimo: number;
    shareMinimos: number;
    menorPreco: number;
  }>;
};

export function StoreShareChart({ stores }: Props) {
  const top = stores.slice(0, 6);
  const max = Math.max(...top.map((s) => s.shareMinimos), 1);

  return (
    <section className="market-panel relative p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Lojas
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Quem mais vence o mínimo</h3>
      <p className="mt-1 text-sm text-muted-foreground">Share de mínimos no período da janela</p>

      {top.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Sem dados de loja no período.</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {top.map((s, i) => (
            <li key={s.loja}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {s.loja}
                </span>
                <span className="tabular-price text-xs text-muted-foreground">
                  {s.shareMinimos.toFixed(0)}% · {formatBRL(s.menorPreco)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${(s.shareMinimos / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
