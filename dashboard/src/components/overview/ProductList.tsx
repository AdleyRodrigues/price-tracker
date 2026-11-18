import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import type { ProdutoResumo } from '@/lib/api';
import { formatBRL, formatDateTime, formatPct } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  produtos: ProdutoResumo[];
};

function VariacaoBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="secondary">sem série</Badge>;
  if (value <= 0) return <Badge variant="success">{formatPct(value)}</Badge>;
  return <Badge variant="warning">{formatPct(value)}</Badge>;
}

export function ProductList({ produtos }: Props) {
  if (produtos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-2 p-8">
          <p className="text-base font-medium">Nenhum histórico ainda</p>
          <p className="max-w-lg text-sm text-muted-foreground">
            Rode <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm track:celular</code>{' '}
            com as credenciais Turso configuradas. Os snapshots aparecem aqui automaticamente —
            o Discord continua igual.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {produtos.map((p) => (
        <Card key={p.produtoChave} className="transition-shadow hover:shadow-md">
          <CardContent className="p-0">
            <Link
              to={`/produto/${p.produtoChave}`}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">{p.label}</h2>
                  <VariacaoBadge value={p.variacao7d} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.lojaMenorPreco ?? '—'} · atualizado {formatDateTime(p.coletadoEm)}
                </p>
                <p className="text-xs text-muted-foreground">{p.totalSnapshots} registros</p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <p className="text-2xl font-semibold tabular-price text-primary">
                  {formatBRL(p.menorPreco)}
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  Ver histórico
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
            {p.urlMenorPreco ? (
              <div className="border-t border-border px-5 py-2.5">
                <a
                  href={p.urlMenorPreco}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Abrir oferta na loja
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
