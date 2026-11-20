import { ExternalLink } from 'lucide-react';
import type { SnapshotRow } from '@/lib/api';
import { isRealUrl } from '@/lib/api';
import { formatBRL, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
  snapshots: SnapshotRow[];
  minPreco?: number | null;
};

export function HistoryTable({ snapshots, minPreco }: Props) {
  return (
    <section className="market-panel overflow-hidden">
      <div className="border-b border-border/70 px-5 py-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ledger
        </p>
        <h3 className="font-display text-lg font-bold tracking-tight">
          Registros · {snapshots.length}
        </h3>
      </div>

      {snapshots.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Nenhum snapshot neste filtro.</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">À vista</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Total</TableHead>
                <TableHead className="hidden md:table-cell">Título</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s, i) => {
                const isMin = minPreco != null && s.precoAvista === minPreco;
                return (
                  <TableRow
                    key={s.id}
                    className={cn(
                      i % 2 === 1 && 'bg-muted/30',
                      isMin && 'bg-primary/8 hover:bg-primary/12'
                    )}
                  >
                    <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                      {formatDateTime(s.coletadoEm)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.loja}
                      {isMin ? (
                        <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">
                          MIN
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-price font-medium">
                      {formatBRL(s.precoAvista)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-price sm:table-cell">
                      {formatBRL(s.precoTotal)}
                    </TableCell>
                    <TableCell
                      className="hidden max-w-[16rem] truncate md:table-cell"
                      title={s.titulo}
                    >
                      {s.titulo}
                    </TableCell>
                    <TableCell className="text-right">
                      {isRealUrl(s.url) ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title={`Ver oferta no site da ${s.loja}`}
                          aria-label={`Abrir oferta no site da ${s.loja}`}
                        >
                          <span>Ver oferta</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground" title="Registro sem URL externa">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
