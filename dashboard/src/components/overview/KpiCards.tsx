import { ArrowDownRight, ArrowUpRight, Layers3, Store } from 'lucide-react';
import type { ProdutoResumo } from '@/lib/api';
import { formatBRL, formatPct } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  produtos: ProdutoResumo[];
};

export function KpiCards({ produtos }: Props) {
  const totalSnapshots = produtos.reduce((acc, p) => acc + p.totalSnapshots, 0);
  const comPreco = produtos.filter((p) => p.menorPreco != null);
  const menorGeral = comPreco.reduce<ProdutoResumo | null>((best, p) => {
    if (!best || (p.menorPreco ?? Infinity) < (best.menorPreco ?? Infinity)) return p;
    return best;
  }, null);

  const melhorQueda = produtos.reduce<ProdutoResumo | null>((best, p) => {
    if (p.variacao7d == null) return best;
    if (!best || (p.variacao7d ?? 0) < (best.variacao7d ?? 0)) return p;
    return best;
  }, null);

  const items = [
    {
      title: 'Menor preço agora',
      value: formatBRL(menorGeral?.menorPreco),
      hint: menorGeral
        ? `${menorGeral.label} · ${menorGeral.lojaMenorPreco ?? '—'}`
        : 'Sem dados ainda',
      icon: Store,
    },
    {
      title: 'Produtos rastreados',
      value: String(produtos.length),
      hint: `${totalSnapshots} snapshots no histórico`,
      icon: Layers3,
    },
    {
      title: 'Variação 7 dias',
      value: formatPct(melhorQueda?.variacao7d),
      hint: melhorQueda?.label ?? 'Sem série suficiente',
      icon: (melhorQueda?.variacao7d ?? 0) <= 0 ? ArrowDownRight : ArrowUpRight,
      tone:
        melhorQueda?.variacao7d == null
          ? undefined
          : melhorQueda.variacao7d <= 0
            ? 'text-success'
            : 'text-destructive',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className={`mt-2 text-2xl tabular-price ${item.tone ?? ''}`}>
                {item.value}
              </CardTitle>
            </div>
            <span className="rounded-md bg-muted p-2 text-muted-foreground">
              <item.icon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
